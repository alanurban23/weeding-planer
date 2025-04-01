-- Skrypt do utworzenia tabeli kategorii i migracji danych
-- Uruchom ten skrypt w panelu SQL Supabase

-- 1. Dodanie kolumny id_category do tabeli tasks, jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'id_category'
  ) THEN
    ALTER TABLE tasks ADD COLUMN id_category INT2 REFERENCES categories(id);
  END IF;
END $$;

-- 2. Aktualizacja id_category w tabeli tasks na podstawie nazwy kategorii
UPDATE tasks t
SET id_category = c.id
FROM categories c
WHERE t.category = c.name AND t.id_category IS NULL;

-- 3. Dodanie brakujących kategorii z tabeli tasks
INSERT INTO categories (name)
SELECT DISTINCT category 
FROM tasks 
WHERE id_category IS NULL AND category IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM categories WHERE name = tasks.category);

-- 4. Ponowna aktualizacja id_category po dodaniu brakujących kategorii
UPDATE tasks t
SET id_category = c.id
FROM categories c
WHERE t.category = c.name AND t.id_category IS NULL;

-- 5. Dodanie polityki bezpieczeństwa RLS dla tabeli categories, jeśli nie istnieje
DO $$
BEGIN
  -- Najpierw włącz RLS dla tabeli categories, jeśli nie jest włączone
  ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
  
  -- Sprawdź, czy polityka już istnieje
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Enable read access for all users'
  ) THEN
    -- Polityka umożliwiająca odczyt wszystkim użytkownikom
    CREATE POLICY "Enable read access for all users" ON categories
      FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Enable insert for authenticated users only'
  ) THEN
    -- Polityka umożliwiająca dodawanie kategorii tylko zalogowanym użytkownikom
    CREATE POLICY "Enable insert for authenticated users only" ON categories
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Enable update for authenticated users only'
  ) THEN
    -- Polityka umożliwiająca aktualizację kategorii tylko zalogowanym użytkownikom
    CREATE POLICY "Enable update for authenticated users only" ON categories
      FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Enable delete for authenticated users only'
  ) THEN
    -- Polityka umożliwiająca usuwanie kategorii tylko zalogowanym użytkownikom
    CREATE POLICY "Enable delete for authenticated users only" ON categories
      FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 6. Dodanie indeksu dla kolumny id_category w tabelach tasks i notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'tasks' AND indexname = 'tasks_id_category_idx'
  ) THEN
    CREATE INDEX tasks_id_category_idx ON tasks (id_category);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'notes' AND indexname = 'notes_id_category_idx'
  ) THEN
    CREATE INDEX notes_id_category_idx ON notes (id_category);
  END IF;
END $$;

-- 7. Dodanie indeksu dla kolumny name w tabeli categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'categories' AND indexname = 'categories_name_idx'
  ) THEN
    CREATE INDEX categories_name_idx ON categories (name);
  END IF;
END $$;

-- 8. Sprawdzenie wyników migracji
SELECT 
  (SELECT COUNT(*) FROM categories) AS total_categories,
  (SELECT COUNT(*) FROM tasks WHERE id_category IS NOT NULL) AS tasks_with_category,
  (SELECT COUNT(*) FROM tasks WHERE id_category IS NULL AND category IS NOT NULL) AS tasks_without_id_category,
  (SELECT COUNT(*) FROM notes WHERE id_category IS NOT NULL) AS notes_with_category;
