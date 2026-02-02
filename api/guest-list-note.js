import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL ERROR: Supabase URL and Anon Key must be defined.");
  throw new Error("Missing Supabase configuration.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});

const TABLE = 'guest_list_note';

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (!body) {
          resolve({});
          return;
        }
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method } = req;

  try {
    // GET /api/guest-list-note - pobierz notatkę
    if (method === 'GET') {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        // Jeśli nie ma jeszcze wiersza, zwróć pusty
        if (error.code === 'PGRST116') {
          return res.status(200).json({ id: null, content: '', updatedAt: null });
        }
        throw error;
      }

      return res.status(200).json({
        id: data.id,
        content: data.content || '',
        updatedAt: data.updated_at,
      });
    }

    // PUT /api/guest-list-note - zapisz notatkę
    if (method === 'PUT') {
      const body = await parseJsonBody(req);
      const content = typeof body.content === 'string' ? body.content : '';

      // Sprawdź czy istnieje wiersz
      const { data: existing } = await supabase
        .from(TABLE)
        .select('id')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      let data;
      let error;

      if (existing) {
        // Aktualizuj istniejący wiersz
        const result = await supabase
          .from(TABLE)
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Wstaw nowy wiersz
        const result = await supabase
          .from(TABLE)
          .insert({ content, updated_at: new Date().toISOString() })
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      return res.status(200).json({
        id: data.id,
        content: data.content || '',
        updatedAt: data.updated_at,
      });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Guest list note API error:', error);
    return res.status(500).json({ error: 'Błąd serwera: ' + error.message });
  }
}
