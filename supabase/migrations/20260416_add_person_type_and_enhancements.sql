-- Add person_type column to guests table
ALTER TABLE guests ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT 'family';

-- Add comment to describe the column
COMMENT ON COLUMN guests.person_type IS 'Type of relationship: family, friends, or work';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_guests_person_type ON guests(person_type);
CREATE INDEX IF NOT EXISTS idx_guests_combined_filter ON guests(person_type, rsvp_status, invitation_status);
