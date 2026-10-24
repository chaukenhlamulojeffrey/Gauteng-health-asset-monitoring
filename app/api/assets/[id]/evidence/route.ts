import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import {
  canAccessDistrict,
  hasDistrictAssignment,
  requireUser,
} from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

type AssetDistrictRow = { district: string } & RowDataPacket;
type EvidenceRow = {
  file_name: string;
  file_content: Buffer;
} & RowDataPacket;
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  if (!hasDistrictAssignment(auth.user)) {
    return NextResponse.json(
      { error: 'Your account needs a district assignment before accessing asset evidence.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  try {
    const [assets] = await getDbPool().execute<AssetDistrictRow[]>(
      'SELECT district FROM health_assets WHERE id = ?',
      [id]
    );
    const asset = assets[0];
    if (!asset || !canAccessDistrict(auth.user, asset.district)) {
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }
    const [evidenceRows] = await getDbPool().execute<EvidenceRow[]>(
      `SELECT file_name, file_content FROM health_asset_evidence
      WHERE asset_id = ?`,
      [id]
    );
    const evidence = evidenceRows[0];
    if (!evidence) {
      return NextResponse.json(
        { error: 'No registration evidence is attached to this asset.' },
        { status: 404 }
      );
    }
    return new NextResponse(evidence.file_content, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="asset-evidence.pdf"; filename*=UTF-8''${encodeURIComponent(evidence.file_name)}`,
        'Content-Length': String(evidence.file_content.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Failed to download asset evidence:', error);
    return NextResponse.json(
      { error: 'Unable to download asset evidence.' },
      { status: 500 }
    );
  }
}
