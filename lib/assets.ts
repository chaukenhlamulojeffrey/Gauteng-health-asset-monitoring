import type { AssetFormData, AssetListResponse, HealthAsset } from './types';
import { apiRequest } from './api-client';

export async function fetchAssets(
  query: URLSearchParams
): Promise<AssetListResponse> {
  return apiRequest<AssetListResponse>(`/api/assets?${query.toString()}`);
}

export async function createAsset(
  asset: AssetFormData,
  evidence: File
): Promise<HealthAsset> {
  const body = new FormData();
  body.set('asset', JSON.stringify(asset));
  body.set('evidence', evidence);
  return apiRequest<HealthAsset>('/api/assets', {
    method: 'POST',
    body,
  });
}

export async function updateAsset(id: string, asset: AssetFormData): Promise<HealthAsset> {
  return apiRequest<HealthAsset>(`/api/assets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(asset),
  });
}

export async function deleteAsset(id: string): Promise<void> {
  await apiRequest<void>(`/api/assets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
