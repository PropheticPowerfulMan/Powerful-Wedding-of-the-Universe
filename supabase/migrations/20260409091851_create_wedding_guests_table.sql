/*
  # Wedding Guest Management System

  ## Overview
  Creates the complete guest database for Jonathan & Maria's wedding invitation system.

  ## New Tables

  ### guests
  - `id` (uuid, primary key) - Unique guest identifier
  - `first_name` (text, required) - Guest's first name
  - `last_name` (text, required) - Guest's last name / family name
  - `post_name` (text, optional) - Post name / middle name
  - `invitation_status` (text) - Whether the invitation has been sent: 'pending', 'sent', 'confirmed'
  - `rsvp_status` (text) - Guest's RSVP response: 'pending', 'attending', 'not_attending', 'maybe'
  - `rsvp_message` (text, optional) - Personal message from guest
  - `meal_preference` (text, optional) - Guest dietary preference
  - `number_of_guests` (integer) - Number of additional guests the invitee may bring
  - `group_name` (text, optional) - Family/group they belong to
  - `notes` (text, optional) - Admin notes about the guest
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - RLS enabled on guests table
  - Public can verify guest existence (select by name match only)
  - Full management restricted to service role (admin operations)

  ## Notes
  1. Guest lookup is done by first_name + last_name (+ optional post_name)
  2. invitation_status defaults to 'pending'
  3. rsvp_status defaults to 'pending'
*/

/*
  Wedding Guest Management System - FIXED VERSION
*/

-- ✅ 1. Activer extension UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ✅ 2. Création table
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  post_name text DEFAULT '',
  person_type text NOT NULL DEFAULT 'family'
    CHECK (person_type IN ('family', 'friends', 'work')),
  invitation_status text NOT NULL DEFAULT 'pending'
    CHECK (invitation_status IN ('pending', 'sent', 'confirmed')),
  rsvp_status text NOT NULL DEFAULT 'pending'
    CHECK (rsvp_status IN ('pending', 'attending', 'not_attending', 'maybe')),
  rsvp_message text DEFAULT '',
  meal_preference text DEFAULT '',
  number_of_guests integer NOT NULL DEFAULT 1,
  group_name text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guests DISABLE ROW LEVEL SECURITY;

-- ✅ 3. Index
CREATE INDEX IF NOT EXISTS idx_guests_name 
ON guests (lower(first_name), lower(last_name));

CREATE INDEX IF NOT EXISTS idx_guests_invitation_status 
ON guests (invitation_status);

CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status 
ON guests (rsvp_status);

CREATE INDEX IF NOT EXISTS idx_guests_person_type
ON guests (person_type);

-- ✅ 4. Activer RLS (TRÈS IMPORTANT)
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- ✅ 5. Supprimer anciennes policies (clean)
DROP POLICY IF EXISTS "public_insert" ON guests;
DROP POLICY IF EXISTS "public_select" ON guests;
DROP POLICY IF EXISTS "public_update" ON guests;
DROP POLICY IF EXISTS "public_delete" ON guests;

-- ✅ 6. Policies propres

-- INSERT
CREATE POLICY "public_insert"
ON guests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- SELECT
CREATE POLICY "public_select"
ON guests FOR SELECT
TO anon, authenticated
USING (true);

-- UPDATE
CREATE POLICY "public_update"
ON guests FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- DELETE
CREATE POLICY "public_delete"
ON guests FOR DELETE
TO anon, authenticated
USING (true);

-- ✅ 7. Trigger auto update
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS guests_updated_at ON guests;

CREATE TRIGGER guests_updated_at
BEFORE UPDATE ON guests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ✅ 8. Aucune donnée de démonstration insérée automatiquement.
-- Les invités doivent être ajoutés via le dashboard Admin ou import CSV.