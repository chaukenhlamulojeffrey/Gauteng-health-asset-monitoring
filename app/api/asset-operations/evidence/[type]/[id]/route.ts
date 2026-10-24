import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { canAccessDistrict, hasDistrictAssignment, requireUser } from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import type { AssetOperationType } from '@/lib/types';

export const dynamic = 'force-dynamic';

type EvidenceRow = {
  evidence_file_name: string;
  evidence_file_content: Buffer;
  district_snapshot: string;
} & RowDataPacket;
type RouteContext = { params: Promise<{ type: string; id: string }> };

const tableByType: Record<AssetOperationType, string> = {
  transfer: 'health_asset_transfers',
  verification: 'health_asset_verifications',
  lifespan_extension: 'health_asset_lifespan_extensions',
};

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  if (!hasDistrictAssignment(auth.user)) {
    return NextResponse.json(
      { error: 'Your account needs a district assignment before accessing evidence.' },
      { status: 403 }
    );
  }
  const { type, id } = await params;
  if (
    !Object.hasOwn(tableByType, type) ||
    !/^[0-9a-f-]{36}$/i.test(id)
  ) {
    return NextResponse.json({ error: 'Evidence document not found.' }, { status: 404 });
  }
  const table = tableByType[type as AssetOperationType];
  try {
    const [rows] = await getDbPool().execute<EvidenceRow[]>(
      `SELECT evidence_file_name, evidence_file_content, district_snapshot
      FROM ${table} WHERE id = ?`,
      [id]
    );
    const document = rows[0];
    if (!document || !canAccessDistrict(auth.user, document.district_snapshot)) {
      return NextResponse.json({ error: 'Evidence document not found.' }, { status: 404 });
    }
    return new Response(document.evidence_file_content, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(document.evidence_file_name)}`,
        'Content-Length': String(document.evidence_file_content.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Failed to load asset operation evidence:', error);
    return NextResponse.json(
      { error: 'Unable to load the evidence document.' },
      { status: 500 }
    );
  }
}
