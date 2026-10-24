ALTER TABLE app_users
  ADD COLUMN last_login_at DATETIME NULL AFTER locked_until;

UPDATE app_users u
LEFT JOIN (
  SELECT user_id, MAX(created_at) AS last_login_at
  FROM app_sessions
  GROUP BY user_id
) s ON s.user_id = u.id
SET u.last_login_at = s.last_login_at
WHERE u.last_login_at IS NULL;
