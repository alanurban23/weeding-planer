import { createClient } from '@supabase/supabase-js';
import { Task, InsertTask, UpdateTask, Note, InsertNote, UpdateNote } from '@shared/schema';

// Pobieramy dane uwierzytelniające z zmiennych środowiskowych
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

// Sprawdzenie, czy zmienne środowiskowe zostały ustawione
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Brak wymaganych zmiennych środowiskowych SUPABASE_URL i SUPABASE_API_KEY');
}

// Tworzymy klienta Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// Nazwy tabel
const TASKS_TABLE = 'tasks';
const NOTES_TABLE = 'notes';

// Funkcja do sprawdzenia i utworzenia tabeli tasks jeśli nie istnieje
export const ensureTasksTableExists = async (): Promise<void> => {
  try {
    // Sprawdź czy tabela tasks istnieje
    const { error } = await supabase.from(TASKS_TABLE).select('count').limit(1);
    
    if (error && error.code === '42P01') { // Kod błędu dla "relation does not exist"
      console.log('Tabela tasks nie istnieje. Tworzenie tabeli...');
      
      // Utwórz tabelę tasks
      const { error: createError } = await supabase.rpc('create_table_if_not_exists', {
        table_name: TASKS_TABLE,
        table_definition: `
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          notes TEXT[] NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          category TEXT NOT NULL,
          due_date TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        `
      });
      
      if (createError) {
        console.error('Błąd podczas tworzenia tabeli tasks:', createError);
        
        // Alternatywna metoda - użyj SQL bezpośrednio
        console.log('Próba utworzenia tabeli tasks za pomocą SQL...');
        
        // Sprawdź czy funkcja execute_sql istnieje
        try {
          await supabase.rpc('execute_sql', {
            sql: `
              CREATE TABLE IF NOT EXISTS ${TASKS_TABLE} (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                notes TEXT[] NOT NULL,
                completed BOOLEAN NOT NULL DEFAULT FALSE,
                category TEXT NOT NULL,
                due_date TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
              );
            `
          });
          console.log('Tabela tasks została utworzona pomyślnie.');
        } catch (sqlError) {
          console.error('Nie można utworzyć tabeli tasks:', sqlError);
          console.log('Uwaga: Aplikacja może nie działać poprawnie bez tabeli tasks.');
        }
      } else {
        console.log('Tabela tasks została utworzona pomyślnie.');
      }
    } else if (error) {
      console.error('Błąd podczas sprawdzania tabeli tasks:', error);
    } else {
      console.log('Tabela tasks istnieje.');
    }
  } catch (err) {
    console.error('Nieoczekiwany błąd podczas sprawdzania/tworzenia tabeli tasks:', err);
  }
};

// Funkcja do sprawdzenia i utworzenia tabeli notes jeśli nie istnieje
export const ensureNotesTableExists = async (): Promise<void> => {
  try {
    // Sprawdź czy tabela notes istnieje
    const { error } = await supabase.from(NOTES_TABLE).select('count').limit(1);
    
    if (error && error.code === '42P01') { // Kod błędu dla "relation does not exist"
      console.log('Tabela notes nie istnieje. Tworzenie tabeli...');
      
      // Utwórz tabelę notes
      const { error: createError } = await supabase.rpc('create_table_if_not_exists', {
        table_name: NOTES_TABLE,
        table_definition: `
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        `
      });
      
      if (createError) {
        console.error('Błąd podczas tworzenia tabeli notes:', createError);
        
        // Alternatywna metoda - użyj SQL bezpośrednio
        console.log('Próba utworzenia tabeli notes za pomocą SQL...');
        
        try {
          await supabase.rpc('execute_sql', {
            sql: `
              CREATE TABLE IF NOT EXISTS ${NOTES_TABLE} (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
              );
            `
          });
          console.log('Tabela notes została utworzona pomyślnie.');
        } catch (sqlError) {
          console.error('Nie można utworzyć tabeli notes:', sqlError);
          console.log('Uwaga: Aplikacja może nie działać poprawnie bez tabeli notes.');
        }
      } else {
        console.log('Tabela notes została utworzona pomyślnie.');
      }
    } else if (error) {
      console.error('Błąd podczas sprawdzania tabeli notes:', error);
    } else {
      console.log('Tabela notes istnieje.');
    }
  } catch (err) {
    console.error('Nieoczekiwany błąd podczas sprawdzania/tworzenia tabeli notes:', err);
  }
};

