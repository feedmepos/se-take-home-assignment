-- Create Food table
CREATE TABLE IF NOT EXISTS food (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index on food for fast lookup
CREATE INDEX idx_food_type ON food(type) WHERE deleted_at IS NULL;

-- Insert sample food items
INSERT INTO food (name, type, created_at, modified_at) VALUES
    ('Burger', 'Food', NOW(), NOW()),
    ('Fries', 'Food', NOW(), NOW()),
    ('Pizza', 'Food', NOW(), NOW()),
    ('Soda', 'Drink', NOW(), NOW()),
    ('Water', 'Drink', NOW(), NOW()),
    ('Ice Cream', 'Dessert', NOW(), NOW()),
    ('Cake', 'Dessert', NOW(), NOW());
