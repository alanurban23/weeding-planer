import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async (req, res) => {
  try {
    // Obsługa różnych metod HTTP
    if (req.method === 'GET') {
      // Pobieranie zadań
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .not('created_at', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(data);
    } 
    else if (req.method === 'POST') {
      // Dodawanie nowego zadania
      const { id, title, category, notes, completed, dueDate } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Brak wymaganego tytułu zadania' });
      }
      
      const newTask = {
        id,
        title,
        category,
        notes: notes || [],
        completed: completed || false,
        due_date: dueDate,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select();
        
      if (error) {
        console.error('Błąd dodawania zadania:', error);
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
      const { data: existingTask, error: findError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (findError || !existingTask) {
        console.error('Zadanie nie znalezione:', taskId);
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
        updateData.due_date = req.body.dueDate;
      }
      
      // Aktualizuj zadanie
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select();
      
      if (error) {
        console.error('Błąd aktualizacji zadania:', error);
        return res.status(500).json({ error: 'Błąd aktualizacji zadania', details: error.message });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ message: 'Zadanie nie znalezione' });
      }
      
      res.status(200).json(data[0]);
    }
    else {
      // Nieobsługiwana metoda HTTP
      res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
      res.status(405).json({ error: `Metoda ${req.method} nie jest obsługiwana` });
    }
  } catch (error) {
    console.error('Tasks API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
