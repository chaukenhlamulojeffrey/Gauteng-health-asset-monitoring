import { apiRequest } from './api-client';
import type {
  AssetMaintenanceRecord,
  MaintenanceCompletionData,
  MaintenanceStartData,
} from './types';

export function fetchMaintenanceRecords(
  district: string
): Promise<AssetMaintenanceRecord[]> {
  const query = new URLSearchParams({ district });
  return apiRequest<AssetMaintenanceRecord[]>(
    `/api/maintenance-records?${query.toString()}`
  );
}

export function createMaintenanceRecord(
  assetId: string,
  data: MaintenanceStartData,
  evidence: File
): Promise<{ id: string; status: string }> {
  const body = new FormData();
  body.set('data', JSON.stringify({ asset_id: assetId, ...data }));
  body.set('evidence', evidence);
  return apiRequest('/api/maintenance-records', {
    method: 'POST',
    body,
  });
}

export function completeMaintenanceRecord(
  id: string,
  data: MaintenanceCompletionData,
  evidence: File
): Promise<{ success: boolean; status: string }> {
  const body = new FormData();
  body.set('data', JSON.stringify(data));
  body.set('evidence', evidence);
  return apiRequest(`/api/maintenance-records/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  });
}
