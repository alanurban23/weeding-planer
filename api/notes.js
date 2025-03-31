// Bezpośredni dostęp do Supabase - bez API
import { createClient } from '@supabase/supabase-js';

// Inicjalizacja klienta Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Funkcje do bezpośredniej pracy z notatkami
export async function getNotes(category = null) {
  try {
    console.log('Pobieranie notatek bezpośrednio z Supabase', category ? `dla kategorii: ${category}` : '');
    
    let query = supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Jeśli podano kategorię, filtruj po niej
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Błąd pobierania notatek:', error);
      throw error;
    }
    
    return data || [];
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
    const { id, ...safeNoteData } = noteData;
    
    // Tworzymy nowy obiekt tylko z polami, które chcemy zapisać
    const newNote = {
      content: safeNoteData.content,
      created_at: new Date().toISOString(),
      title: 'Notatka' // Dodajemy domyślny tytuł, który jest wymagany przez schemat
    };
    
    // Dodaj kategorię, jeśli została podana
    if (safeNoteData.category) {
      newNote.category = safeNoteData.category;
    }
    
    console.log('Przygotowane dane notatki (bez id):', JSON.stringify(newNote));
    
    // Najprostsze podejście do dodawania notatki
    const { error } = await supabase
      .from('notes')
      .insert(newNote);
    
    if (error) {
      console.error('Błąd dodawania notatki:', error);
      throw error;
    }
    
    console.log('Notatka dodana pomyślnie');
    return { success: true };
  } catch (error) {
    console.error('Wyjątek podczas dodawania notatki:', error);
    throw error;
  }
}

export async function updateNote(id, noteData) {
  try {
    console.log(`Aktualizacja notatki ID ${id} bezpośrednio w Supabase:`, JSON.stringify(noteData));
    
    if (!id) {
      throw new Error('Brak ID notatki do aktualizacji');
    }
    
    if (!noteData || !noteData.content) {
      throw new Error('Brak wymaganej treści notatki');
    }
    
    // Upewnij się, że nie próbujemy zmienić ID
    const { id: noteId, ...dataWithoutId } = noteData;
    
    const { data, error } = await supabase
      .from('notes')
      .update(dataWithoutId)
      .eq('id', id);
    
    if (error) {
      console.error('Błąd aktualizacji notatki:', error);
      throw error;
    }
    
    console.log('Notatka zaktualizowana pomyślnie');
    return data || { success: true };
  } catch (error) {
    console.error('Wyjątek podczas aktualizacji notatki:', error);
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
  // Ustawienie nagłówków CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    if (req.method === 'GET') {
      // Sprawdź, czy mamy parametr kategorii
      const category = req.query.category;
      const notes = await getNotes(category);
      return res.status(200).json(notes);
    } 
    else if (req.method === 'POST') {
      try {
        console.log('Przetwarzanie POST /api/notes');
        console.log('Typ req.body:', typeof req.body);
        console.log('Zawartość req.body:', JSON.stringify(req.body));
        
        // Sprawdź, czy mamy wymaganą treść
        if (!req.body || !req.body.content) {
          console.error('Brak wymaganej treści notatki');
          return res.status(400).json({ error: 'Brak wymaganej treści notatki' });
        }
        
        // Upewnij się, że nie ma pola id w danych
        const { id, ...safeData } = req.body;
        
        // Tworzymy nowy obiekt tylko z polami, które chcemy zapisać
        const newNote = {
          content: safeData.content,
          created_at: new Date().toISOString(),
          title: 'Notatka' // Dodajemy domyślny tytuł, który jest wymagany przez schemat
        };
        
        // Dodaj kategorię, jeśli została podana
        if (safeData.category) {
          newNote.category = safeData.category;
        }
        
        console.log('Przygotowane dane notatki (bez id):', JSON.stringify(newNote));
        
        // Dodaj notatkę bezpośrednio
        const { data, error } = await supabase
          .from('notes')
          .insert(newNote);
        
        if (error) {
          console.error('Błąd dodawania notatki:', error);
          return res.status(500).json({ error: 'Błąd dodawania notatki', details: error.message });
        }
        
        console.log('Notatka dodana pomyślnie');
        return res.status(201).json({ success: true });
      } catch (error) {
        console.error('Wyjątek podczas POST /api/notes:', error);
        return res.status(500).json({ error: 'Błąd dodawania notatki' });
      }
    }
    else if (req.method === 'PUT') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Brak ID notatki do aktualizacji' });
      }
      
      try {
        const result = await updateNote(id, req.body);
        return res.status(200).json(result);
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Brak ID notatki do usunięcia' });
      }
      
      try {
        const result = await deleteNote(id);
        return res.status(200).json(result);
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }
    else {
      return res.status(405).json({ error: 'Metoda nie jest obsługiwana' });
    }
  } catch (error) {
    console.error('Wyjątek podczas obsługi żądania:', error);
    return res.status(500).json({ error: 'Wewnętrzny błąd serwera', details: error.message });
  }
}
