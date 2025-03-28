import { createClient } from '@supabase/supabase-js';
import { Task, InsertTask, UpdateTask } from '@shared/schema';

// Pobieramy dane uwierzytelniające z zmiennych środowiskowych
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

// Sprawdzenie, czy zmienne środowiskowe zostały ustawione
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Brak wymaganych zmiennych środowiskowych SUPABASE_URL i SUPABASE_API_KEY');
}

// Tworzymy klienta Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);

// Nazwa tabeli z zadaniami
const TASKS_TABLE = 'tasks';

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