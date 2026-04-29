-- Supprimer les invités de démonstration insérés par la migration initiale
DELETE FROM guests
WHERE (first_name, last_name, post_name) IN (
  ('Jean', 'Pierre', 'Lokala'),
  ('Marie', 'Lomboto', ''),
  ('Patrick', 'Mukendi', 'Emmanuel'),
  ('Grace', 'Kabila', ''),
  ('David', 'Nkosi', 'James'),
  ('Christian', 'Ahadi', 'Nyabenda')
);
