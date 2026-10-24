import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { requireUser } from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import type { AppRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

type AssetAuditRow = {
  id: number;
  asset_id: string;
  asset_tag: string;
  action: 'created' | 'updated' | 'deleted';
  actor_name: string;
  actor_persal_number: string;
  actor_role: AppRole;
  before_snapshot: unknown;
  after_snapshot: unknown;
  created_at: string;
} & RowDataPacket;

export async function GET(request: Request) {
  const auth = await requireUser(request, 'super_administrator');
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get('limit') ?? 100);
  const rawOffset = Number(url.searchParams.get('offset') ?? 0);
  if (
    !Number.isInteger(rawLimit) ||
    rawLimit < 1 ||
    rawLimit > 200 ||
    !Number.isInteger(rawOffset) ||
    rawOffset < 0
  ) {
    return NextResponse.json({ error: 'Invalid audit page.' }, { status: 400 });
  }

  try {
    const [rows] = await getDbPool().execute<AssetAuditRow[]>(
      `SELECT a.id, a.asset_id, a.asset_tag, a.action, a.before_snapshot,
        a.after_snapshot, a.created_at, u.display_name AS actor_name,
        u.persal_number AS actor_persal_number, u.role AS actor_role
      FROM health_asset_audit a
      JOIN app_users u ON u.id = a.actor_id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ? OFFSET ?`,
      [rawLimit, rawOffset]
    );
    const [counts] = await getDbPool().query<
      (RowDataPacket & { total: number })[]
    >('SELECT COUNT(*) AS total FROM health_asset_audit');
    return NextResponse.json({
      entries: rows,
      total: Number(counts[0].total),
      limit: rawLimit,
      offset: rawOffset,
    });
  } catch (error) {
    console.error('Failed to load asset audit history:', error);
    return NextResponse.json(
      { error: 'Unable to load asset audit history.' },
      { status: 500 }
    );
  }
}
