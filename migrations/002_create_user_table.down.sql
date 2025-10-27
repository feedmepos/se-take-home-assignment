-- Drop indexes
DROP INDEX IF EXISTS idx_user_deleted_at;
DROP INDEX IF EXISTS idx_user_role;

-- Drop User table
DROP TABLE IF EXISTS "user";
