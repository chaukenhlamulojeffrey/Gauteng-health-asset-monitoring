-- Apply once to protect the bootstrap Super Administrator from user management.

ALTER TABLE app_users
  ADD COLUMN is_protected BOOLEAN NOT NULL DEFAULT FALSE;
