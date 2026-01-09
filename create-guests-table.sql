-- Skrypt do utworzenia tabeli guests w Supabase
-- Uruchom ten skrypt w SQL Editor w panelu administracyjnym Supabase

-- Tworzenie tabeli guests, jeśli nie istnieje
CREATE TABLE IF NOT EXISTS public.guests (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 1,
    email TEXT,
    phone TEXT,
    side TEXT,
    rsvp_status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_guest_count_positive CHECK (guest_count >= 1)
);

-- Dodanie indeksów dla lepszej wydajności zapytań
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status ON public.guests (rsvp_status);
CREATE INDEX IF NOT EXISTS idx_guests_full_name ON public.guests (full_name);

-- Ustawienie uprawnień dostępu (RLS - Row Level Security)
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Tworzenie polityki dostępu umożliwiającej dostęp dla wszystkich użytkowników
-- UWAGA: W środowisku produkcyjnym powinieneś ograniczyć dostęp tylko dla uwierzytelnionych użytkowników
CREATE POLICY "Dostęp dla wszystkich do guests" ON public.guests
  USING (true)  -- Odczyt dozwolony dla wszystkich
  WITH CHECK (true);  -- Zapis/edycja dozwolone dla wszystkich

-- Dodanie komentarzy do tabeli i kolumn
COMMENT ON TABLE public.guests IS 'Lista grup gości weselnych z śledzeniem potwierdzeń obecności (RSVP)';
COMMENT ON COLUMN public.guests.id IS 'Unikalny identyfikator grupy';
COMMENT ON COLUMN public.guests.full_name IS 'Nazwa grupy (np. "Zespół muzyczny", "Andzia z mężem i dzieckiem")';
COMMENT ON COLUMN public.guests.guest_count IS 'Liczba osób w grupie (domyślnie 1)';
COMMENT ON COLUMN public.guests.email IS 'Adres email grupy/osoby kontaktowej (opcjonalny)';
COMMENT ON COLUMN public.guests.phone IS 'Numer telefonu grupy/osoby kontaktowej (opcjonalny)';
COMMENT ON COLUMN public.guests.side IS 'Strona wesela (panna młoda/pan młody)';
COMMENT ON COLUMN public.guests.rsvp_status IS 'Status potwierdzenia obecności: pending (oczekuje), confirmed (potwierdzony), declined (odrzucony)';
COMMENT ON COLUMN public.guests.notes IS 'Dodatkowe notatki dotyczące grupy';
COMMENT ON COLUMN public.guests.created_at IS 'Data dodania grupy do listy';
