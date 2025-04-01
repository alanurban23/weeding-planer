// Skrypt do aktualizacji istniejących notatek, aby miały przypisaną wartość null dla kategorii
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

// Inicjalizacja klienta Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

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
      console.log(`Notatka ID ${note.id}: kategoria = ${note.category === null ? 'NULL' : note.category === undefined ? 'UNDEFINED' : note.category}`);
    });
    
    // Znajdź notatki bez kategorii (gdzie category jest undefined lub null)
    const notesWithoutCategory = data.filter(note => note.category === undefined || note.category === null);
    console.log(`Znaleziono ${notesWithoutCategory.length} notatek bez zdefiniowanej kategorii.`);
    
    // Aktualizuj notatki, które nie mają kategorii, ustawiając wartość 0 (zamiast null)
    if (notesWithoutCategory.length > 0) {
      console.log('Aktualizacja notatek...');
      
      // Przygotuj tablicę identyfikatorów notatek do aktualizacji
      const noteIds = notesWithoutCategory.map(note => note.id);
      
      // Aktualizuj każdą notatkę osobno, aby mieć pewność, że wszystkie zostaną zaktualizowane
      for (const noteId of noteIds) {
        console.log(`Aktualizacja notatki ID ${noteId}...`);
        const { error: updateError } = await supabase
          .from('notes')
          .update({ category: 0 }) // Używamy 0 zamiast null dla notatek bez kategorii
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
    
    // Teraz zaktualizujmy wszystkie notatki, aby upewnić się, że mają przypisaną kategorię
    console.log('Aktualizacja wszystkich notatek, aby upewnić się, że mają przypisaną kategorię...');
    
    for (const note of data) {
      if (note.category === undefined) {
        console.log(`Aktualizacja notatki ID ${note.id} (kategoria undefined -> 0)...`);
        const { error: updateError } = await supabase
          .from('notes')
          .update({ category: 0 }) // Używamy 0 zamiast null
          .eq('id', note.id);
        
        if (updateError) {
          console.error(`Błąd aktualizacji notatki ID ${note.id}:`, updateError);
        } else {
          console.log(`Pomyślnie zaktualizowano notatkę ID ${note.id}`);
        }
      }
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
