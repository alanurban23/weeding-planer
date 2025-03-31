import { createClient } from '@supabase/supabase-js';

// Inicjalizacja klienta Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Przechowujemy dodane kategorie w pamięci, dopóki nie zostaną użyte w zadaniach
let addedCategories = [];

export default async function handler(req, res) {
  // Obsługa CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Pobieranie kategorii
    if (req.method === 'GET') {
      console.log('Otrzymano żądanie GET dla /api/categories');
      
      // Pobieramy unikalne kategorie z tabeli tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('category');

      if (tasksError) {
        console.error('Błąd pobierania zadań:', tasksError);
        throw tasksError;
      }
      
      console.log('Pobrane zadania:', tasks);
      
      // Wyodrębniamy unikalne kategorie z zadań
      const categoriesFromTasks = Array.from(
        new Set(tasks.map(task => task.category).filter(Boolean))
      );
      
      console.log('Unikalne kategorie z zadań:', categoriesFromTasks);
      console.log('Dodane kategorie w pamięci:', addedCategories);
      
      // Łączymy kategorie z zadań i dodane kategorie
      const allCategoryNames = [...new Set([...categoriesFromTasks, ...addedCategories])];
      
      console.log('Wszystkie unikalne nazwy kategorii:', allCategoryNames);
      
      // Formatujemy kategorie jako obiekty
      const formattedCategories = allCategoryNames.map(category => ({
        id: category, // Używamy nazwy kategorii jako ID
        name: category
      }));
      
      console.log('Sformatowane kategorie do zwrócenia:', formattedCategories);
      return res.status(200).json(formattedCategories);
    }
    
    // Dodawanie nowej kategorii
    if (req.method === 'POST') {
      console.log('Otrzymano żądanie POST dla /api/categories');
      const { name } = req.body;
      
      console.log('Próba dodania kategorii:', name);
      
      if (!name) {
        return res.status(400).json({ error: 'Nazwa kategorii jest wymagana' });
      }
      
      // Sprawdzamy, czy kategoria już istnieje w zadaniach
      const { data: existingTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('category')
        .eq('category', name);
        
      if (tasksError) {
        console.error('Błąd sprawdzania istniejących zadań:', tasksError);
        throw tasksError;
      }
      
      // Jeśli kategoria nie jest używana w żadnym zadaniu, dodajemy ją do pamięci
      if (!existingTasks || existingTasks.length === 0) {
        if (!addedCategories.includes(name)) {
          addedCategories.push(name);
          console.log('Dodano nową kategorię do pamięci:', name);
          console.log('Aktualne kategorie w pamięci:', addedCategories);
        }
      }
      
      // Zwracamy nową kategorię
      const result = { id: name, name };
      console.log('Zwracam nową kategorię:', result);
      return res.status(201).json(result);
    }
    
    // Usuwanie kategorii
    if (req.method === 'DELETE') {
      console.log('Otrzymano żądanie DELETE dla /api/categories');
      console.log('Query params:', req.query);
      console.log('URL:', req.url);
      
      // Wyciągamy id z URL (format: /api/categories/:id)
      const urlParts = req.url.split('/');
      const encodedId = urlParts[urlParts.length - 1];
      const id = decodeURIComponent(encodedId);
      
      console.log('Zakodowane ID:', encodedId);
      console.log('Odkodowane ID:', id);
      
      if (!id || id === 'categories') {
        return res.status(400).json({ error: 'ID kategorii jest wymagane' });
      }
      
      // Usuwamy kategorię z pamięci, jeśli tam jest
      addedCategories = addedCategories.filter(cat => cat !== id);
      console.log('Kategorie w pamięci po usunięciu:', addedCategories);
      
      // Usuwanie kategorii polega na usunięciu kategorii z zadań
      const { error } = await supabase
        .from('tasks')
        .update({ category: null })
        .eq('category', id);
        
      if (error) {
        console.error('Błąd usuwania kategorii:', error);
        throw error;
      }
      console.log('Kategoria została usunięta');
      return res.status(200).json({ message: 'Kategoria została usunięta' });
    }
    
    // Nieobsługiwana metoda
    return res.status(405).json({ error: 'Metoda nie jest obsługiwana' });
  } catch (error) {
    console.error('Błąd API kategorii:', error);
    return res.status(500).json({ error: error.message });
  }
}
