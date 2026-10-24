export const GAUTENG_DISTRICTS = [
  'Johannesburg',
  'Tshwane',
  'Ekurhuleni',
  'Sedibeng',
  'West Rand',
] as const;

// Sub-districts sourced from active health directory groupings and municipal sources:
// Johannesburg — 7 health sub-districts (active directory screenshots)
// Tshwane — 7 administrative regions (tshwane.gov.za)
// Ekurhuleni — former town councils + key townships (ekurhuleni.gov.za, municipalities.co.za)
// Sedibeng and West Rand use operational sub-district groups from their active health directories.
export const GAUTENG_SUB_DISTRICTS: Record<string, readonly string[]> = {
  Johannesburg: [
    // Health sub-district groupings follow the active directory.
    'Johannesburg A Health Sub-District',
    'Johannesburg B Health Sub-District',
    'Johannesburg C Health Sub-District',
    'Johannesburg D Health Sub-District',
    'Johannesburg E Health Sub-District',
    'Johannesburg F Health Sub-District',
    'Johannesburg G Health Sub-District',
  ],
  Tshwane: [
    // Region 1 — North-west: Akasia, Ga-Rankuwa, Mabopane, Soshanguve
    'Region 1 (Akasia, Rosslyn, Pretoria North, Ga-Rankuwa, Mabopane, Winterveldt, Soshanguve)',
    // Region 2 — North: Hammanskraal, Montana
    'Region 2 (Hammanskraal, Kudube, Stinkwater, Suurman, Babelegi, Montana, Annlin, Sinoville, Doornpoort, Wonderboom)',
    // Region 3 — Central: Pretoria CBD, Brooklyn, Hatfield
    'Region 3 (Pretoria CBD, Brooklyn, Hatfield, Pretoria West, Silverton, East Lynne, Sunnyside, Arcadia)',
    // Region 4 — South-west: Centurion, Irene, Atteridgeville, Eersterust
    'Region 4 (Centurion, Irene, Olievenhoutbosch, Laudium, Erasmia, Atteridgeville, Eersterust, Sunderland Ridge)',
    // Region 5 — East: Rayton, Cullinan, Refilwe
    'Region 5 (Rayton, Cullinan, Refilwe, Sable Hills, Roodeplaat, Onverwacht)',
    // Region 6 — North-east: Mamelodi, Moreleta Park
    'Region 6 (Mamelodi, Nellmapius, Jan Niemand Park, Mahube Valley, Moreleta Park, Silver Lakes, Mooikloof, Garsfontein, Woodlands)',
    // Region 7 — Far east: Bronkhorstspruit, Ekangala, Zithobeni
    'Region 7 (Bronkhorstspruit, Ekangala, Zithobeni, Rethabiseng, Zithobeni Heights, Vaalbank, Vlakfontein)',
  ],
  Ekurhuleni: [
    'Ekurhuleni East 1 Health Sub-District',
    'Ekurhuleni East 2 Health Sub-District',
    'Ekurhuleni North 1 Health Sub-District',
    'Ekurhuleni North 2 Health Sub-District',
    'Ekurhuleni South 1 Health Sub-District',
    'Ekurhuleni South 2 Health Sub-District',
  ],
  Sedibeng: [
    'Emfuleni Sub District',
    'Lesedi Sub District',
    'Midvaal Sub District',
  ],
  'West Rand': [
    'Merafong City Local Municipality',
    'Mogale City Local Municipality',
    'Randfontein Local Municipality',
    'Westonaria Local Municipality',
  ],
};

export const ASSET_CATEGORIES = [
  'Medical Equipment',
  'Furniture',
  'IT Equipment',
  'Office Equipment',
  'Vehicle',
  'Building Infrastructure',
  'Laboratory Equipment',
  'Other',
] as const;

export const ASSET_STATUSES = [
  'Active',
  'In Maintenance',
] as const;

export const ASSET_CONDITIONS = [
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Damaged',
] as const;

