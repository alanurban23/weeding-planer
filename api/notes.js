// Bezpośredni dostęp do Supabase - bez API
import { createClient } from '@supabase/supabase-js';

// Inicjalizacja klienta Supabase z opcjami, które całkowicie wyłączają walidację schematu
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Supabase-No-Schema-Validation': 'true'
      }
    }
  }
);

// Funkcje do bezpośredniej pracy z notatkami
export async function getNotes(category = null, id_category = null) {
  try {
    console.log('Pobieranie notatek bezpośrednio z Supabase', 
      id_category ? `dla id_category: ${id_category} (typ: ${typeof id_category})` : 
      category ? `dla kategorii: ${category}` : '');
    
    // Pobierz wszystkie notatki bez filtrowania
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Błąd pobierania notatek:', error);
      throw error;
    }
    
    console.log(`Pobrano ${data.length} notatek z bazy danych`);
    
    // Wyświetl szczegółowe informacje o wszystkich notatkach
    console.log('Wszystkie notatki:');
    data.forEach(note => {
      console.log(`Notatka ID ${note.id}: id_category = ${note.id_category}, content = ${note.content}`);
    });
    
    // Filtrowanie po stronie serwera
    let filteredData = data;
    
    // Filtrowanie po id_category
    if (id_category !== null && id_category !== undefined && id_category !== '') {
      console.log(`Filtrowanie notatek dla id_category: ${id_category} (typ: ${typeof id_category})`);
      
      // Konwertuj id_category na liczbę, jeśli to string
      let categoryIdNum;
      if (typeof id_category === 'string') {
        categoryIdNum = parseInt(id_category, 10);
        console.log(`Przekonwertowano id_category ze stringa na liczbę: ${categoryIdNum}`);
      } else {
        categoryIdNum = id_category;
      }
      
      // Filtruj notatki - używamy loose comparison (==) zamiast strict (===)
      // aby obsłużyć różne typy danych (string vs number)
      filteredData = data.filter(note => {
        // Konwertuj id_category notatki na string dla porównania
        const noteIdCategoryStr = String(note.id_category);
        const categoryIdStr = String(categoryIdNum);
        
        const matches = noteIdCategoryStr === categoryIdStr;
        console.log(`Notatka ID ${note.id}: Porównanie ${noteIdCategoryStr} === ${categoryIdStr} = ${matches}`);
        
        return matches;
      });
      
      console.log(`Znaleziono ${filteredData.length} notatek dla id_category ${id_category}`);
    }
    else if (category === '') {
      console.log('Filtrowanie notatek bez kategorii');
      
      // Filtruj notatki bez kategorii (id_category jest null)
      filteredData = data.filter(note => note.id_category === null);
      
      console.log(`Znaleziono ${filteredData.length} notatek bez kategorii`);
    }
    else if (category && category !== '') {
      console.log(`Filtrowanie notatek dla kategorii: ${category} (typ: ${typeof category})`);
      
      // Konwertuj kategorię na liczbę, jeśli to możliwe
      const categoryId = parseInt(category, 10);
      
      // Filtruj notatki dla konkretnej kategorii
      filteredData = data.filter(note => {
        const matchesCategory = note.category == category || note.category == categoryId;
        return matchesCategory;
      });
      
      console.log(`Znaleziono ${filteredData.length} notatek dla kategorii ${category}`);
    }
    
    return filteredData || [];
  } catch (error) {
    console.error('Wyjątek podczas pobierania notatek:', error);
    throw error;
  }
}

// Funkcja do sprawdzenia struktury tabeli
async function checkTableStructure() {
  try {
    console.log('Sprawdzanie struktury tabeli notes...');
    
    // Pobierz definicję tabeli - alternatywne podejście
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Błąd pobierania danych z tabeli notes:', error);
      return null;
    }
    
    console.log('Przykładowy rekord z tabeli notes:', data);
    
    // Sprawdź kolumny w tabeli
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'notes' });
    
    if (columnsError) {
      console.error('Błąd pobierania kolumn tabeli:', columnsError);
    } else {
      console.log('Kolumny tabeli notes:', columns);
    }
    
    return data;
  } catch (error) {
    console.error('Błąd podczas sprawdzania struktury tabeli:', error);
    return null;
  }
}

