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
  notes: Array.isArray(task.notes) ? task.notes : [],
  // Jeśli mamy id_category, użyj go jako głównego identyfikatora kategorii
  // Zachowaj również pole category dla kompatybilności wstecznej
  category: task.category || (task.id_category !== undefined ? String(task.id_category) : null),
  id_category: task.id_category
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
      const { id, title, category, id_category, notes, completed, dueDate } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Brak wymaganego tytułu zadania' });
      }
      
      // Przygotuj dane zadania bez ID - pozwól bazie danych wygenerować ID
      const newTask = {
        title,
        notes: notes || [],
        completed: completed || false,
        due_date: dueDate || null,
        created_at: new Date().toISOString()
      };
      
      // Obsługa kategorii - priorytetowo używamy id_category
      if (id_category !== undefined) {
        // Jeśli id_category jest stringiem, spróbuj przekonwertować na liczbę
        if (typeof id_category === 'string' && id_category !== '') {
          try {
            newTask.id_category = parseInt(id_category, 10);
            console.log(`Dodawanie zadania z id_category (przekonwertowaną na liczbę): ${newTask.id_category}`);
          } catch (e) {
            // Jeśli konwersja się nie powiedzie, użyj oryginalnej wartości
            newTask.id_category = id_category;
            console.log(`Dodawanie zadania z id_category (oryginalna wartość): ${newTask.id_category}`);
          }
        } else {
          // Jeśli to już liczba lub null, użyj bezpośrednio
          newTask.id_category = id_category;
          console.log(`Dodawanie zadania z id_category: ${newTask.id_category}`);
        }
      } else if (category !== undefined) {
        // Dla kompatybilności wstecznej - jeśli mamy tylko pole category, spróbujmy znaleźć odpowiednie id_category
        console.log(`Próba znalezienia id_category dla kategorii: ${category}`);
        
        // Zachowaj również oryginalną nazwę kategorii dla kompatybilności
        newTask.category = category;
        
        try {
          // Sprawdź, czy kategoria jest liczbą
          if (typeof category === 'number') {
            // Jeśli to liczba, użyj jej jako id_category
            newTask.id_category = category;
            console.log(`Użycie liczby jako id_category: ${newTask.id_category}`);
          } else if (typeof category === 'string' && !isNaN(Number(category))) {
            // Jeśli to string, który można przekonwertować na liczbę, użyj go jako id_category
            newTask.id_category = Number(category);
            console.log(`Konwersja stringa na id_category: ${newTask.id_category}`);
          } else if (typeof category === 'string' && category.trim() !== '') {
            // Jeśli to string, który nie jest liczbą, spróbuj znaleźć kategorię w bazie danych
            const { data: categoryData, error: categoryError } = await supabase
              .from('categories')
              .select('id')
              .eq('name', category)
              .limit(1);
              
            if (categoryError) {
              console.error('Błąd podczas wyszukiwania kategorii:', categoryError);
            } else if (categoryData && categoryData.length > 0) {
              // Jeśli znaleziono kategorię, użyj jej id
              newTask.id_category = categoryData[0].id;
              console.log(`Znaleziono id_category ${newTask.id_category} dla kategorii "${category}"`);
            } else {
              // Jeśli nie znaleziono kategorii, utwórz nową
              console.log(`Nie znaleziono kategorii "${category}". Tworzenie nowej...`);
              const { data: newCategory, error: newCategoryError } = await supabase
                .from('categories')
                .insert({ name: category })
                .select();
                
              if (newCategoryError) {
                console.error('Błąd podczas tworzenia nowej kategorii:', newCategoryError);
              } else if (newCategory && newCategory.length > 0) {
                // Jeśli utworzono nową kategorię, użyj jej id
                newTask.id_category = newCategory[0].id;
                console.log(`Utworzono nową kategorię z id ${newTask.id_category}`);
              }
            }
          }
        } catch (e) {
          console.error('Błąd podczas przetwarzania kategorii:', e);
        }
      }
      
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
      const allowedFields = ['title', 'notes', 'completed'];
      
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
      
      // Obsługa kategorii - priorytetowo używamy id_category
      if (req.body.id_category !== undefined) {
        // Jeśli id_category jest stringiem, spróbuj przekonwertować na liczbę
        if (typeof req.body.id_category === 'string' && req.body.id_category !== '') {
          try {
            updateData.id_category = parseInt(req.body.id_category, 10);
            console.log(`Aktualizacja zadania z id_category (przekonwertowaną na liczbę): ${updateData.id_category}`);
          } catch (e) {
            // Jeśli konwersja się nie powiedzie, użyj oryginalnej wartości
            updateData.id_category = req.body.id_category;
            console.log(`Aktualizacja zadania z id_category (oryginalna wartość): ${updateData.id_category}`);
          }
        } else {
          // Jeśli to już liczba lub null, użyj bezpośrednio
          updateData.id_category = req.body.id_category;
          console.log(`Aktualizacja zadania z id_category: ${updateData.id_category}`);
        }
      } else if (req.body.category !== undefined) {
        // Dla kompatybilności wstecznej - jeśli mamy tylko pole category, spróbujmy znaleźć odpowiednie id_category
        console.log(`Próba znalezienia id_category dla kategorii: ${req.body.category}`);
        
        // Zachowaj również oryginalną nazwę kategorii dla kompatybilności
        updateData.category = req.body.category;
        
        try {
          // Sprawdź, czy kategoria jest liczbą
          if (typeof req.body.category === 'number') {
            // Jeśli to liczba, użyj jej jako id_category
            updateData.id_category = req.body.category;
            console.log(`Użycie liczby jako id_category: ${updateData.id_category}`);
          } else if (typeof req.body.category === 'string' && !isNaN(Number(req.body.category))) {
            // Jeśli to string, który można przekonwertować na liczbę, użyj go jako id_category
            updateData.id_category = Number(req.body.category);
            console.log(`Konwersja stringa na id_category: ${updateData.id_category}`);
          } else if (typeof req.body.category === 'string' && req.body.category.trim() !== '') {
            // Jeśli to string, który nie jest liczbą, spróbuj znaleźć kategorię w bazie danych
            const { data: categoryData, error: categoryError } = await supabase
              .from('categories')
              .select('id')
              .eq('name', req.body.category)
              .limit(1);
              
            if (categoryError) {
              console.error('Błąd podczas wyszukiwania kategorii:', categoryError);
            } else if (categoryData && categoryData.length > 0) {
              // Jeśli znaleziono kategorię, użyj jej id
              updateData.id_category = categoryData[0].id;
              console.log(`Znaleziono id_category ${updateData.id_category} dla kategorii "${req.body.category}"`);
            } else {
              // Jeśli nie znaleziono kategorii, utwórz nową
              console.log(`Nie znaleziono kategorii "${req.body.category}". Tworzenie nowej...`);
              const { data: newCategory, error: newCategoryError } = await supabase
                .from('categories')
                .insert({ name: req.body.category })
                .select();
                
              if (newCategoryError) {
                console.error('Błąd podczas tworzenia nowej kategorii:', newCategoryError);
              } else if (newCategory && newCategory.length > 0) {
                // Jeśli utworzono nową kategorię, użyj jej id
                updateData.id_category = newCategory[0].id;
                console.log(`Utworzono nową kategorię z id ${updateData.id_category}`);
              }
            }
          }
        } catch (e) {
          console.error('Błąd podczas przetwarzania kategorii:', e);
        }
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
