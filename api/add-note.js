// Bezpośredni endpoint do dodawania notatek bez użycia Supabase client
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Obsługa tylko metody POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda nie jest obsługiwana' });
  }

  try {
    console.log('Otrzymano żądanie POST dla /api/add-note');
    console.log('Dane notatki:', req.body);
    
    if (!req.body || !req.body.content) {
      return res.status(400).json({ error: 'Brak wymaganych danych' });
    }
    
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