export async function addNote(noteData) {
  try {
    console.log('Dodawanie notatki bezpośrednio do Supabase:', JSON.stringify(noteData));
    
    if (!noteData || !noteData.content) {
      console.error('Brak wymaganej treści notatki');
      throw new Error('Brak wymaganej treści notatki');
    }
    
    // Upewnij się, że nie ma pola id w danych
    const { id, title, ...safeNoteData } = noteData;
    
    // Tworzymy nowy obiekt tylko z polami, które chcemy zapisać
    const newNote = {
      content: safeNoteData.content,
      created_at: new Date().toISOString()
    };
    
    // Obsługa kategorii - priorytetowo używamy id_category, jeśli jest dostępne
    if (safeNoteData.hasOwnProperty('id_category') && safeNoteData.id_category !== null && safeNoteData.id_category !== '') {
      // Jeśli id_category jest stringiem, spróbuj przekonwertować na liczbę
      if (typeof safeNoteData.id_category === 'string') {
        try {
          newNote.id_category = parseInt(safeNoteData.id_category, 10);
          console.log(`Dodawanie notatki z id_category (przekonwertowaną na liczbę): ${newNote.id_category}`);
        } catch (e) {
          // Jeśli konwersja się nie powiedzie, użyj oryginalnej wartości
          newNote.id_category = safeNoteData.id_category;
          console.log(`Dodawanie notatki z id_category (oryginalna wartość): ${newNote.id_category}`);
        }
      } else {
        // Jeśli to już liczba, użyj bezpośrednio
        newNote.id_category = safeNoteData.id_category;
        console.log(`Dodawanie notatki z id_category: ${newNote.id_category}`);
      }
    } else if (safeNoteData.hasOwnProperty('category')) {
      // Obsługa kategorii - podobnie jak wcześniej
      // ...
    }
    
    console.log('Przygotowane dane notatki:', newNote);
    
    // Dodaj notatkę bezpośrednio przez klienta Supabase
    const { data, error } = await supabase
      .from('notes')
      .insert([newNote])
      .select();
    
    if (error) {
      console.error('Błąd dodawania notatki:', error);
      throw error;
    }
    
    console.log('Notatka dodana pomyślnie:', data);
    return data[0];
  } catch (error) {
    console.error('Wyjątek podczas dodawania notatki:', error);
    throw error;
  }
}

