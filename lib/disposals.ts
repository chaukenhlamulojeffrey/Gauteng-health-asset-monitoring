import { apiRequest } from './api-client';
import type { AssetDisposal, DisposalRequestData } from './types';

export type DisposalLocationFilter = {
  district: string;
  subDistrict: string;
  facilityName: string;
};

export function fetchDisposals(
  filter: DisposalLocationFilter
): Promise<AssetDisposal[]> {
  const query = new URLSearchParams({
    district: filter.district,
    subDistrict: filter.subDistrict,
    facilityName: filter.facilityName,
  });
  return apiRequest<AssetDisposal[]>(`/api/disposals?${query.toString()}`);
}

export function createDisposalRequest(
  assetId: string,
  request: DisposalRequestData,
  evidence: File
): Promise<{ id: string; status: string }> {
  const body = new FormData();
  body.set('data', JSON.stringify({ asset_id: assetId, ...request }));
  body.set('evidence', evidence);
  return apiRequest('/api/disposals', {
    method: 'POST',
    body,
  });
}

export function reviewDisposal(
  id: string,
  decision: 'approve' | 'reject',
  notes: string,
  evidence: File
): Promise<{ success: boolean; status: string }> {
  const body = new FormData();
  body.set('data', JSON.stringify({ decision, notes }));
  body.set('evidence', evidence);
  return apiRequest(`/api/disposals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body,
  });
}
