-- Skrypt do utworzenia tabeli tasks w Supabase
-- Uruchom ten skrypt w SQL Editor w panelu administracyjnym Supabase

-- Tworzenie tabeli tasks, jeśli nie istnieje
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT[] NOT NULL DEFAULT '{}',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ustawienie uprawnień dostępu (RLS - Row Level Security)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Tworzenie polityki dostępu umożliwiającej dostęp dla wszystkich użytkowników
-- UWAGA: W środowisku produkcyjnym powinieneś ograniczyć dostęp tylko dla uwierzytelnionych użytkowników
CREATE POLICY "Dostęp dla wszystkich do tasks" ON public.tasks
  USING (true)  -- Odczyt dozwolony dla wszystkich
  WITH CHECK (true);  -- Zapis/edycja dozwolone dla wszystkich

-- Dodanie komentarzy do tabeli i kolumn
COMMENT ON TABLE public.tasks IS 'Zadania do wykonania w ramach planowania ślubu';
COMMENT ON COLUMN public.tasks.id IS 'Unikalny identyfikator zadania';
COMMENT ON COLUMN public.tasks.title IS 'Tytuł zadania';
COMMENT ON COLUMN public.tasks.notes IS 'Lista notatek związanych z zadaniem';
COMMENT ON COLUMN public.tasks.completed IS 'Czy zadanie zostało ukończone';
COMMENT ON COLUMN public.tasks.category IS 'Kategoria zadania (np. "I. Ustalenia Ogólne")';
COMMENT ON COLUMN public.tasks.due_date IS 'Termin wykonania zadania (opcjonalny)';
COMMENT ON COLUMN public.tasks.created_at IS 'Data utworzenia zadania';