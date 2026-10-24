CREATE TABLE IF NOT EXISTS health_facilities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source_key VARCHAR(80) NOT NULL,
  facility_name VARCHAR(255) NOT NULL,
  facility_type VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  sub_district VARCHAR(255) NULL,
  locality VARCHAR(255) NULL,
  street_address VARCHAR(500) NULL,
  operator_name VARCHAR(255) NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  source_name VARCHAR(100) NOT NULL DEFAULT 'OpenStreetMap',
  source_updated_at DATETIME NULL,
  imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_health_facilities_source_key (source_key),
  INDEX idx_health_facilities_district (district),
  INDEX idx_health_facilities_sub_district (sub_district),
  INDEX idx_health_facilities_name (facility_name)
);
