-- Dodanie kolumny id_category do tabeli tasks, jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'id_category'
  ) THEN
    ALTER TABLE tasks ADD COLUMN id_category INT2 REFERENCES categories(id);
  END IF;
END $$;

-- Aktualizacja id_category w tabeli tasks na podstawie nazwy kategorii
UPDATE tasks t
SET id_category = c.id
FROM categories c
WHERE t.category = c.name AND t.id_category IS NULL;

-- Wyświetlenie zadań, które nie mają przypisanego id_category
SELECT id, title, category, id_category 
FROM tasks 
WHERE id_category IS NULL AND category IS NOT NULL;

-- Dodanie brakujących kategorii
INSERT INTO categories (name)
SELECT DISTINCT category 
FROM tasks 
WHERE id_category IS NULL AND category IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM categories WHERE name = tasks.category);

-- Ponowna aktualizacja id_category po dodaniu brakujących kategorii
UPDATE tasks t
SET id_category = c.id
FROM categories c
WHERE t.category = c.name AND t.id_category IS NULL;

-- Sprawdzenie, czy wszystkie zadania mają przypisane id_category
SELECT COUNT(*) AS tasks_without_id_category
FROM tasks 
WHERE id_category IS NULL AND category IS NOT NULL;
