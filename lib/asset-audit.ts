import type { PoolConnection } from 'mysql2/promise';
import type { HealthAsset } from './types';

export async function recordAssetAudit(
  connection: PoolConnection,
  asset: HealthAsset,
  action: 'created' | 'updated' | 'deleted',
  actorId: string,
  before: HealthAsset | null,
  after: HealthAsset | null
): Promise<void> {
  await connection.execute(
    `INSERT INTO health_asset_audit (
      asset_id, asset_tag, action, actor_id, before_snapshot, after_snapshot
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      asset.id,
      asset.asset_tag,
      action,
      actorId,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
    ]
  );
}
