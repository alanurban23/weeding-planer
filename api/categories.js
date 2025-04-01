import { createClient } from '@supabase/supabase-js';

// Inicjalizacja klienta Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
      
      // Sprawdzenie, czy żądanie dotyczy konkretnej kategorii po ID
      const categoryId = req.url.match(/\/api\/categories\/(\d+)/)?.[1];
      
      if (categoryId) {
        console.log(`Pobieranie kategorii o ID: ${categoryId}`);
        
        // Próba pobrania konkretnej kategorii z tabeli categories
        let { data: category, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', categoryId)
          .single();
          
        if (categoryError) {
          console.error(`Błąd pobierania kategorii o ID ${categoryId}:`, categoryError);
          return res.status(404).json({ error: 'Nie znaleziono kategorii' });
        }
        
        if (category) {
          return res.status(200).json(category);
        }
        
        // Jeśli nie znaleziono kategorii w tabeli categories, szukamy w tasks i notes
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('category, id_category')
          .eq('id_category', categoryId);
          
        if (tasksError) {
          console.error(`Błąd pobierania zadań dla kategorii ${categoryId}:`, tasksError);
        }
        
        const { data: notes, error: notesError } = await supabase
          .from('notes')
          .select('category, id_category')
          .eq('id_category', categoryId);
          
        if (notesError) {
          console.error(`Błąd pobierania notatek dla kategorii ${categoryId}:`, notesError);
        }
        
        // Jeśli znaleziono zadania lub notatki z tą kategorią, zwracamy informacje o kategorii
        if ((tasks && tasks.length > 0) || (notes && notes.length > 0)) {
          const categoryName = tasks?.[0]?.category || notes?.[0]?.category || `Kategoria ${categoryId}`;
          return res.status(200).json({
            id: parseInt(categoryId, 10),
            name: categoryName,
            parent_id: null
          });
        }
        
        return res.status(404).json({ error: 'Nie znaleziono kategorii' });
      }
      
      // Próba pobrania kategorii z tabeli categories
      let { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('id');
        
      if (categoriesError) {
        console.error('Błąd pobierania kategorii z tabeli categories:', categoriesError);
        
        // Jeśli nie możemy pobrać kategorii z tabeli categories, pobieramy je z tasks i notes
        console.log('Pobieranie kategorii z tabeli tasks...');
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('category, id_category');
          
        if (tasksError) {
          console.error('Błąd pobierania kategorii z tasks:', tasksError);
        }
        
        console.log('Pobieranie kategorii z tabeli notes...');
        const { data: notes, error: notesError } = await supabase
          .from('notes')
          .select('category, id_category');
          
        if (notesError) {
          console.error('Błąd pobierania kategorii z notes:', notesError);
        }
        
        // Zbieramy wszystkie unikalne kategorie
        const categoryMap = new Map();
        
        // Dodajemy kategorie z tasks
        if (tasks) {
          tasks.forEach(task => {
            if (task.id_category) {
              // Jeśli mamy id_category, używamy go (upewniamy się, że to liczba)
              const numericId = typeof task.id_category === 'string' ? 
                parseInt(task.id_category, 10) : task.id_category;
              
              if (!isNaN(numericId) && !categoryMap.has(numericId)) {
                categoryMap.set(numericId, {
                  id: numericId,
                  name: task.category || `Kategoria ${numericId}`,
                  parent_id: null
                });
              }
            } else if (task.category) {
              // Jeśli mamy tylko category, generujemy id na podstawie nazwy
              const id = categoryMap.size + 1;
              if (!categoryMap.has(id)) {
                categoryMap.set(id, {
                  id: id,
                  name: task.category,
                  parent_id: null
                });
              }
            }
          });
        }
        
        // Dodajemy kategorie z notes
        if (notes) {
          notes.forEach(note => {
            if (note.id_category) {
              // Jeśli mamy id_category, używamy go (upewniamy się, że to liczba)
              const numericId = typeof note.id_category === 'string' ? 
                parseInt(note.id_category, 10) : note.id_category;
              
              if (!isNaN(numericId) && !categoryMap.has(numericId)) {
                categoryMap.set(numericId, {
                  id: numericId,
                  name: note.category || `Kategoria ${numericId}`,
                  parent_id: null
                });
              }
            } else if (note.category) {
              // Jeśli mamy tylko category, generujemy id na podstawie nazwy
              const id = categoryMap.size + 1;
              if (!categoryMap.has(id)) {
                categoryMap.set(id, {
                  id: id,
                  name: note.category,
                  parent_id: null
                });
              }
            }
          });
        }
        
        // Konwertujemy mapę na tablicę
        categories = Array.from(categoryMap.values());
        console.log('Pobrane kategorie z tasks i notes:', categories);
      } else {
        console.log('Pobrane kategorie z tabeli categories:', categories);
        
        // Upewnij się, że kategorie mają poprawne numeryczne ID
        categories = categories.map(category => ({
          id: typeof category.id === 'string' ? parseInt(category.id, 10) : category.id,
          name: category.name,
          parent_id: category.parent_id
        }));
      }
      
      // Zwracamy płaską tablicę kategorii
      return res.status(200).json(categories);
    }
    
    // Dodawanie nowej kategorii
    if (req.method === 'POST') {
      console.log('Otrzymano żądanie POST dla /api/categories');
      const { name, parent_id } = req.body;
      
      console.log('Próba dodania kategorii:', name, parent_id ? `z rodzicem: ${parent_id}` : 'bez rodzica');
      
      if (!name) {
        return res.status(400).json({ error: 'Nazwa kategorii jest wymagana' });
      }
      
      // Przygotowanie danych kategorii
      const categoryData = { name };
      
      // Dodanie parent_id, jeśli został podany
      if (parent_id) {
        categoryData.parent_id = parent_id;
      }
      
      // Próba dodania kategorii do tabeli categories
      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select();
        
      if (error) {
        console.error('Błąd dodawania kategorii do tabeli categories:', error);
        
        // Jeśli nie możemy dodać kategorii do tabeli categories, zwracamy błąd
        return res.status(500).json({ 
          error: 'Nie można dodać kategorii do bazy danych. Sprawdź uprawnienia.',
          details: error.message
        });
      }
      
      console.log('Dodano kategorię:', data);
      return res.status(201).json(data[0]);
    }
    
    // Usuwanie kategorii
    if (req.method === 'DELETE') {
      console.log('Otrzymano żądanie DELETE dla /api/categories');
      console.log('URL:', req.url);
      console.log('Query params:', req.query);
      
      // Próba pobrania ID z query params
      let id = req.query.id;
      
      // Jeśli ID nie jest w query params, spróbuj wyodrębnić z URL path
      if (!id) {
        // Sprawdź, czy URL zawiera ID kategorii (np. /api/categories/39)
        const pathMatch = req.url.match(/\/api\/categories\/(\d+)/);
        if (pathMatch && pathMatch[1]) {
          id = pathMatch[1];
          console.log(`Wyodrębnione ID z URL path: ${id}`);
        }
      }
      
      // Sprawdź, czy mamy ID w req.url jako ostatni segment
      if (!id) {
        const urlParts = req.url.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && /^\d+$/.test(lastPart)) {
          id = lastPart;
          console.log(`Wyodrębnione ID z ostatniego segmentu URL: ${id}`);
        }
      }
      
      console.log('Finalne ID kategorii:', id);
      
      if (!id) {
        return res.status(400).json({ error: 'ID kategorii jest wymagane' });
      }
      
      console.log(`Próba usunięcia kategorii o ID: ${id}`);
      
      // Próba usunięcia kategorii z tabeli categories
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Błąd usuwania kategorii:', error);
        
        // Jeśli nie możemy usunąć kategorii z tabeli categories, zwracamy błąd
        return res.status(500).json({ 
          error: 'Nie można usunąć kategorii z bazy danych. Sprawdź uprawnienia.',
          details: error.message
        });
      }
      
      console.log(`Usunięto kategorię o ID: ${id}`);
      return res.status(200).json({ message: 'Kategoria została usunięta' });
    }
    
    return res.status(405).json({ error: 'Metoda nie jest dozwolona' });
  } catch (error) {
    console.error('Wyjątek podczas obsługi żądania:', error);
    return res.status(500).json({ error: 'Błąd serwera', details: error.message });
  }
}
