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
import type {
  AssetDecommissionRequest,
  DecommissionRequestData,
  HealthAsset,
} from '@/lib/types';
import { GAUTENG_DISTRICTS } from '@/lib/types';

export const dynamic = 'force-dynamic';

type DecommissionRequestRow = AssetDecommissionRequest & RowDataPacket;
type AssetRow = HealthAsset & RowDataPacket;

function parseRequestData(input: unknown): DecommissionRequestData | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }
  const value = input as Record<string, unknown>;
  if (
    typeof value.decommission_date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.decommission_date) ||
    typeof value.reason !== 'string' ||
    value.reason.trim().length < 20 ||
    value.reason.trim().length > 4000 ||
    (value.reference_number !== undefined &&
      value.reference_number !== null &&
      typeof value.reference_number !== 'string')
  ) {
    return null;
  }
  const [year, month, day] = value.decommission_date.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    value.decommission_date > new Date().toISOString().slice(0, 10)
  ) {
    return null;
  }
  const referenceNumber =
    typeof value.reference_number === 'string'
      ? value.reference_number.trim()
      : '';
  if (referenceNumber.length > 191) return null;

  return {
    decommission_date: value.decommission_date,
    reason: value.reason.trim(),
    reference_number: referenceNumber,
  };
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  if (!hasDistrictAssignment(auth.user)) {
    return NextResponse.json(
      { error: 'Your account needs a district assignment before accessing decommission requests.' },
      { status: 403 }
    );
  }
  const district = new URL(request.url).searchParams.get('district')?.trim() ?? '';
  if (!GAUTENG_DISTRICTS.includes(district as (typeof GAUTENG_DISTRICTS)[number])) {
    return NextResponse.json(
      { error: 'Select a valid district to view decommission requests.' },
      { status: 400 }
    );
  }
  if (!canAccessDistrict(auth.user, district)) {
    return NextResponse.json(
      { error: 'You cannot access decommission requests for that district.' },
      { status: 403 }
    );
  }
  try {
    const [requests] = await getDbPool().execute<DecommissionRequestRow[]>(
      `SELECT * FROM health_asset_decommission_requests
      WHERE district_snapshot = ?
      ORDER BY requested_at DESC, id DESC`,
      [district]
    );
    return NextResponse.json(requests);
  } catch (error) {
    console.error('Failed to load decommission requests:', error);
    return NextResponse.json(
      { error: 'Unable to load decommission requests.' },
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
      { error: 'Your account needs a district assignment before requesting decommissioning.' },
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
    return NextResponse.json(
      { error: 'Select an asset and complete its decommission request.' },
      { status: 400 }
    );
  }
  const input = body as Record<string, unknown>;
  if (typeof input.asset_id !== 'string' || !input.asset_id.trim()) {
    return NextResponse.json(
      { error: 'Select an asset and complete its decommission request.' },
      { status: 400 }
    );
  }
  const data = parseRequestData(input);
  if (!data) {
    return NextResponse.json(
      { error: 'Enter a valid decommission date and at least 20 characters explaining the reason.' },
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
    if (asset.status !== 'Active') {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Only Active assets can be submitted for decommissioning. Complete maintenance first.' },
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
        { error: 'Complete the open maintenance record before requesting decommissioning.' },
        { status: 409 }
      );
    }
    const [pending] = await connection.execute<(RowDataPacket & { id: string })[]>(
      `SELECT id FROM health_asset_decommission_requests
      WHERE asset_id = ? AND status = 'Pending' LIMIT 1 FOR UPDATE`,
      [asset.id]
    );
    if (pending.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'A decommission request is already awaiting review for this asset.' },
        { status: 409 }
      );
    }

    const id = randomUUID();
    const requesterName =
      `${auth.user.display_name}${auth.user.surname ? ` ${auth.user.surname}` : ''}`;
    await connection.execute(
      `INSERT INTO health_asset_decommission_requests (
        id, asset_id, asset_tag_snapshot, asset_name_snapshot, previous_status,
        decommission_date, reason, reference_number, district_snapshot,
        sub_district_snapshot, facility_name_snapshot, location_snapshot,
        condition_snapshot, custodian_name_snapshot,
        custodian_persal_number_snapshot, requested_by,
        requester_name_snapshot, requester_persal_number_snapshot,
        requester_role_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        asset.id,
        asset.asset_tag,
        asset.asset_name,
        asset.status,
        data.decommission_date,
        data.reason,
        data.reference_number || null,
        asset.district,
        asset.sub_district,
        asset.facility_name,
        asset.location,
        asset.condition,
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
      'decommission',
      id,
      'submission',
      parsedRequest.evidence,
      auth.user.id
    );
    await connection.execute(
      `UPDATE health_assets SET status = 'Decommission Pending' WHERE id = ?`,
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
    console.error('Failed to submit decommission request:', error);
    return NextResponse.json(
      { error: 'Unable to submit the decommission request.' },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
