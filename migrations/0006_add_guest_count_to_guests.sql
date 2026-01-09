-- Dodaj pole guest_count do tabeli guests
-- To pole określa liczbę osób w grupie (domyślnie 1)

ALTER TABLE guests
ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 1;

-- Dodaj walidację - liczba osób musi być co najmniej 1
ALTER TABLE guests
ADD CONSTRAINT check_guest_count_positive CHECK (guest_count >= 1);

-- Dodaj komentarz do nowego pola
COMMENT ON COLUMN guests.guest_count IS 'Liczba osób w grupie (domyślnie 1)';
