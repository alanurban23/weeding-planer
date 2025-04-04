CREATE TABLE IF NOT EXISTS costs (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    value DECIMAL(10, 2) NOT NULL, -- Assuming up to 10 digits, 2 decimal places
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Add an index on name if you expect to query by it often
-- CREATE INDEX IF NOT EXISTS idx_costs_name ON costs (name);
