import {
  ASSET_CATEGORIES,
  ASSET_CONDITIONS,
  ASSET_STATUSES,
  GAUTENG_DISTRICTS,
  GAUTENG_SUB_DISTRICTS,
  type AssetFormData,
} from './types';

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableText(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

export function parseAssetFormData(input: unknown): AssetFormData | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }

  const value = input as Record<string, unknown>;
  if (
    !isNonEmptyText(value.asset_tag) ||
    !isNonEmptyText(value.asset_name) ||
    !isNonEmptyText(value.facility_name) ||
    !isNonEmptyText(value.location) ||
    !isNonEmptyText(value.custodian_name) ||
    !isNonEmptyText(value.persal_number) ||
    !/^\d{8}$/.test(value.persal_number.trim()) ||
    !isNullableText(value.serial_imei_number) ||
    !isNonEmptyText(value.district) ||
    !isNonEmptyText(value.status) ||
    !isNonEmptyText(value.condition) ||
    !isNonEmptyText(value.room_number) ||
    !isNonEmptyText(value.sub_district) ||
    !isNonEmptyText(value.category) ||
    !isNonEmptyText(value.acquisition_date) ||
    !Number.isInteger(value.useful_life_months) ||
    (value.useful_life_months as number) < 1 ||
    (value.useful_life_months as number) > 1200 ||
    !isNullableText(value.notes)
  ) {
    return null;
  }

  if (
    !GAUTENG_DISTRICTS.includes(
      value.district as (typeof GAUTENG_DISTRICTS)[number]
    ) ||
    !GAUTENG_SUB_DISTRICTS[value.district]?.includes(value.sub_district) ||
    !ASSET_CATEGORIES.includes(
      value.category as (typeof ASSET_CATEGORIES)[number]
    ) ||
    !ASSET_STATUSES.includes(value.status as (typeof ASSET_STATUSES)[number]) ||
    !ASSET_CONDITIONS.includes(
      value.condition as (typeof ASSET_CONDITIONS)[number]
    )
  ) {
    return null;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value.acquisition_date) ||
    !isValidCalendarDate(value.acquisition_date)
  ) {
    return null;
  }

  if (
    value.value !== undefined &&
    value.value !== null &&
    (typeof value.value !== 'number' ||
      !Number.isFinite(value.value) ||
      value.value < 0)
  ) {
    return null;
  }

  if (typeof value.value !== 'number') {
    return null;
  }

  return {
    asset_tag: value.asset_tag.trim(),
    asset_name: value.asset_name.trim(),
    facility_name: value.facility_name.trim(),
    location: value.location.trim(),
    room_number: value.room_number.trim(),
    custodian_name: value.custodian_name.trim(),
    persal_number: value.persal_number.trim(),
    serial_imei_number:
      typeof value.serial_imei_number === 'string' &&
      value.serial_imei_number.trim()
        ? value.serial_imei_number.trim()
        : null,
    district: value.district.trim(),
    sub_district: value.sub_district.trim(),
    category: value.category.trim(),
    status: value.status.trim(),
    condition: value.condition.trim(),
    acquisition_date: value.acquisition_date,
    useful_life_months: value.useful_life_months as number,
    useful_life_end_date:
      typeof value.useful_life_end_date === 'string'
        ? value.useful_life_end_date
        : null,
    value: value.value,
    notes: value.notes ?? null,
  };
}

function isValidCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
