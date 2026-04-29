-- Compteur du nombre de téléchargements d'invitation par invité
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS download_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN guests.download_count IS 'Nombre de fois que l''invité a téléchargé son invitation';
