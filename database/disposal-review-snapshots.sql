-- Apply once to an existing health_asset_disposals table.
ALTER TABLE health_asset_disposals
  ADD COLUMN requester_name_snapshot VARCHAR(255) NULL,
  ADD COLUMN requester_persal_number_snapshot VARCHAR(8) NULL,
  ADD COLUMN requester_role_snapshot VARCHAR(32) NULL,
  ADD COLUMN district_snapshot VARCHAR(32) NULL,
  ADD COLUMN sub_district_snapshot VARCHAR(150) NULL,
  ADD COLUMN facility_name_snapshot VARCHAR(255) NULL,
  ADD COLUMN reviewer_name_snapshot VARCHAR(255) NULL,
  ADD COLUMN reviewer_persal_number_snapshot VARCHAR(8) NULL,
  ADD COLUMN reviewer_role_snapshot VARCHAR(32) NULL;

UPDATE health_asset_disposals d
JOIN app_users requester ON requester.id = d.requested_by
JOIN health_assets a ON a.id = d.asset_id
SET d.requester_name_snapshot = CONCAT_WS(' ', requester.display_name, requester.surname),
    d.requester_persal_number_snapshot = requester.persal_number,
    d.requester_role_snapshot = requester.role,
    d.district_snapshot = a.district,
    d.sub_district_snapshot = a.sub_district,
    d.facility_name_snapshot = a.facility_name
WHERE d.requester_name_snapshot IS NULL;

UPDATE health_asset_disposals d
JOIN app_users reviewer ON reviewer.id = COALESCE(d.approved_by, d.rejected_by)
SET d.reviewer_name_snapshot = CONCAT_WS(' ', reviewer.display_name, reviewer.surname),
    d.reviewer_persal_number_snapshot = reviewer.persal_number,
    d.reviewer_role_snapshot = reviewer.role
WHERE d.reviewer_name_snapshot IS NULL;
