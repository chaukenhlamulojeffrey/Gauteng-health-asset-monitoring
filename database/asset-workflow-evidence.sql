CREATE TABLE IF NOT EXISTS health_asset_workflow_evidence (
  id CHAR(36) NOT NULL PRIMARY KEY,
  workflow_type ENUM('maintenance', 'decommission', 'lost', 'disposal') NOT NULL,
  workflow_id CHAR(36) NOT NULL,
  action ENUM('submission', 'completion', 'review', 'recovery') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  file_content MEDIUMBLOB NOT NULL,
  uploaded_by CHAR(36) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_workflow_evidence_record (workflow_type, workflow_id, uploaded_at),
  CONSTRAINT fk_workflow_evidence_uploader
    FOREIGN KEY (uploaded_by) REFERENCES app_users(id) ON DELETE RESTRICT
);
