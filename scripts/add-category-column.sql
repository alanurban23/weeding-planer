-- Dodanie kolumny category do tabeli notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS category TEXT;
