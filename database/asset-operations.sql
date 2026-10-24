CREATE TABLE IF NOT EXISTS health_asset_transfers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  asset_tag_snapshot VARCHAR(191) NOT NULL,
  asset_name_snapshot VARCHAR(255) NOT NULL,
  former_custodian_name VARCHAR(255) NOT NULL,
  former_custodian_persal_number VARCHAR(8) NULL,
  new_custodian_name VARCHAR(255) NOT NULL,
  new_custodian_persal_number VARCHAR(8) NOT NULL,
  transfer_date DATE NOT NULL,
  reason TEXT NOT NULL,
  district_snapshot VARCHAR(100) NOT NULL,
  sub_district_snapshot VARCHAR(255) NULL,
  facility_name_snapshot VARCHAR(255) NOT NULL,
  transferred_by CHAR(36) NOT NULL,
  transferer_name_snapshot VARCHAR(255) NOT NULL,
  transferer_persal_number_snapshot VARCHAR(8) NOT NULL,
  transferer_role_snapshot VARCHAR(40) NOT NULL,
  evidence_file_name VARCHAR(255) NOT NULL,
  evidence_file_size INT UNSIGNED NOT NULL,
  evidence_file_content MEDIUMBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_asset_transfers_asset (asset_id, created_at),
  INDEX idx_asset_transfers_district (district_snapshot, created_at),
  CONSTRAINT fk_asset_transfers_asset
    FOREIGN KEY (asset_id) REFERENCES health_assets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asset_transfers_user
    FOREIGN KEY (transferred_by) REFERENCES app_users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS health_asset_verifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  asset_tag_snapshot VARCHAR(191) NOT NULL,
  asset_name_snapshot VARCHAR(255) NOT NULL,
  found TINYINT(1) NOT NULL,
  observed_condition VARCHAR(50) NOT NULL,
  observed_location VARCHAR(255) NOT NULL,
  custodian_confirmed TINYINT(1) NOT NULL,
  notes TEXT NULL,
  district_snapshot VARCHAR(100) NOT NULL,
  sub_district_snapshot VARCHAR(255) NULL,
  facility_name_snapshot VARCHAR(255) NOT NULL,
  verified_by CHAR(36) NOT NULL,
  verifier_name_snapshot VARCHAR(255) NOT NULL,
  verifier_persal_number_snapshot VARCHAR(8) NOT NULL,
  verifier_role_snapshot VARCHAR(40) NOT NULL,
  evidence_file_name VARCHAR(255) NOT NULL,
  evidence_file_size INT UNSIGNED NOT NULL,
  evidence_file_content MEDIUMBLOB NOT NULL,
  verified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_asset_verifications_asset (asset_id, verified_at),
  INDEX idx_asset_verifications_district (district_snapshot, verified_at),
  CONSTRAINT fk_asset_verifications_asset
    FOREIGN KEY (asset_id) REFERENCES health_assets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asset_verifications_user
    FOREIGN KEY (verified_by) REFERENCES app_users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS health_asset_lifespan_extensions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  asset_tag_snapshot VARCHAR(191) NOT NULL,
  asset_name_snapshot VARCHAR(255) NOT NULL,
  previous_end_date DATE NOT NULL,
  new_end_date DATE NOT NULL,
  extension_months SMALLINT UNSIGNED NOT NULL,
  inspected_condition VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  district_snapshot VARCHAR(100) NOT NULL,
  sub_district_snapshot VARCHAR(255) NULL,
  facility_name_snapshot VARCHAR(255) NOT NULL,
  extended_by CHAR(36) NOT NULL,
  extender_name_snapshot VARCHAR(255) NOT NULL,
  extender_persal_number_snapshot VARCHAR(8) NOT NULL,
  extender_role_snapshot VARCHAR(40) NOT NULL,
  evidence_file_name VARCHAR(255) NOT NULL,
  evidence_file_size INT UNSIGNED NOT NULL,
  evidence_file_content MEDIUMBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_asset_lifespan_extensions_asset (asset_id, created_at),
  INDEX idx_asset_lifespan_extensions_district (district_snapshot, created_at),
  CONSTRAINT fk_asset_lifespan_extensions_asset
    FOREIGN KEY (asset_id) REFERENCES health_assets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asset_lifespan_extensions_user
    FOREIGN KEY (extended_by) REFERENCES app_users(id) ON DELETE RESTRICT
);
