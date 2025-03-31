import { createClient } from '@supabase/supabase-js';

// Inicjalizacja klienta Supabase z kluczem API
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

// Funkcje pomocnicze
const formatTask = (task) => ({
  ...task,
  dueDate: task.due_date,
  notes: Array.isArray(task.notes) ? task.notes : []
});

const getTaskById = async (id) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
    
  return { data, error };
};

export default async (req, res) => {
  try {
    // Sprawdź, czy URL zawiera /toggle na końcu
    if (req.url.endsWith('/toggle')) {
      // Obsługa przełączania stanu ukończenia zadania
      const taskId = req.url.split('/').slice(-2)[0]; // Pobierz ID zadania z URL
      
      // Sprawdź, czy zadanie istnieje
      const { data: existingTask, error: findError } = await getTaskById(taskId);
      
      if (findError || !existingTask) {
        return res.status(404).json({ message: 'Zadanie nie znalezione' });
      }
      
      // Przełącz stan ukończenia zadania
      const { data, error } = await supabase
        .from('tasks')
        .update({ completed: !existingTask.completed })
        .eq('id', taskId)
        .select();
      
      if (error) {
        return res.status(500).json({ error: 'Błąd aktualizacji zadania', details: error.message });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ message: 'Zadanie nie znalezione' });
      }
      
      return res.status(200).json(formatTask(data[0]));
    }
    
    // Obsługa różnych metod HTTP
    if (req.method === 'GET') {
      // Pobieranie zadań
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .not('created_at', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transformacja danych - konwersja due_date na dueDate
      const formattedData = data?.map(formatTask) || [];
      
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(formattedData);
    } 
    else if (req.method === 'POST') {
      // Dodawanie nowego zadania
      const { id, title, category, notes, completed, dueDate } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Brak wymaganego tytułu zadania' });
      }
      
      // Przygotuj dane zadania bez ID - pozwól bazie danych wygenerować ID
      const newTask = {
        title,
        category,
        notes: notes || [],
        completed: completed || false,
        due_date: dueDate || null,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select();
        
      if (error) {
        return res.status(500).json({ error: 'Błąd dodawania zadania', details: error.message });
      }
      
      res.status(201).json(data[0]);
    }
    else if (req.method === 'PATCH') {
      // Aktualizacja istniejącego zadania
      // Pobierz ID zadania z URL
      const taskId = req.url.split('/').pop();
      
      if (!taskId) {
        return res.status(400).json({ error: 'Brak ID zadania' });
      }
      
      // Sprawdź, czy zadanie istnieje
      const { data: existingTask, error: findError } = await getTaskById(taskId);
      
      if (findError || !existingTask) {
        return res.status(404).json({ message: 'Zadanie nie znalezione' });
      }
      
      // Przygotuj dane do aktualizacji
      const updateData = {};
      
      // Pola, które mogą być aktualizowane
      const allowedFields = ['title', 'category', 'notes', 'completed'];
      
      // Dodaj pola z req.body do updateData
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }
      
      // Specjalne traktowanie dla dueDate -> due_date
      if (req.body.dueDate !== undefined) {
        updateData.due_date = req.body.dueDate || null;
      }
      
      // Aktualizuj zadanie
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select();
      
      if (error) {
        return res.status(500).json({ error: 'Błąd aktualizacji zadania', details: error.message });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ message: 'Zadanie nie znalezione' });
      }
      
      res.status(200).json(formatTask(data[0]));
    }
    else if (req.method === 'DELETE') {
      // Usuwanie zadania
      // Pobierz ID zadania z URL
      const urlParts = req.url.split('/');
      const taskId = urlParts[urlParts.length - 1];
      
      if (!taskId) {
        return res.status(400).json({ error: 'Brak ID zadania' });
      }
      
      // Sprawdź, czy zadanie istnieje
      const { data: existingTask, error: findError } = await getTaskById(taskId);
      
      if (findError || !existingTask) {
        return res.status(404).json({ message: 'Zadanie nie znalezione' });
      }
      
      // Usuń zadanie
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) {
        return res.status(500).json({ error: 'Błąd usuwania zadania', details: error.message });
      }
      
      res.status(200).json({ message: 'Zadanie zostało pomyślnie usunięte' });
    }
    else {
      // Nieobsługiwana metoda HTTP
      res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
      res.status(405).json({ error: `Metoda ${req.method} nie jest obsługiwana` });
    }
  } catch (error) {
    console.error('Tasks API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
