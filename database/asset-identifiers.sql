-- Apply once to add custodian PERSAL and optional asset serial/IMEI identifiers.

ALTER TABLE health_assets
  ADD COLUMN persal_number VARCHAR(8) NULL AFTER custodian_name,
  ADD COLUMN serial_imei_number VARCHAR(191) NULL AFTER persal_number;

ALTER TABLE health_asset_disposals
  ADD COLUMN former_custodian_persal_number VARCHAR(8) NULL
  AFTER former_custodian_name;
