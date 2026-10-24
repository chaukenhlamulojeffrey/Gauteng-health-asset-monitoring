import { apiRequest } from './api-client';
import type { LostAssetReport, LostAssetReportData } from './types';

export function fetchLostAssetReports(district: string): Promise<LostAssetReport[]> {
  const query = new URLSearchParams({ district });
  return apiRequest<LostAssetReport[]>(`/api/lost-assets?${query.toString()}`);
}

export function createLostAssetReport(
  assetId: string,
  report: LostAssetReportData,
  evidence: File
): Promise<{ id: string; status: string }> {
  const body = new FormData();
  body.set('data', JSON.stringify({ asset_id: assetId, ...report }));
  body.set('evidence', evidence);
  return apiRequest('/api/lost-assets', {
    method: 'POST',
    body,
  });
}

export function updateLostAssetReport(
  id: string,
  decision: 'approve' | 'reject' | 'recover',
  notes: string,
  evidence: File
): Promise<{ success: boolean; status: string }> {
  const body = new FormData();
  body.set('data', JSON.stringify({ decision, notes }));
  body.set('evidence', evidence);
  return apiRequest(`/api/lost-assets/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  });
}
