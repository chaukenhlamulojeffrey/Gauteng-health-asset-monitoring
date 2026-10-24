import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import {
  authenticateRequest,
  expiredSessionCookie,
  isSameOriginRequest,
  requireUser,
  verifyPassword,
} from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import { parseUserProfile } from '@/lib/user-validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      const response = NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
      response.headers.set('Set-Cookie', expiredSessionCookie());
      return response;
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Failed to read current user:', error);
    return NextResponse.json({ error: 'Unable to verify your session.' }, { status: 500 });
  }
}

type PasswordHashRow = { password_hash: string } & RowDataPacket;

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('current_password' in body) ||
    typeof body.current_password !== 'string' ||
    !body.current_password
  ) {
    return NextResponse.json(
      { error: 'Enter your current password to update profile details.' },
      { status: 400 }
    );
  }
  const profile = parseUserProfile(body);
  if (!profile) {
    return NextResponse.json(
      { error: 'Enter a valid first name, surname, work email address, and contact number.' },
      { status: 400 }
    );
  }

  const connection = await getDbPool().getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.execute<PasswordHashRow[]>(
      'SELECT password_hash FROM app_users WHERE id = ? AND is_active = TRUE FOR UPDATE',
      [auth.user.id]
    );
    if (
      users.length === 0 ||
      !(await verifyPassword(body.current_password, users[0].password_hash))
    ) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 400 }
      );
    }
    await connection.execute(
      `UPDATE app_users SET display_name = ?, surname = ?, email = ?,
        contact_number = ? WHERE id = ?`,
      [
        profile.display_name,
        profile.surname,
        profile.email,
        profile.contact_number,
        auth.user.id,
      ]
    );
    await connection.commit();
    return NextResponse.json({
      user: {
        ...auth.user,
        ...profile,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to update user profile:', error);
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'That work email address is already assigned to another account.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Unable to update your profile.' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
