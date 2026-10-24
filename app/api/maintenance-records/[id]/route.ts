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
  MaintenanceCompletionData,
} from '@/lib/types';

type MaintenanceRow = Pick<
  AssetMaintenanceRecord,
  'id' | 'asset_id' | 'status' | 'started_at' | 'district_snapshot'
> &
  RowDataPacket;
type AssetRow = HealthAsset & RowDataPacket;
type RouteContext = { params: Promise<{ id: string }> };

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

function parseCompletionData(input: unknown): MaintenanceCompletionData | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }
  const value = input as Record<string, unknown>;
  if (
    typeof value.completed_at !== 'string' ||
    !validDate(value.completed_at) ||
    typeof value.work_performed !== 'string' ||
    value.work_performed.trim().length < 10 ||
    value.work_performed.trim().length > 4000 ||
    !validCost(value.actual_cost) ||
    (value.completion_notes !== undefined &&
      value.completion_notes !== null &&
      (typeof value.completion_notes !== 'string' ||
        value.completion_notes.trim().length > 4000))
  ) {
    return null;
  }
  return {
    completed_at: value.completed_at,
    work_performed: value.work_performed.trim(),
    actual_cost: value.actual_cost ?? null,
    completion_notes:
      typeof value.completion_notes === 'string'
        ? value.completion_notes.trim()
        : '',
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const parsedRequest = await parseEvidenceRequest(request);
  if (!parsedRequest.ok) {
    return NextResponse.json(
      { error: parsedRequest.error },
      { status: parsedRequest.status }
    );
  }
  const { body } = parsedRequest;
  const data = parseCompletionData(body);
  if (!data) {
    return NextResponse.json(
      { error: 'Enter a valid completion date and describe the work performed in at least 10 characters.' },
      { status: 400 }
    );
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
      { error: 'Your account needs a district assignment before completing maintenance.' },
      { status: 403 }
    );
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbPool().getConnection();
    await connection.beginTransaction();
    const [records] = await connection.execute<MaintenanceRow[]>(
      `SELECT id, asset_id, status, started_at, district_snapshot
      FROM health_asset_maintenance_records WHERE id = ? FOR UPDATE`,
      [id]
    );
    const record = records[0];
    if (!record || !canAccessDistrict(auth.user, record.district_snapshot)) {
      await connection.rollback();
      return NextResponse.json({ error: 'Maintenance record not found.' }, { status: 404 });
    }
    if (record.status !== 'Open') {
      await connection.rollback();
      return NextResponse.json(
        { error: 'This maintenance record has already been completed.' },
        { status: 409 }
      );
    }
    if (data.completed_at < String(record.started_at).slice(0, 10)) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'The completion date cannot be before the maintenance start date.' },
        { status: 400 }
      );
    }

    const [assets] = await connection.execute<AssetRow[]>(
      'SELECT * FROM health_assets WHERE id = ? FOR UPDATE',
      [record.asset_id]
    );
    const asset = assets[0];
    if (!asset || asset.status !== 'In Maintenance') {
      await connection.rollback();
      return NextResponse.json(
        { error: 'The asset no longer matches this open maintenance record.' },
        { status: 409 }
      );
    }

    const completerName =
      `${auth.user.display_name}${auth.user.surname ? ` ${auth.user.surname}` : ''}`;
    await connection.execute(
      `UPDATE health_asset_maintenance_records SET status = 'Completed',
        completed_at = ?, work_performed = ?, actual_cost = ?,
        completion_notes = ?, completed_by = ?, completer_name_snapshot = ?,
        completer_persal_number_snapshot = ?, completer_role_snapshot = ?,
        recorded_at = UTC_TIMESTAMP()
      WHERE id = ?`,
      [
        data.completed_at,
        data.work_performed,
        data.actual_cost ?? null,
        data.completion_notes || null,
        auth.user.id,
        completerName,
        auth.user.persal_number,
        auth.user.role,
        record.id,
      ]
    );
    await insertWorkflowEvidence(
      connection,
      'maintenance',
      record.id,
      'completion',
      parsedRequest.evidence,
      auth.user.id
    );
    await connection.execute(
      `UPDATE health_assets SET status = 'Active' WHERE id = ?`,
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
    return NextResponse.json({ success: true, status: 'Completed' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Failed to complete asset maintenance:', error);
    return NextResponse.json(
      { error: 'Unable to complete asset maintenance.' },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
