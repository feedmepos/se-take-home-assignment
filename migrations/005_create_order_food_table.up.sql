-- Create OrderFood pivot table
CREATE TABLE IF NOT EXISTS order_food (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES "order"(id),
    food_id INTEGER NOT NULL REFERENCES food(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes on order_food for fast joins
CREATE INDEX idx_order_food_order_id ON order_food(order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_order_food_food_id ON order_food(food_id) WHERE deleted_at IS NULL;

-- Create composite index for order lookup with food filtering (performance optimization)
CREATE INDEX idx_order_food_composite ON order_food(order_id, food_id) WHERE deleted_at IS NULL;
