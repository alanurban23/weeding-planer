// Public API endpoint - no authentication required
import { createClient } from '@supabase/supabase-js';

// Bypass Vercel's authentication by adding this header
const BYPASS_VERCEL_AUTH = {
  'x-vercel-protection-bypass': process.env.VERCEL_AUTH_BYPASS_SECRET || ''
};

export default async (req, res) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: BYPASS_VERCEL_AUTH
        }
      }
    );

    // Obsługa różnych metod HTTP
    if (req.method === 'GET') {
      // Pobieranie notatek
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(data || []);
    } 
    else if (req.method === 'POST') {
      // Dodawanie nowej notatki
      const { id, content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Brak wymaganej treści notatki' });
      }
      
      console.log('Dodawanie notatki:', { id, content });
      
      const { data, error } = await supabase
        .from('notes')
        .insert([
          { 
            id, 
            content,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) {
        console.error('Błąd dodawania notatki:', error);
        throw error;
      }
      
      res.status(201).json(data[0] || {});
    }
    else {
      // Nieobsługiwana metoda HTTP
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Metoda ${req.method} nie jest obsługiwana` });
    }
  } catch (error) {
    console.error('Error:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Błąd serwera',
      details: error.message 
    });
  }
};
