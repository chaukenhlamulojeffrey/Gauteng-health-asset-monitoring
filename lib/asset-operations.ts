import { apiRequest } from './api-client';
import type {
  AssetOperationHistoryEntry,
  AssetOperationType,
} from './types';

export async function createAssetOperation(
  assetId: string,
  type: AssetOperationType,
  data: Record<string, string | number | boolean>,
  evidence: File
): Promise<void> {
  const body = new FormData();
  body.set('operation', JSON.stringify({
    asset_id: assetId,
    type,
    data,
  }));
  body.set('evidence', evidence);
  await apiRequest('/api/asset-operations', {
    method: 'POST',
    body,
  });
}

export async function fetchAssetOperationHistory(
  type: AssetOperationType
): Promise<AssetOperationHistoryEntry[]> {
  const query = new URLSearchParams({ type, limit: '50' });
  const result = await apiRequest<{ entries: AssetOperationHistoryEntry[] }>(
    `/api/asset-operations?${query.toString()}`
  );
  return result.entries;
}
