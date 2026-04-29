-- Add optional contact fields captured during RSVP
ALTER TABLE guests
ADD COLUMN IF NOT EXISTS rsvp_contact_email TEXT NOT NULL DEFAULT '';

ALTER TABLE guests
ADD COLUMN IF NOT EXISTS rsvp_contact_phone TEXT NOT NULL DEFAULT '';
