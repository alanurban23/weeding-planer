-- Create guests table for wedding guest list management
CREATE TABLE IF NOT EXISTS guests (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    side TEXT,
    rsvp_status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON guests (rsvp_status);
CREATE INDEX IF NOT EXISTS idx_guests_full_name ON guests (full_name);

-- Enable Row Level Security (RLS)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public access
-- WARNING: In production, you should restrict access to authenticated users only
CREATE POLICY "Allow public access to guests" ON guests
  USING (true)
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE guests IS 'Wedding guest list with RSVP tracking';
COMMENT ON COLUMN guests.id IS 'Unique guest identifier';
COMMENT ON COLUMN guests.full_name IS 'Guest full name';
COMMENT ON COLUMN guests.email IS 'Guest email address (optional)';
COMMENT ON COLUMN guests.phone IS 'Guest phone number (optional)';
COMMENT ON COLUMN guests.side IS 'Which side of wedding (bride/groom)';
COMMENT ON COLUMN guests.rsvp_status IS 'RSVP status: pending, confirmed, or declined';
COMMENT ON COLUMN guests.notes IS 'Additional notes about the guest';
COMMENT ON COLUMN guests.created_at IS 'Timestamp when guest was added';
