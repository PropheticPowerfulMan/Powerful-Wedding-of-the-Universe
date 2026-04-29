-- Ajouter la prise en charge des couples dans la table guests
-- Les deux nouvelles colonnes sont optionnelles (nullable) → aucun impact sur les données existantes

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS is_couple boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_first_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS partner_last_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS partner_post_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS partner_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS partner_gender text DEFAULT 'female'
    CHECK (partner_gender IN ('male', 'female', ''));

-- Commentaires explicatifs
COMMENT ON COLUMN guests.is_couple IS 'Indique si l''invité vient accompagné d''un(e) partenaire inscrit(e)';
COMMENT ON COLUMN guests.partner_first_name IS 'Prénom du/de la partenaire (si couple)';
COMMENT ON COLUMN guests.partner_last_name IS 'Nom du/de la partenaire (si couple)';
COMMENT ON COLUMN guests.partner_post_name IS 'Post-nom du/de la partenaire (si couple)';
COMMENT ON COLUMN guests.partner_phone IS 'Téléphone du/de la partenaire (si couple)';
COMMENT ON COLUMN guests.partner_gender IS 'Sexe du/de la partenaire (si couple)';
