-- Create User table
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes on user table for performance optimization
CREATE INDEX idx_user_role ON "user"(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_deleted_at ON "user"(deleted_at);

-- Insert pre-seeded data: 2 Regular customers, 2 VIP customers, 1 cook bot
INSERT INTO "user" (name, role, created_at, modified_at) VALUES
    ('Regular Customer 1', 'Regular Customer', NOW(), NOW()),
    ('Regular Customer 2', 'Regular Customer', NOW(), NOW()),
    ('VIP Customer 1', 'VIP Customer', NOW(), NOW()),
    ('VIP Customer 2', 'VIP Customer', NOW(), NOW()),
    ('Cook Bot 1', 'Cook', NOW(), NOW());
