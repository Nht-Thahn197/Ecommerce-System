-- Promote the default deployed account to admin.
-- Run once on the production database if `test@example.com` was created
-- before its admin role was assigned.

UPDATE users
SET role = 'admin',
    updated_at = NOW()
WHERE email = 'test@example.com';

SELECT id, email, role, status, updated_at
FROM users
WHERE email = 'test@example.com';