// Sprawdź i utwórz tabele przy inicjalizacji
(async () => {
  try {
    await ensureTasksTableExists();
    await ensureNotesTableExists();
    console.log('Inicjalizacja tabel Supabase zakończona.');
  } catch (err) {
    console.error('Błąd podczas inicjalizacji tabel Supabase:', err);
  }
})();

/**
 * Funkcja do konwersji daty z formatu Supabase do JavaScript Date
 */
const convertDates = (task: any): Task => {
  return {
    ...task,
    createdAt: task.created_at ? new Date(task.created_at) : new Date(),
    dueDate: task.due_date ? new Date(task.due_date) : null,
  };
};

/**
 * Funkcja do konwersji daty z JavaScript Date do formatu Supabase
 */
const convertTaskForStorage = (task: InsertTask | UpdateTask) => {
  const convertedTask: any = { ...task };
  
  // Usuwamy pola, które są obsługiwane automatycznie
  delete convertedTask.createdAt;
  
  // Konwertujemy dueDate do formatu dla Supabase
  if (task.dueDate !== undefined) {
    convertedTask.due_date = task.dueDate;
    delete convertedTask.dueDate;
  }
  
  return convertedTask;
};

/**
 * Pobierz wszystkie zadania z Supabase
 */
export const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Błąd podczas pobierania zadań:', error);
    throw new Error(`Błąd podczas pobierania zadań: ${error.message}`);
  }
  
  return (data || []).map(convertDates);
};

/**
 * Dodaj nowe zadanie do Supabase
 */
export const addTask = async (task: InsertTask): Promise<Task> => {
  const convertedTask = convertTaskForStorage(task);
  
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .insert(convertedTask)
    .select()
    .single();
  
  if (error) {
    console.error('Błąd podczas dodawania zadania:', error);
    throw new Error(`Błąd podczas dodawania zadania: ${error.message}`);
  }
  
  return convertDates(data);
};

/**
 * Aktualizuj zadanie w Supabase
 */
export const updateTask = async (id: string, updates: UpdateTask): Promise<Task> => {
  const convertedUpdates = convertTaskForStorage(updates);
  
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .update(convertedUpdates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error(`Błąd podczas aktualizacji zadania ${id}:`, error);
    throw new Error(`Błąd podczas aktualizacji zadania: ${error.message}`);
  }
  
  return convertDates(data);
};

/**
 * Usuń zadanie z Supabase
 */
export const deleteTask = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from(TASKS_TABLE)
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`Błąd podczas usuwania zadania ${id}:`, error);
    throw new Error(`Błąd podczas usuwania zadania: ${error.message}`);
  }
  
  return true;
};

/**
 * Przełącz status ukończenia zadania
 */
export const toggleTaskCompletion = async (id: string): Promise<Task> => {
  // Najpierw pobieramy aktualne zadanie, aby znać jego status
  const { data: currentTask, error: fetchError } = await supabase
    .from(TASKS_TABLE)
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError) {
    console.error(`Błąd podczas pobierania zadania ${id}:`, fetchError);
    throw new Error(`Błąd podczas przełączania statusu zadania: ${fetchError.message}`);
  }
  
  // Następnie aktualizujemy status
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .update({ completed: !currentTask.completed })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error(`Błąd podczas przełączania statusu zadania ${id}:`, error);
    throw new Error(`Błąd podczas przełączania statusu zadania: ${error.message}`);
  }
  
  return convertDates(data);
};
