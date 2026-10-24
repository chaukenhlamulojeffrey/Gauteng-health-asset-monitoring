import { NextResponse } from 'next/server';
import {
  expiredSessionCookie,
  isSameOriginRequest,
  revokeSession,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  try {
    await revokeSession(request);
    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', expiredSessionCookie());
    return response;
  } catch (error) {
    console.error('Failed to sign out:', error);
    return NextResponse.json({ error: 'Sign-out failed.' }, { status: 500 });
  }
}
