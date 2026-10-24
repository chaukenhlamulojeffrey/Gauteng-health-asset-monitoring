CREATE TABLE IF NOT EXISTS health_asset_evidence (
  asset_id CHAR(36) NOT NULL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  file_content MEDIUMBLOB NOT NULL,
  uploaded_by CHAR(36) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asset_evidence_asset
    FOREIGN KEY (asset_id) REFERENCES health_assets(id) ON DELETE RESTRICT,
  CONSTRAINT fk_asset_evidence_uploader
    FOREIGN KEY (uploaded_by) REFERENCES app_users(id) ON DELETE RESTRICT
);
