-- Ajouter téléphone (optionnel) et sexe (obligatoire) à la table guests
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'male'
    CHECK (gender IN ('male', 'female'));

COMMENT ON COLUMN guests.phone IS 'Numéro de téléphone de l''invité (optionnel)';
COMMENT ON COLUMN guests.gender IS 'Sexe de l''invité: male ou female (obligatoire pour personnalisation)';