export async function updateNote(id, noteData) {
  try {
    console.log(`Aktualizacja notatki o ID ${id} bezpośrednio w Supabase:`, JSON.stringify(noteData));
    
    if (!id) {
      console.error('Brak ID notatki do aktualizacji');
      throw new Error('Brak ID notatki do aktualizacji');
    }
    
    // Najpierw pobieramy istniejącą notatkę
    const { data: existingNote, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error(`Błąd pobierania notatki o ID ${id}:`, fetchError);
      throw fetchError;
    }
    
    if (!existingNote) {
      console.error(`Nie znaleziono notatki o ID ${id}`);
      throw new Error(`Nie znaleziono notatki o ID ${id}`);
    }
    
    console.log('Istniejąca notatka:', existingNote);
    
    // Upewnij się, że nie ma pola id w danych aktualizacji
    const { id: noteId, title, ...safeNoteData } = noteData;
    
    // Tworzymy obiekt z danymi do aktualizacji
    const updateData = {};
    
    // Aktualizujemy tylko te pola, które zostały przekazane
    if (safeNoteData.hasOwnProperty('content')) {
      updateData.content = safeNoteData.content;
    }
    
    // Obsługa id_category - priorytetowo używamy id_category, jeśli jest dostępne
    if (safeNoteData.hasOwnProperty('id_category')) {
      // Jeśli id_category jest stringiem, spróbuj przekonwertować na liczbę
      if (typeof safeNoteData.id_category === 'string' && safeNoteData.id_category !== '') {
        try {
          updateData.id_category = parseInt(safeNoteData.id_category, 10);
          console.log(`Aktualizacja notatki z id_category (przekonwertowaną na liczbę): ${updateData.id_category}`);
        } catch (e) {
          // Jeśli konwersja się nie powiedzie, użyj oryginalnej wartości
          updateData.id_category = safeNoteData.id_category;
          console.log(`Aktualizacja notatki z id_category (oryginalna wartość): ${updateData.id_category}`);
        }
      } else {
        // Jeśli to już liczba lub null, użyj bezpośrednio
        updateData.id_category = safeNoteData.id_category;
        console.log(`Aktualizacja notatki z id_category: ${updateData.id_category}`);
      }
    } else if (safeNoteData.hasOwnProperty('category')) {
      // Jeśli mamy tylko pole category, spróbujmy znaleźć odpowiednie id_category
      console.log(`Próba znalezienia id_category dla kategorii: ${safeNoteData.category}`);
      
      try {
        // Sprawdź, czy kategoria jest liczbą
        if (typeof safeNoteData.category === 'number') {
          // Jeśli to liczba, użyj jej jako id_category
          updateData.id_category = safeNoteData.category;
          console.log(`Użycie liczby jako id_category: ${updateData.id_category}`);
        } else if (typeof safeNoteData.category === 'string' && !isNaN(Number(safeNoteData.category))) {
          // Jeśli to string, który można przekonwertować na liczbę, użyj go jako id_category
          updateData.id_category = Number(safeNoteData.category);
          console.log(`Konwersja stringa na id_category: ${updateData.id_category}`);
        } else if (typeof safeNoteData.category === 'string' && safeNoteData.category.trim() !== '') {
          // Jeśli to string, który nie jest liczbą, spróbuj znaleźć kategorię w bazie danych
          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('name', safeNoteData.category)
            .limit(1);
            
          if (categoryError) {
            console.error('Błąd podczas wyszukiwania kategorii:', categoryError);
          } else if (categoryData && categoryData.length > 0) {
            // Jeśli znaleziono kategorię, użyj jej id
            updateData.id_category = categoryData[0].id;
            console.log(`Znaleziono id_category ${updateData.id_category} dla kategorii "${safeNoteData.category}"`);
          } else {
            // Jeśli nie znaleziono kategorii, utwórz nową
            console.log(`Nie znaleziono kategorii "${safeNoteData.category}". Tworzenie nowej...`);
            const { data: newCategory, error: newCategoryError } = await supabase
              .from('categories')
              .insert({ name: safeNoteData.category })
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
        // W przypadku błędu, nie ustawiamy id_category
      }
    } else if (existingNote.hasOwnProperty('id_category')) {
      updateData.id_category = existingNote.id_category;
      console.log(`Zachowanie istniejącej kategorii: ${updateData.id_category}`);
    } else {
      updateData.id_category = null;
      console.log('Ustawienie kategorii na null');
    }
    
    // Aktualizujemy notatkę
    const { data, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .select();
      
    if (error) {
      console.error(`Błąd aktualizacji notatki o ID ${id}:`, error);
      throw error;
    }
    
    console.log(`Zaktualizowano notatkę o ID ${id}:`, data);
    return data[0];
  } catch (error) {
    console.error('Błąd podczas aktualizacji notatki:', error);
    throw error;
  }
}

export async function deleteNote(id) {
  try {
    console.log(`Usuwanie notatki ID ${id} bezpośrednio z Supabase`);
    
    if (!id) {
      throw new Error('Brak ID notatki do usunięcia');
    }
    
    const { data, error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Błąd usuwania notatki:', error);
      throw error;
    }
    
    console.log('Notatka usunięta pomyślnie');
    return { success: true };
  } catch (error) {
    console.error('Wyjątek podczas usuwania notatki:', error);
    throw error;
  }
}

// Dla kompatybilności z istniejącym kodem, zachowujemy handler API
// ale używamy bezpośrednich funkcji Supabase
export default async function handler(req, res) {
  // Obsługa CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Pobieranie notatek
    if (req.method === 'GET') {
      console.log('Otrzymano żądanie GET dla /api/notes');
      console.log('Query params:', req.query);
      
      // Pobierz parametry z zapytania
      const { id, category, id_category } = req.query;
      
      console.log(`Parametry zapytania - id: ${id}, category: ${category}, id_category: ${id_category}`);
      console.log(`Typy parametrów - id: ${typeof id}, category: ${typeof category}, id_category: ${typeof id_category}`);
      
      // Jeśli podano ID, pobierz konkretną notatkę
      if (id) {
        console.log(`Pobieranie notatki o ID: ${id}`);
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) {
          console.error('Błąd pobierania notatki:', error);
          return res.status(500).json({ error: 'Błąd pobierania notatki', details: error.message });
        }
        
        return res.status(200).json(data);
      }
      
      // Jeśli podano id_category, pobierz notatki dla tej kategorii bezpośrednio z Supabase
      if (id_category !== undefined) {
        console.log(`Pobieranie notatek dla id_category: ${id_category}`);
        
        // Konwertuj id_category na liczbę
        const categoryId = parseInt(id_category, 10);
        console.log(`Używam id_category jako liczbę: ${categoryId}`);
        
        // Pobierz notatki bezpośrednio z Supabase z filtrowaniem po id_category
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id_category', categoryId)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Błąd pobierania notatek dla kategorii:', error);
          return res.status(500).json({ error: 'Błąd pobierania notatek', details: error.message });
        }
        
        console.log(`Znaleziono ${data.length} notatek dla id_category ${id_category}`);
        return res.status(200).json(data);
      }
      
      // W przeciwnym razie pobierz wszystkie notatki (z filtrowaniem, jeśli podano kategorię)
      try {
        const notes = await getNotes(category, id_category);
        return res.status(200).json(notes);
      } catch (error) {
        console.error('Błąd pobierania notatek:', error);
        return res.status(500).json({ error: 'Błąd pobierania notatek', details: error.message });
      }
    }
    
    // Dodawanie nowej notatki
    if (req.method === 'POST') {
      console.log('Otrzymano żądanie POST dla /api/notes');
      console.log('Dane notatki:', req.body);
      
      if (!req.body || !req.body.content) {
        return res.status(400).json({ error: 'Brak wymaganych danych' });
      }
      
      try {
        // Przygotuj dane notatki
        const noteData = {
          content: req.body.content,
          created_at: new Date().toISOString()
        };
        
        // Dodaj id_category, jeśli istnieje
        if (req.body.id_category !== undefined) {
          noteData.id_category = req.body.id_category;
        } else if (req.body.category !== undefined) {
          noteData.category = req.body.category;
        }
        
        console.log('Przygotowane dane notatki:', noteData);
        
        // Użyj bezpośredniego zapytania HTTP do REST API Supabase
        // Pomijamy całkowicie klienta Supabase i jego cache schematu
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(noteData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Błąd dodawania notatki przez REST API:', errorText);
          return res.status(500).json({ error: 'Błąd dodawania notatki', details: errorText });
        }
        
        const data = await response.json();
        console.log('Notatka dodana pomyślnie:', data);
        return res.status(201).json(data[0]);
      } catch (error) {
        console.error('Wyjątek podczas dodawania notatki:', error);
        return res.status(500).json({ error: 'Błąd dodawania notatki', details: error.message });
      }
    }
    
    // Aktualizacja istniejącej notatki
    if (req.method === 'PUT') {
      console.log('Otrzymano żądanie PUT dla /api/notes');
      
      // Pobierz ID notatki z zapytania
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Brak ID notatki do aktualizacji' });
      }
      
      if (!req.body) {
        return res.status(400).json({ error: 'Brak danych do aktualizacji' });
      }
      
      try {
        // Użyj funkcji updateNote do aktualizacji notatki
        const updatedNote = await updateNote(id, req.body);
        return res.status(200).json(updatedNote);
      } catch (error) {
        console.error('Błąd aktualizacji notatki:', error);
        return res.status(500).json({ error: 'Błąd aktualizacji notatki', details: error.message });
      }
    }
    
    // Usuwanie notatki
    if (req.method === 'DELETE') {
      console.log('Otrzymano żądanie DELETE dla /api/notes');
      
      // Pobierz ID notatki z zapytania
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Brak ID notatki do usunięcia' });
      }
      
      try {
        // Użyj funkcji deleteNote do usunięcia notatki
        await deleteNote(id);
        return res.status(200).json({ success: true, message: 'Notatka została usunięta' });
      } catch (error) {
        console.error('Błąd usuwania notatki:', error);
        return res.status(500).json({ error: 'Błąd usuwania notatki', details: error.message });
      }
    }
    
    // Jeśli metoda nie jest obsługiwana
    return res.status(405).json({ error: 'Metoda nie jest obsługiwana' });
  } catch (error) {
    console.error('Nieoczekiwany błąd w handlerze API:', error);
    return res.status(500).json({ error: 'Nieoczekiwany błąd', details: error.message });
  }
}
