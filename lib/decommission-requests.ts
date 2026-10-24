import { apiRequest } from './api-client';
import type { AssetDecommissionRequest, DecommissionRequestData } from './types';

export function fetchDecommissionRequests(
  district: string
): Promise<AssetDecommissionRequest[]> {
  const query = new URLSearchParams({ district });
  return apiRequest<AssetDecommissionRequest[]>(
    `/api/decommission-requests?${query.toString()}`
  );
}

export function createDecommissionRequest(
  assetId: string,
  request: DecommissionRequestData,
  evidence: File
): Promise<{ id: string; status: string }> {
  const body = new FormData();
  body.set('data', JSON.stringify({ asset_id: assetId, ...request }));
  body.set('evidence', evidence);
  return apiRequest('/api/decommission-requests', {
    method: 'POST',
    body,
  });
}

export function reviewDecommissionRequest(
  id: string,
  decision: 'approve' | 'reject',
  notes: string,
  evidence: File
): Promise<{ success: boolean; status: string }> {
  const body = new FormData();
  body.set('data', JSON.stringify({ decision, notes }));
  body.set('evidence', evidence);
  return apiRequest(`/api/decommission-requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  });
}
