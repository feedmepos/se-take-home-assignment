-- Create Order table
CREATE TABLE IF NOT EXISTS "order" (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    assigned_cook_user INTEGER REFERENCES "user"(id),
    ordered_by INTEGER NOT NULL REFERENCES "user"(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes on order table for performance optimization
CREATE INDEX idx_order_status ON "order"(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_assigned_cook ON "order"(assigned_cook_user) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_ordered_by ON "order"(ordered_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_created_at ON "order"(created_at DESC);
