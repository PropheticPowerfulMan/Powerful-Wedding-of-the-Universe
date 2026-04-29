-- Enforce couple-support columns and normalize partner fields on guests
-- Business rule: the invited person remains the primary guest; partner detail columns are not used.

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS is_couple boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_first_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS partner_last_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS partner_post_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS partner_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS partner_gender text DEFAULT 'female'
    CHECK (partner_gender IN ('male', 'female', ''));

CREATE OR REPLACE FUNCTION normalize_guest_couple_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_couple = COALESCE(NEW.is_couple, false);

  -- Keep partner fields empty to match the current couple model.
  NEW.partner_first_name = '';
  NEW.partner_last_name = '';
  NEW.partner_post_name = '';
  NEW.partner_phone = '';
  NEW.partner_gender = '';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS guests_normalize_couple_fields ON guests;

CREATE TRIGGER guests_normalize_couple_fields
BEFORE INSERT OR UPDATE ON guests
FOR EACH ROW
EXECUTE FUNCTION normalize_guest_couple_fields();

UPDATE guests
SET
  is_couple = COALESCE(is_couple, false),
  partner_first_name = '',
  partner_last_name = '',
  partner_post_name = '',
  partner_phone = '',
  partner_gender = '';
