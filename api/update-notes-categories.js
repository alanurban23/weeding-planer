// API do aktualizacji kategorii notatek
import { createClient } from '@supabase/supabase-js';

// Inicjalizacja klienta Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Obsługa CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Tylko metoda POST jest obsługiwana
    if (req.method === 'POST') {
      console.log('Otrzymano żądanie POST dla /api/update-notes-categories');
      
      // Pobierz wszystkie notatki
      const { data, error } = await supabase
        .from('notes')
        .select('*');
      
      if (error) {
        console.error('Błąd pobierania notatek:', error);
        return res.status(500).json({ error: 'Błąd pobierania notatek' });
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
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const noteId of noteIds) {
          console.log(`Aktualizacja notatki ID ${noteId}...`);
          const { error: updateError } = await supabase
            .from('notes')
            .update({ category: null })
            .eq('id', noteId);
          
          if (updateError) {
            console.error(`Błąd aktualizacji notatki ID ${noteId}:`, updateError);
            errorCount++;
          } else {
            console.log(`Pomyślnie zaktualizowano notatkę ID ${noteId}`);
            updatedCount++;
          }
        }
        
        console.log(`Zakończono aktualizację notatek. Zaktualizowano: ${updatedCount}, błędy: ${errorCount}`);
        return res.status(200).json({ 
          success: true, 
          message: `Zaktualizowano ${updatedCount} notatek, błędy: ${errorCount}`,
          totalNotes: data.length,
          notesWithoutCategory: notesWithoutCategory.length,
          updatedNotes: updatedCount,
          errors: errorCount
        });
      } else {
        console.log('Nie ma notatek do aktualizacji.');
        return res.status(200).json({ 
          success: true, 
          message: 'Nie ma notatek do aktualizacji',
          totalNotes: data.length,
          notesWithoutCategory: 0
        });
      }
    } else {
      return res.status(405).json({ error: 'Metoda nie jest obsługiwana' });
    }
  } catch (error) {
    console.error('Wystąpił błąd:', error);
    return res.status(500).json({ error: 'Wystąpił błąd podczas aktualizacji notatek' });
  }
}