export type HealthAsset = {
  id: string;
  asset_tag: string;
  asset_name: string;
  facility_name: string;
  location: string;
  room_number: string | null;
  custodian_name: string | null;
  persal_number: string | null;
  serial_imei_number: string | null;
  district: string;
  sub_district: string | null;
  category: string | null;
  status: string;
  condition: string;
  acquisition_date: string | null;
  useful_life_months: number | null;
  useful_life_end_date: string | null;
  last_verified_at?: string | null;
  verification_due?: boolean;
  display_status?: string;
  value: number | null;
  notes: string | null;
  evidence_file_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetFormData = Omit<HealthAsset, 'id' | 'created_at' | 'updated_at'>;

export type AssetOperationType = 'transfer' | 'verification' | 'lifespan_extension';

export type AssetOperationHistoryEntry = {
  id: string;
  operation_type: AssetOperationType;
  asset_id: string;
  asset_tag_snapshot: string;
  asset_name_snapshot: string;
  summary: string;
  evidence_file_name: string;
  actor_name: string;
  actor_persal_number: string;
  occurred_at: string;
};

export type AssetTransferData = {
  new_custodian_name: string;
  new_custodian_persal_number: string;
  transfer_date: string;
  reason: string;
};

export type AssetVerificationData = {
  found: boolean;
  observed_condition: string;
  observed_location: string;
  custodian_confirmed: boolean;
  verified_custodian_name?: string;
  verified_custodian_persal_number?: string;
  notes: string;
};

export type AssetLifespanExtensionData = {
  extension_months: number;
  inspected_condition: 'Excellent' | 'Good';
  reason: string;
};

export type AssetListResponse = {
  assets: HealthAsset[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    totalAssets: number;
    custodians: number;
    activeAssets: number;
    needsAttention: number;
  };
};

export type FacilityDirectoryEntry = {
  id: string;
  facility_name: string;
  facility_type: string;
  district: string;
  sub_district: string | null;
  locality: string | null;
  street_address: string | null;
  operator_name: string | null;
  source_name: string;
  asset_count: number;
};

export type AssetDisposal = {
  id: string;
  asset_id: string;
  asset_tag: string;
  asset_name: string;
  facility_name: string;
  district_snapshot: string | null;
  sub_district_snapshot: string | null;
  former_custodian_name: string;
  former_custodian_persal_number: string | null;
  disposal_method: string;
  disposal_reason: string;
  disposal_date: string;
  reference_number: string;
  previous_status: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requested_by: string;
  requester_role: import('./roles').AppRole;
  requester_name: string;
  requester_persal_number: string;
  requested_at: string;
  approved_by: string | null;
  approver_name: string | null;
  approver_persal_number: string | null;
  approver_role: import('./roles').AppRole | null;
  approved_at: string | null;
  approver_notes: string | null;
  rejected_by: string | null;
  rejecter_name: string | null;
  rejecter_persal_number: string | null;
  rejecter_role: import('./roles').AppRole | null;
  rejected_at: string | null;
};

export type DisposalRequestData = {
  disposal_method: string;
  disposal_reason: string;
  disposal_date: string;
  reference_number: string;
};

export type LostAssetReportData = {
  last_seen_date: string;
  last_known_location: string;
  circumstances: string;
  reference_number: string;
};

export type LostAssetReport = {
  id: string;
  asset_id: string;
  asset_tag_snapshot: string;
  asset_name_snapshot: string;
  previous_status: string;
  last_seen_date: string;
  last_known_location: string;
  circumstances: string;
  reference_number: string | null;
  status: 'Pending' | 'Confirmed Lost' | 'Recovered' | 'Rejected';
  district_snapshot: string;
  sub_district_snapshot: string | null;
  facility_name_snapshot: string;
  custodian_name_snapshot: string | null;
  custodian_persal_number_snapshot: string | null;
  requested_by: string;
  requester_name_snapshot: string;
  requester_persal_number_snapshot: string;
  requester_role_snapshot: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewer_name_snapshot: string | null;
  reviewer_persal_number_snapshot: string | null;
  reviewer_role_snapshot: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  recovered_by: string | null;
  recoverer_name_snapshot: string | null;
  recoverer_persal_number_snapshot: string | null;
  recovered_at: string | null;
  recovery_notes: string | null;
};

export type DecommissionRequestData = {
  decommission_date: string;
  reason: string;
  reference_number: string;
};

export type MaintenanceStartData = {
  started_at: string;
  issue_description: string;
  service_provider: string;
  estimated_cost: number | null;
  reference_number: string;
};

export type MaintenanceCompletionData = {
  completed_at: string;
  work_performed: string;
  actual_cost: number | null;
  completion_notes: string;
};

export type AssetMaintenanceRecord = {
  id: string;
  asset_id: string;
  asset_tag_snapshot: string;
  asset_name_snapshot: string;
  previous_status: string;
  started_at: string;
  issue_description: string;
  service_provider: string | null;
  estimated_cost: number | null;
  reference_number: string | null;
  status: 'Open' | 'Completed';
  district_snapshot: string;
  sub_district_snapshot: string | null;
  facility_name_snapshot: string;
  location_snapshot: string;
  condition_snapshot: string;
  custodian_name_snapshot: string | null;
  custodian_persal_number_snapshot: string | null;
  opened_by: string;
  opener_name_snapshot: string;
  opener_persal_number_snapshot: string;
  opener_role_snapshot: string;
  opened_at: string;
  completed_at: string | null;
  work_performed: string | null;
  actual_cost: number | null;
  completion_notes: string | null;
  completed_by: string | null;
  completer_name_snapshot: string | null;
  completer_persal_number_snapshot: string | null;
  completer_role_snapshot: string | null;
  recorded_at: string | null;
};

export type AssetDecommissionRequest = {
  id: string;
  asset_id: string;
  asset_tag_snapshot: string;
  asset_name_snapshot: string;
  previous_status: string;
  decommission_date: string;
  reason: string;
  reference_number: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  district_snapshot: string;
  sub_district_snapshot: string | null;
  facility_name_snapshot: string;
  location_snapshot: string;
  condition_snapshot: string;
  custodian_name_snapshot: string | null;
  custodian_persal_number_snapshot: string | null;
  requested_by: string;
  requester_name_snapshot: string;
  requester_persal_number_snapshot: string;
  requester_role_snapshot: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewer_name_snapshot: string | null;
  reviewer_persal_number_snapshot: string | null;
  reviewer_role_snapshot: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
};
