// Skrypt do utworzenia tabeli categories w bazie danych Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ładowanie zmiennych środowiskowych
dotenv.config();

// Inicjalizacja klienta Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Błąd: Brak zmiennych środowiskowych SUPABASE_URL lub SUPABASE_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createCategoriesTable() {
  try {
    console.log('Rozpoczynam tworzenie tabeli categories...');
    
    // Sprawdzenie czy tabela categories istnieje
    let { data: tableExists, error: checkError } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
      
    // Jeśli tabela nie istnieje, utworzymy ją
    if (checkError && checkError.code === '42P01') {
      console.log('Tabela categories nie istnieje. Tworzę nową tabelę...');
      
      // Niestety, nie możemy bezpośrednio wykonać CREATE TABLE przez API Supabase
      console.log('UWAGA: Nie można automatycznie utworzyć tabeli przez API Supabase.');
      console.log('Wykonaj poniższe zapytanie SQL w panelu SQL Editora w Supabase:');
      console.log(`
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS categories_name_idx ON categories (name);
      `);
      
      // Czekamy na ręczne utworzenie tabeli
      console.log('Po utworzeniu tabeli, uruchom ten skrypt ponownie, aby zmigrować dane.');
      return;
    } else if (checkError) {
      console.error('Błąd podczas sprawdzania tabeli categories:', checkError);
      return;
    }
    
    console.log('Tabela categories już istnieje. Migruję dane...');
    
    // Pobieranie unikalnych kategorii z tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('category')
      .not('category', 'is', null);
      
    if (tasksError) {
      console.error('Błąd podczas pobierania kategorii z tasks:', tasksError);
      return;
    }
    
    // Próba pobrania kategorii z notes (kolumna category)
    let notesWithCategory = [];
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('category')
        .not('category', 'is', null);
        
      if (!error) {
        notesWithCategory = data || [];
        console.log(`Pobrano ${notesWithCategory.length} notatek z kolumną category`);
      } else {
        console.log('Kolumna category w tabeli notes nie istnieje lub jest pusta');
      }
    } catch (e) {
      console.log('Błąd podczas pobierania notatek z kolumną category:', e);
    }
    
    // Próba pobrania kategorii z notes (kolumna id_category)
    let notesWithIdCategory = [];
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('id_category')
        .not('id_category', 'is', null);
        
      if (!error) {
        notesWithIdCategory = data || [];
        console.log(`Pobrano ${notesWithIdCategory.length} notatek z kolumną id_category`);
      } else {
        console.log('Kolumna id_category w tabeli notes nie istnieje lub jest pusta');
      }
    } catch (e) {
      console.log('Błąd podczas pobierania notatek z kolumną id_category:', e);
    }
    
    // Wyodrębniamy unikalne kategorie z zadań
    const categoriesFromTasks = Array.from(
      new Set(tasks.map(task => task.category).filter(Boolean))
    );
    
    // Wyodrębniamy unikalne kategorie z notatek (z kolumny category)
    const categoriesFromNotesCategory = Array.from(
      new Set(notesWithCategory.map(note => note.category).filter(Boolean))
    );
    
    // Wyodrębniamy unikalne kategorie z notatek (z kolumny id_category)
    const categoriesFromNotesIdCategory = Array.from(
      new Set(notesWithIdCategory.map(note => note.id_category).filter(Boolean))
    );
    
    // Łączymy wszystkie kategorie
    const allCategoryValues = [...new Set([
      ...categoriesFromTasks, 
      ...categoriesFromNotesCategory,
      ...categoriesFromNotesIdCategory
    ])];
    
    console.log(`Znaleziono ${allCategoryValues.length} unikalnych kategorii do migracji.`);
    
    // Dodawanie kategorii do tabeli categories
    for (const category of allCategoryValues) {
      // Sprawdzenie czy kategoria już istnieje
      const { data: existingCategory, error: checkCategoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', category)
        .limit(1);
        
      if (checkCategoryError) {
        console.error(`Błąd podczas sprawdzania kategorii "${category}":`, checkCategoryError);
        continue;
      }
      
      // Jeśli kategoria nie istnieje, dodaj ją
      if (!existingCategory || existingCategory.length === 0) {
        const { data: newCategory, error: insertError } = await supabase
          .from('categories')
          .insert({ name: category })
          .select();
          
        if (insertError) {
          console.error(`Błąd podczas dodawania kategorii "${category}":`, insertError);
        } else {
          console.log(`Dodano kategorię "${category}" z ID ${newCategory[0].id}`);
        }
      } else {
        console.log(`Kategoria "${category}" już istnieje z ID ${existingCategory[0].id}`);
      }
    }
    
    // Sprawdzenie czy kolumna id_category istnieje w tabeli tasks
    console.log('Sprawdzanie kolumny id_category w tabeli tasks...');
    
    // Niestety, nie możemy bezpośrednio sprawdzić struktury tabeli przez API Supabase
    // Zakładamy, że kolumna id_category może nie istnieć i wyświetlamy instrukcje
    console.log('UWAGA: Nie można automatycznie sprawdzić i dodać kolumny przez API Supabase.');
    console.log('Wykonaj poniższe zapytanie SQL w panelu SQL Editora w Supabase, jeśli kolumna id_category nie istnieje:');
    console.log(`
-- Dodanie kolumny id_category do tabeli tasks, jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'id_category'
  ) THEN
    ALTER TABLE tasks ADD COLUMN id_category INTEGER REFERENCES categories(id);
  END IF;
END $$;

-- Dodanie kolumny id_category do tabeli notes, jeśli nie istnieje
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'id_category'
  ) THEN
    ALTER TABLE notes ADD COLUMN id_category INTEGER REFERENCES categories(id);
  END IF;
END $$;
    `);
    
    // Pobieranie wszystkich kategorii
    const { data: allCategories, error: getCategoriesError } = await supabase
      .from('categories')
      .select('id, name');
      
    if (getCategoriesError) {
      console.error('Błąd podczas pobierania kategorii:', getCategoriesError);
      return;
    }
    
    console.log('Aktualizacja id_category w tabelach tasks i notes...');
    console.log('Wykonaj poniższe zapytanie SQL w panelu SQL Editora w Supabase:');
    
    let updateSQL = `
-- Aktualizacja id_category w tabeli tasks
`;
    
    // Generowanie SQL dla aktualizacji id_category w tabeli tasks
    for (const category of allCategories) {
      updateSQL += `UPDATE tasks SET id_category = ${category.id} WHERE category = '${category.name.replace(/'/g, "''")}';
`;
    }
    
    updateSQL += `
-- Aktualizacja id_category w tabeli notes
`;
    
    // Generowanie SQL dla aktualizacji id_category w tabeli notes
    for (const category of allCategories) {
      updateSQL += `UPDATE notes SET id_category = ${category.id} WHERE category = '${category.name.replace(/'/g, "''")}';
`;
    }
    
    console.log(updateSQL);
    
    console.log('Po wykonaniu powyższych zapytań, kategorie będą poprawnie skonfigurowane w bazie danych.');
    
  } catch (error) {
    console.error('Wyjątek podczas tworzenia tabeli categories:', error);
  }
}

// Uruchomienie funkcji
createCategoriesTable()
  .then(() => {
    console.log('Skrypt zakończył działanie.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Błąd podczas wykonywania skryptu:', error);
    process.exit(1);
  });
