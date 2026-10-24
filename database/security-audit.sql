-- Apply once to add persistent login throttling and asset change history.

CREATE TABLE IF NOT EXISTS app_login_rate_limits (
  key_hash CHAR(64) NOT NULL PRIMARY KEY,
  window_started_at DATETIME NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_login_rate_limits_window (window_started_at)
);

CREATE TABLE IF NOT EXISTS health_asset_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  asset_tag VARCHAR(191) NOT NULL,
  action ENUM('created', 'updated', 'deleted') NOT NULL,
  actor_id CHAR(36) NOT NULL,
  before_snapshot JSON NULL,
  after_snapshot JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_asset_audit_asset (asset_id, created_at),
  INDEX idx_asset_audit_created (created_at),
  CONSTRAINT fk_asset_audit_actor
    FOREIGN KEY (actor_id) REFERENCES app_users(id) ON DELETE RESTRICT
);
