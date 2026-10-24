import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import {
  canAccessDistrict,
  hasDistrictAssignment,
  isSameOriginRequest,
  requireUser,
} from '@/lib/auth';
import { recordAssetAudit } from '@/lib/asset-audit';
import { getDbPool } from '@/lib/db';
import {
  insertWorkflowEvidence,
  parseEvidenceRequest,
} from '@/lib/workflow-evidence';
import type { HealthAsset, LostAssetReport, LostAssetReportData } from '@/lib/types';
import { GAUTENG_DISTRICTS } from '@/lib/types';

export const dynamic = 'force-dynamic';

type LostAssetReportRow = LostAssetReport & RowDataPacket;
type AssetRow = HealthAsset & RowDataPacket;

function parseReportData(input: unknown): LostAssetReportData | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }
  const value = input as Record<string, unknown>;
  if (
    typeof value.last_seen_date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.last_seen_date) ||
    typeof value.last_known_location !== 'string' ||
    value.last_known_location.trim().length < 3 ||
    value.last_known_location.trim().length > 500 ||
    typeof value.circumstances !== 'string' ||
    value.circumstances.trim().length < 20 ||
    value.circumstances.trim().length > 4000 ||
    typeof value.reference_number !== 'string' ||
    value.reference_number.trim().length > 191
  ) {
    return null;
  }
  const [year, month, day] = value.last_seen_date.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getTime() > Date.now()
  ) {
    return null;
  }
  return {
    last_seen_date: value.last_seen_date,
    last_known_location: value.last_known_location.trim(),
    circumstances: value.circumstances.trim(),
    reference_number: value.reference_number.trim(),
  };
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  if (!hasDistrictAssignment(auth.user)) {
    return NextResponse.json(
      { error: 'Your account needs a district assignment before you can access lost-asset reports.' },
      { status: 403 }
    );
  }
  const district = new URL(request.url).searchParams.get('district')?.trim() ?? '';
  if (!GAUTENG_DISTRICTS.includes(district as (typeof GAUTENG_DISTRICTS)[number])) {
    return NextResponse.json(
      { error: 'Select a valid district to view lost-asset reports.' },
      { status: 400 }
    );
  }
  if (!canAccessDistrict(auth.user, district)) {
    return NextResponse.json(
      { error: 'You cannot access lost-asset reports for that district.' },
      { status: 403 }
    );
  }
  try {
    const [reports] = await getDbPool().execute<LostAssetReportRow[]>(
      `SELECT * FROM health_asset_loss_reports
      WHERE district_snapshot = ?
      ORDER BY requested_at DESC, id DESC`,
      [district]
    );
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Failed to load lost-asset reports:', error);
    return NextResponse.json(
      { error: 'Unable to load lost-asset reports.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const auth = await requireUser(
    request,
    'super_administrator',
    'asset_manager',
    'supervisor',
    'admin_clerk',
    'chief_director'
  );
  if (auth.response) return auth.response;
  if (!hasDistrictAssignment(auth.user)) {
    return NextResponse.json(
      { error: 'Your account needs a district assignment before you can report a lost asset.' },
      { status: 403 }
    );
  }

  const parsedRequest = await parseEvidenceRequest(request);
  if (!parsedRequest.ok) {
    return NextResponse.json(
      { error: parsedRequest.error },
      { status: parsedRequest.status }
    );
  }
  const { body } = parsedRequest;
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json({ error: 'Choose an asset and complete its loss report.' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (typeof input.asset_id !== 'string' || !input.asset_id.trim()) {
    return NextResponse.json({ error: 'Choose an asset and complete its loss report.' }, { status: 400 });
  }
  const report = parseReportData(body);
  if (!report) {
    return NextResponse.json(
      { error: 'Provide a valid last-seen date, location, and circumstances for the report.' },
      { status: 400 }
    );
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbPool().getConnection();
    await connection.beginTransaction();
    const [assets] = await connection.execute<AssetRow[]>(
      'SELECT * FROM health_assets WHERE id = ? FOR UPDATE',
      [input.asset_id.trim()]
    );
    const asset = assets[0];
    if (!asset || !canAccessDistrict(auth.user, asset.district)) {
      await connection.rollback();
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }
    if (
      [
        'Lost',
        'Loss Report Pending',
        'Decommission Pending',
        'Decommissioned',
        'Disposal Pending',
        'Disposed',
      ].includes(asset.status)
    ) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'This asset already has an active loss or disposal workflow.' },
        { status: 409 }
      );
    }
    const [openMaintenance] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM health_asset_maintenance_records
      WHERE asset_id = ? AND status = 'Open' LIMIT 1 FOR UPDATE`,
      [asset.id]
    );
    if (openMaintenance.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Complete or resolve the open maintenance record before reporting this asset as lost.' },
        { status: 409 }
      );
    }
    const [existingReports] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM health_asset_loss_reports
      WHERE asset_id = ? AND status IN ('Pending', 'Confirmed Lost')
      LIMIT 1 FOR UPDATE`,
      [asset.id]
    );
    if (existingReports.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'An open lost-asset report already exists for this asset.' },
        { status: 409 }
      );
    }

    const id = randomUUID();
    const requesterName = `${auth.user.display_name}${auth.user.surname ? ` ${auth.user.surname}` : ''}`;
    await connection.execute(
      `INSERT INTO health_asset_loss_reports (
        id, asset_id, asset_tag_snapshot, asset_name_snapshot, previous_status,
        last_seen_date, last_known_location, circumstances, reference_number,
        district_snapshot, sub_district_snapshot, facility_name_snapshot,
        custodian_name_snapshot, custodian_persal_number_snapshot, requested_by,
        requester_name_snapshot, requester_persal_number_snapshot, requester_role_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        asset.id,
        asset.asset_tag,
        asset.asset_name,
        asset.status,
        report.last_seen_date,
        report.last_known_location,
        report.circumstances,
        report.reference_number || null,
        asset.district,
        asset.sub_district,
        asset.facility_name,
        asset.custodian_name,
        asset.persal_number,
        auth.user.id,
        requesterName,
        auth.user.persal_number,
        auth.user.role,
      ]
    );
    await insertWorkflowEvidence(
      connection,
      'lost',
      id,
      'submission',
      parsedRequest.evidence,
      auth.user.id
    );
    await connection.execute(
      `UPDATE health_assets SET status = 'Loss Report Pending' WHERE id = ?`,
      [asset.id]
    );
    const [updatedAssets] = await connection.execute<AssetRow[]>(
      'SELECT * FROM health_assets WHERE id = ?',
      [asset.id]
    );
    if (!updatedAssets[0]) throw new Error('Updated asset could not be reloaded for audit.');
    await recordAssetAudit(
      connection,
      updatedAssets[0],
      'updated',
      auth.user.id,
      asset,
      updatedAssets[0]
    );
    await connection.commit();
    return NextResponse.json({ id, status: 'Pending' }, { status: 201 });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Failed to submit lost-asset report:', error);
    return NextResponse.json({ error: 'Unable to submit the lost-asset report.' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
