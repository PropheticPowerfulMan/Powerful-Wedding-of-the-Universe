/*
  # Fix RLS Policies for Guest Management

  ## Changes
  - Allow anonymous and authenticated users to insert guests
  - Allow anonymous and authenticated users to update guests
  - Keep public select access
  - Remove restrictive authentication requirement for adding guests
*/

DROP POLICY IF EXISTS "Authenticated users can insert guests" ON guests;
DROP POLICY IF EXISTS "Authenticated users can update guests" ON guests;
DROP POLICY IF EXISTS "Authenticated users can delete guests" ON guests;

CREATE POLICY "Anyone can insert guests"
  ON guests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update guests"
  ON guests FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete guests"
  ON guests FOR DELETE
  TO anon, authenticated
  USING (true);
