import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

type FacilityNameRow = {
  facility_name: string;
  source: 'directory' | 'asset';
} & RowDataPacket;

function normalizeFacilityName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function editDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] +
          (left[row - 1] === right[column - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[right.length];
}

export async function resolveFacilityName(
  connection: PoolConnection,
  district: string,
  subDistrict: string | null,
  submittedName: string
): Promise<string> {
  const [rows] = await connection.query<FacilityNameRow[]>(
    `SELECT facility_name, 'directory' AS source
      FROM health_facilities WHERE district = ?
    UNION
    SELECT facility_name, 'asset' AS source
      FROM health_assets WHERE district = ?`,
    [district, district]
  );
  const submittedKey = normalizeFacilityName(submittedName);
  const candidatesByKey = new Map<string, (typeof rows)[number] & { key: string }>();
  for (const row of rows) {
    const key = normalizeFacilityName(row.facility_name);
    if (!key) continue;
    const existing = candidatesByKey.get(key);
    if (!existing || row.source === 'directory') {
      candidatesByKey.set(key, { ...row, key });
    }
  }
  const candidates = Array.from(candidatesByKey.values());
  const exact = candidates.find((candidate) => candidate.key === submittedKey);

  const ranked = candidates
    .filter((candidate) => {
      const submittedDigits = submittedKey.match(/\d+/g)?.join(',') ?? '';
      const candidateDigits = candidate.key.match(/\d+/g)?.join(',') ?? '';
      return submittedDigits === candidateDigits;
    })
    .map((candidate) => ({
      ...candidate,
      distance: editDistance(submittedKey, candidate.key),
    }))
    .sort((left, right) => left.distance - right.distance);
  const closest = ranked[0];
  const maxLength = Math.max(submittedKey.length, closest?.key.length ?? 0);
  const threshold = Math.max(1, Math.floor(maxLength * 0.06));
  const cannotAutoCorrect =
    !closest ||
    submittedKey.length < 6 ||
    closest.distance > threshold ||
    ranked[1]?.distance === closest.distance;
  const correctedName =
    exact?.facility_name ??
    (closest && !cannotAutoCorrect
      ? closest.facility_name
      : submittedName.trim());
  const canonicalDirectoryEntry = candidates.some(
    (candidate) =>
      candidate.source === 'directory' &&
      candidate.key === normalizeFacilityName(correctedName)
  );

  if (!canonicalDirectoryEntry) {
    const sourceKey = `asset:${createHash('sha256')
      .update(`${district.toLocaleLowerCase()}|${normalizeFacilityName(correctedName)}`)
      .digest('hex')}`;
    await connection.execute(
      `INSERT INTO health_facilities (
        source_key, facility_name, facility_type, district, sub_district,
        source_name
      ) VALUES (?, ?, 'Registered facility', ?, ?, 'Asset register')
      ON DUPLICATE KEY UPDATE source_key = VALUES(source_key)`,
      [sourceKey, correctedName, district, subDistrict]
    );
  }

  return correctedName;
}
