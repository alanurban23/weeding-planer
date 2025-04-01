// Skrypt do aktualizacji istniejących notatek, aby miały przypisaną wartość null dla kategorii
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe
dotenv.config({ path: '../.env' });

// Inicjalizacja klienta Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // Używamy SUPABASE_ANON_KEY zamiast SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Brak wymaganych zmiennych środowiskowych SUPABASE_URL i SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateNotesCategories() {
  try {
    console.log('Pobieranie wszystkich notatek...');
    
    // Pobierz wszystkie notatki
    const { data, error } = await supabase
      .from('notes')
      .select('*');
    
    if (error) {
      console.error('Błąd pobierania notatek:', error);
      return;
    }
    
    console.log(`Znaleziono ${data.length} notatek.`);
    
    // Wyświetl informacje o kategoriach wszystkich notatek
    console.log('Kategorie notatek:');
    data.forEach(note => {
      console.log(`Notatka ID ${note.id}: kategoria = ${note.category === null ? 'NULL' : note.category === undefined ? 'UNDEFINED' : `"${note.category}"`}`);
    });
    
    // Znajdź notatki bez kategorii (gdzie category jest undefined lub null)
    const notesWithoutCategory = data.filter(note => note.category === undefined || note.category === null);
    console.log(`Znaleziono ${notesWithoutCategory.length} notatek bez zdefiniowanej kategorii.`);
    
    // Aktualizuj notatki, które nie mają kategorii, ustawiając wartość null
    if (notesWithoutCategory.length > 0) {
      console.log('Aktualizacja notatek...');
      
      // Przygotuj tablicę identyfikatorów notatek do aktualizacji
      const noteIds = notesWithoutCategory.map(note => note.id);
      
      // Aktualizuj każdą notatkę osobno, aby mieć pewność, że wszystkie zostaną zaktualizowane
      for (const noteId of noteIds) {
        console.log(`Aktualizacja notatki ID ${noteId}...`);
        const { error: updateError } = await supabase
          .from('notes')
          .update({ category: null })
          .eq('id', noteId);
        
        if (updateError) {
          console.error(`Błąd aktualizacji notatki ID ${noteId}:`, updateError);
        } else {
          console.log(`Pomyślnie zaktualizowano notatkę ID ${noteId}`);
        }
      }
      
      console.log(`Zakończono aktualizację ${noteIds.length} notatek.`);
    } else {
      console.log('Nie ma notatek do aktualizacji.');
    }
    
  } catch (error) {
    console.error('Wystąpił błąd:', error);
  }
}

// Uruchom funkcję aktualizacji
updateNotesCategories()
  .then(() => {
    console.log('Zakończono aktualizację notatek.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Błąd podczas wykonywania skryptu:', error);
    process.exit(1);
  });
