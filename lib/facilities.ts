import { apiRequest } from './api-client';
import type { FacilityDirectoryEntry } from './types';

export async function fetchFacilities(): Promise<FacilityDirectoryEntry[]> {
  return apiRequest<FacilityDirectoryEntry[]>('/api/facilities');
}
