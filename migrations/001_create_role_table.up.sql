-- Create Role table
CREATE TABLE IF NOT EXISTS role (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index on role name for fast lookup
CREATE INDEX idx_role_name ON role(name) WHERE deleted_at IS NULL;

-- Insert initial roles
INSERT INTO role (name, created_at, modified_at) VALUES
    ('Regular Customer', NOW(), NOW()),
    ('VIP Customer', NOW(), NOW()),
    ('Cook', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
