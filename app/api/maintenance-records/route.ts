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
  AssetMaintenanceRecord,
  HealthAsset,
  MaintenanceStartData,
} from '@/lib/types';
import { GAUTENG_DISTRICTS } from '@/lib/types';

export const dynamic = 'force-dynamic';

type MaintenanceRecordRow = AssetMaintenanceRecord & RowDataPacket;
type AssetRow = HealthAsset & RowDataPacket;

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    value <= new Date().toISOString().slice(0, 10)
  );
}

function validCost(value: unknown): value is number | null | undefined {
  const amount = typeof value === 'number' ? value.toString() : '';
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 9_999_999_999.99 &&
      /^\d{1,10}(?:\.\d{1,2})?$/.test(amount))
  );
}

function parseStartData(input: unknown): MaintenanceStartData | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }
  const value = input as Record<string, unknown>;
  if (
    typeof value.started_at !== 'string' ||
    !validDate(value.started_at) ||
    typeof value.issue_description !== 'string' ||
    value.issue_description.trim().length < 10 ||
    value.issue_description.trim().length > 4000 ||
    (value.service_provider !== undefined &&
      value.service_provider !== null &&
      (typeof value.service_provider !== 'string' ||
        value.service_provider.trim().length > 255)) ||
    !validCost(value.estimated_cost) ||
    (value.reference_number !== undefined &&
      value.reference_number !== null &&
      (typeof value.reference_number !== 'string' ||
        value.reference_number.trim().length > 191))
  ) {
    return null;
  }
  return {
    started_at: value.started_at,
    issue_description: value.issue_description.trim(),
    service_provider:
      typeof value.service_provider === 'string'
        ? value.service_provider.trim()
        : '',
    estimated_cost: value.estimated_cost ?? null,
    reference_number:
      typeof value.reference_number === 'string'
        ? value.reference_number.trim()
        : '',
  };
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  if (!hasDistrictAssignment(auth.user)) {
    return NextResponse.json(
      { error: 'Your account needs a district assignment before accessing maintenance history.' },
      { status: 403 }
    );
  }
  const district = new URL(request.url).searchParams.get('district')?.trim() ?? '';
  if (!GAUTENG_DISTRICTS.includes(district as (typeof GAUTENG_DISTRICTS)[number])) {
    return NextResponse.json(
      { error: 'Select a valid district to view maintenance history.' },
      { status: 400 }
    );
  }
  if (!canAccessDistrict(auth.user, district)) {
    return NextResponse.json(
      { error: 'You cannot access maintenance history for that district.' },
      { status: 403 }
    );
  }
  try {
    const [records] = await getDbPool().execute<MaintenanceRecordRow[]>(
      `SELECT * FROM health_asset_maintenance_records
      WHERE district_snapshot = ?
      ORDER BY opened_at DESC, id DESC`,
      [district]
    );
    return NextResponse.json(records);
  } catch (error) {
    console.error('Failed to load asset maintenance history:', error);
    return NextResponse.json(
      { error: 'Unable to load asset maintenance history.' },
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
      { error: 'Your account needs a district assignment before recording maintenance.' },
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
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Select an asset and enter its maintenance details.' },
      { status: 400 }
    );
  }
  const input = body as Record<string, unknown>;
  if (typeof input.asset_id !== 'string' || !input.asset_id.trim()) {
    return NextResponse.json(
      { error: 'Select an asset and enter its maintenance details.' },
      { status: 400 }
    );
  }
  const data = parseStartData(input);
  if (!data) {
    return NextResponse.json(
      { error: 'Enter a valid start date and describe the maintenance issue in at least 10 characters.' },
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
        { error: 'Only Active assets can start a new maintenance record.' },
        { status: 409 }
      );
    }
    const [openRecords] = await connection.execute<(RowDataPacket & { id: string })[]>(
      `SELECT id FROM health_asset_maintenance_records
      WHERE asset_id = ? AND status = 'Open' LIMIT 1 FOR UPDATE`,
      [asset.id]
    );
    if (openRecords.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'This asset already has an open maintenance record.' },
        { status: 409 }
      );
    }

    const id = randomUUID();
    const openerName =
      `${auth.user.display_name}${auth.user.surname ? ` ${auth.user.surname}` : ''}`;
    await connection.execute(
      `INSERT INTO health_asset_maintenance_records (
        id, asset_id, asset_tag_snapshot, asset_name_snapshot, previous_status,
        started_at, issue_description, service_provider, estimated_cost,
        reference_number, district_snapshot, sub_district_snapshot,
        facility_name_snapshot, location_snapshot, condition_snapshot,
        custodian_name_snapshot, custodian_persal_number_snapshot, opened_by,
        opener_name_snapshot, opener_persal_number_snapshot, opener_role_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        asset.id,
        asset.asset_tag,
        asset.asset_name,
        asset.status,
        data.started_at,
        data.issue_description,
        data.service_provider || null,
        data.estimated_cost ?? null,
        data.reference_number || null,
        asset.district,
        asset.sub_district,
        asset.facility_name,
        asset.location,
        asset.condition,
        asset.custodian_name,
        asset.persal_number,
        auth.user.id,
        openerName,
        auth.user.persal_number,
        auth.user.role,
      ]
    );
    await insertWorkflowEvidence(
      connection,
      'maintenance',
      id,
      'submission',
      parsedRequest.evidence,
      auth.user.id
    );
    await connection.execute(
      `UPDATE health_assets SET status = 'In Maintenance' WHERE id = ?`,
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
    return NextResponse.json({ id, status: 'Open' }, { status: 201 });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Failed to record asset maintenance:', error);
    return NextResponse.json(
      { error: 'Unable to record asset maintenance.' },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
