-- Drop indexes
DROP INDEX IF EXISTS idx_order_created_at;
DROP INDEX IF EXISTS idx_order_ordered_by;
DROP INDEX IF EXISTS idx_order_assigned_cook;
DROP INDEX IF EXISTS idx_order_status;

-- Drop Order table
DROP TABLE IF EXISTS "order";
