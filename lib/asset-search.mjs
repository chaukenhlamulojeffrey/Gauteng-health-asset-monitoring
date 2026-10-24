/**
 * @param {string} search
 */
export function createAssetSearchFilter(search) {
  const normalized = search.trim();
  const identifierLike =
    !/\s/.test(normalized) &&
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(normalized) &&
    /\d/.test(normalized);

  if (identifierLike) {
    return {
      sql: '(asset_tag = ? OR serial_imei_number = ? OR persal_number = ?)',
      values: [normalized, normalized, normalized],
    };
  }

  const searchTerms = normalized.match(/[A-Za-z0-9]+/g) ?? [];
  if (searchTerms.length > 0 && searchTerms.every((term) => term.length >= 4)) {
    return {
      sql: `MATCH (asset_tag, asset_name, facility_name, location,
        room_number, custodian_name, persal_number, serial_imei_number,
        district, sub_district) AGAINST (? IN BOOLEAN MODE)`,
      values: [searchTerms.map((term) => `+${term}*`).join(' ')],
    };
  }

  const escapedSearch = normalized.replace(/[!%_]/g, (character) => `!${character}`);
  return {
    sql: `CONCAT_WS(' ', asset_tag, asset_name, facility_name, location,
      room_number, custodian_name, persal_number, serial_imei_number,
      district, sub_district) LIKE ? ESCAPE '!'`,
    values: [`%${escapedSearch}%`],
  };
}
