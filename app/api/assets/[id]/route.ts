import { NextResponse } from 'next/server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import {
  canAccessDistrict,
  hasDistrictAssignment,
  isSameOriginRequest,
  requireUser,
} from '@/lib/auth';
import { recordAssetAudit } from '@/lib/asset-audit';
import { parseAssetFormData } from '@/lib/asset-validation';
import { resolveFacilityName } from '@/lib/facility-name';
import { getDbPool } from '@/lib/db';
import type { HealthAsset } from '@/lib/types';

type AssetRow = HealthAsset & RowDataPacket;
type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const auth = await requireUser(
    request,
    'asset_manager',
    'supervisor',
    'admin_clerk',
    'chief_director'
  );
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const asset = parseAssetFormData(body);
  if (!asset) {
    return NextResponse.json({ error: 'Invalid asset data.' }, { status: 400 });
  }
  if (!hasDistrictAssignment(auth.user)) {
    return NextResponse.json(
      { error: 'Your account needs a district assignment before you can manage assets.' },
      { status: 403 }
    );
  }
  if (!canAccessDistrict(auth.user, asset.district)) {
    return NextResponse.json(
      { error: 'You can only update assets in your assigned district.' },
      { status: 403 }
    );
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbPool().getConnection();
    await connection.beginTransaction();
    const [currentAssets] = await connection.execute<AssetRow[]>(
      'SELECT * FROM health_assets WHERE id = ? FOR UPDATE',
      [id]
    );
    if (currentAssets.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }
    if (!canAccessDistrict(auth.user, currentAssets[0].district)) {
      await connection.rollback();
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }
    if (
      currentAssets[0].status === 'Lost' ||
      currentAssets[0].status === 'Loss Report Pending' ||
      currentAssets[0].status === 'Decommission Pending' ||
      currentAssets[0].status === 'Decommissioned' ||
      currentAssets[0].status === 'Disposal Pending' ||
      currentAssets[0].status === 'Disposed'
    ) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Assets in a lost or disposal workflow cannot be edited.' },
        { status: 409 }
      );
    }
    if (asset.status !== currentAssets[0].status) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Asset status can only be changed through its maintenance or approval workflow.' },
        { status: 409 }
      );
    }
    if (
      (currentAssets[0].custodian_name || currentAssets[0].persal_number) &&
      (
      asset.custodian_name !== currentAssets[0].custodian_name ||
      asset.persal_number !== currentAssets[0].persal_number
      )
    ) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Custodian changes must use the evidence-backed transfer workflow.' },
        { status: 409 }
      );
    }
    const facilityName = await resolveFacilityName(
      connection,
      asset.district,
      asset.sub_district,
      asset.facility_name
    );
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE health_assets SET
        asset_tag = ?, asset_name = ?, facility_name = ?, location = ?,
        room_number = ?, custodian_name = ?, persal_number = ?,
        serial_imei_number = ?, district = ?, sub_district = ?, category = ?,
        status = ?, \`condition\` = ?, acquisition_date = ?,
        useful_life_months = COALESCE(useful_life_months, ?),
        useful_life_end_date = COALESCE(useful_life_end_date, DATE_ADD(?, INTERVAL ? MONTH)),
        value = ?, notes = ?
      WHERE id = ?`,
      [
        asset.asset_tag,
        asset.asset_name,
        facilityName,
        asset.location,
        asset.room_number,
        asset.custodian_name,
        asset.persal_number,
        asset.serial_imei_number,
        asset.district,
        asset.sub_district,
        asset.category,
        asset.status,
        asset.condition,
        asset.acquisition_date,
        asset.useful_life_months,
        asset.acquisition_date,
        asset.useful_life_months,
        asset.value,
        asset.notes,
        id,
      ]
    );
    if (result.affectedRows === 0) {
      const [existing] = await connection.query<AssetRow[]>(
        'SELECT id FROM health_assets WHERE id = ?',
        [id]
      );
      if (existing.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
      }
    }

    const [assets] = await connection.query<AssetRow[]>(
      'SELECT * FROM health_assets WHERE id = ?',
      [id]
    );
    if (!assets[0]) throw new Error('Updated asset could not be reloaded for audit.');
    await recordAssetAudit(
      connection,
      assets[0],
      'updated',
      auth.user.id,
      currentAssets[0],
      assets[0]
    );
    await connection.commit();
    return NextResponse.json(assets[0]);
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Failed to update health asset:', error);
    const duplicate = (error as { code?: string }).code === 'ER_DUP_ENTRY';
    return NextResponse.json(
      { error: duplicate ? 'An asset with this tag already exists.' : 'Failed to update asset.' },
      { status: duplicate ? 409 : 500 }
    );
  } finally {
    connection?.release();
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!isSameOriginRequest(_request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const auth = await requireUser(
    _request,
    'asset_manager',
    'supervisor',
    'chief_director'
  );
  if (auth.response) return auth.response;
  if (!hasDistrictAssignment(auth.user)) {
    return NextResponse.json(
      { error: 'Your account needs a district assignment before you can manage assets.' },
      { status: 403 }
    );
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbPool().getConnection();
    await connection.beginTransaction();
    const [assets] = await connection.execute<AssetRow[]>(
      'SELECT * FROM health_assets WHERE id = ? FOR UPDATE',
      [id]
    );
    if (assets.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }
    if (!canAccessDistrict(auth.user, assets[0].district)) {
      await connection.rollback();
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }
    if (
      assets[0].status === 'Lost' ||
      assets[0].status === 'Loss Report Pending' ||
      assets[0].status === 'Decommission Pending' ||
      assets[0].status === 'Decommissioned' ||
      assets[0].status === 'Disposal Pending' ||
      assets[0].status === 'Disposed'
    ) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Assets in a lost or disposal workflow cannot be deleted; retain the audit record.' },
        { status: 409 }
      );
    }
    const [evidenceRows] = await connection.execute<RowDataPacket[]>(
      'SELECT asset_id FROM health_asset_evidence WHERE asset_id = ?',
      [assets[0].id]
    );
    if (evidenceRows.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Assets with registration evidence cannot be deleted; retain the attached document.' },
        { status: 409 }
      );
    }
    const [maintenanceRecords] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM health_asset_maintenance_records
      WHERE asset_id = ? LIMIT 1`,
      [assets[0].id]
    );
    if (maintenanceRecords.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Assets with maintenance history cannot be deleted; retain the service record.' },
        { status: 409 }
      );
    }
    const [operationRecords] = await connection.execute<RowDataPacket[]>(
      `SELECT asset_id FROM health_asset_transfers WHERE asset_id = ?
      UNION ALL
      SELECT asset_id FROM health_asset_verifications WHERE asset_id = ?
      UNION ALL
      SELECT asset_id FROM health_asset_lifespan_extensions WHERE asset_id = ?
      LIMIT 1`,
      [assets[0].id, assets[0].id, assets[0].id]
    );
    if (operationRecords.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Assets with transfer, verification, or lifespan history cannot be deleted; retain the audit evidence.' },
        { status: 409 }
      );
    }
    await recordAssetAudit(
      connection,
      assets[0],
      'deleted',
      auth.user.id,
      assets[0],
      null
    );
    const [result] = await connection.execute<ResultSetHeader>(
      'DELETE FROM health_assets WHERE id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }
    await connection.commit();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Failed to delete health asset:', error);
    return NextResponse.json({ error: 'Failed to delete asset.' }, { status: 500 });
  } finally {
    connection?.release();
  }
}
