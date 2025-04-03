import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { URL } from 'url'; // Import URL for parsing

// Load environment variables
dotenv.config();

// --- Configuration ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL ERROR: Supabase URL and Anon Key must be defined.");
  // In a serverless function, throwing an error might be better than process.exit
  throw new Error("Missing Supabase configuration.");
}

// --- Initialize Supabase Client ---
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});

const NOTES_TABLE = 'notes';

// --- Helper Function for Parsing Category ID ---
function parseCategoryId(id_category) {
  if (id_category === undefined || id_category === null || id_category === '') {
    return null;
  }
  const parsed = parseInt(String(id_category), 10);
  if (isNaN(parsed)) {
    console.warn(`Received non-numeric id_category '${id_category}', treating as null.`);
    return null;
  }
  return parsed;
}

// Helper function to parse JSON body from request stream
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        // Handle empty body specifically
        if (!body) {
          resolve({});
          return;
        }
        resolve(JSON.parse(body));
      } catch (e) {
        console.error("JSON Parsing Error:", e);
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on('error', (err) => {
        console.error("Request Stream Error:", err);
        reject(err);
    });
  });
}

// --- Vercel Serverless Function Handler ---
export default async function handler(req, res) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or specific origin
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Simple routing based on method and URL path
  const { method, url } = req;
  // Use URL constructor to easily access pathname and searchParams
  // Need a base URL, but it doesn't matter what it is as we only use pathname/searchParams
  const parsedUrl = new URL(url, `http://${req.headers.host}`);
  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean); // e.g., ['api', 'notes', '70']

  try {
    // --- GET /api/notes ---
    if (method === 'GET' && pathSegments.length === 2 && pathSegments[1] === 'notes') {
      const id_category = parsedUrl.searchParams.get('id_category');
      const category = parsedUrl.searchParams.get('category');
      console.log(`GET /api/notes - Query Params: id_category=${id_category}, category=${category}`);

      let query = supabase.from(NOTES_TABLE).select('*');
      if (id_category !== null) { // Check against null, not undefined
        const categoryIdNum = parseCategoryId(id_category);
        if (categoryIdNum === null && String(id_category).length > 0) {
          return res.status(200).json([]);
        }
        query = query.eq('id_category', categoryIdNum);
      } else if (category === '') {
        query = query.is('id_category', null);
      }
      query = query.order('created_at', { ascending: false });

      const { data, error, status } = await query;
      if (error) throw error;
      console.log(`Returning ${data?.length ?? 0} notes.`);
      return res.status(200).json(data || []);
    }

    // --- GET /api/notes/:id ---
    if (method === 'GET' && pathSegments.length === 3 && pathSegments[1] === 'notes') {
      const id = pathSegments[2];
      console.log(`GET /api/notes/${id}`);
      if (!id || isNaN(parseInt(id, 10))) {
        return res.status(400).json({ error: 'Valid Note ID parameter is required.' });
      }
      const { data, error, status } = await supabase.from(NOTES_TABLE).select('*').eq('id', parseInt(id, 10)).single();
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Note not found.' });
        throw error;
      }
      console.log(`Returning note ID ${id}.`);
      return res.status(200).json(data);
    }

    // --- POST /api/notes ---
    if (method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'notes') {
      const body = await parseJsonBody(req);
      const { content, id_category } = body;
      console.log('POST /api/notes - Parsed Body:', body);

      if (!content || typeof content !== 'string' || content.trim() === '') {
        return res.status(400).json({ error: 'Note content is required and must be a non-empty string.' });
      }
      const noteToInsert = { content: content.trim(), id_category: parseCategoryId(id_category) };
      const { data, error, status } = await supabase.from(NOTES_TABLE).insert(noteToInsert).select().single();
      if (error) throw error;
      console.log(`Note added with ID ${data?.id}.`);
      return res.status(201).json(data);
    }

    // --- PUT /api/notes/:id ---
    if (method === 'PUT' && pathSegments.length === 3 && pathSegments[1] === 'notes') {
      const id = pathSegments[2];
      const body = await parseJsonBody(req);
      const { content, id_category } = body;
      console.log(`PUT /api/notes/${id} - Parsed Body:`, body);

      if (!id || isNaN(parseInt(id, 10))) {
        return res.status(400).json({ error: 'Valid Note ID parameter is required.' });
      }
      const noteToUpdate = {};
      if (content !== undefined) {
        if (typeof content !== 'string' || content.trim() === '') return res.status(400).json({ error: 'Note content must be a non-empty string if provided.' });
        noteToUpdate.content = content.trim();
      }
      if (id_category !== undefined) {
        noteToUpdate.id_category = parseCategoryId(id_category);
      }
      if (Object.keys(noteToUpdate).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided for update.' });
      }
      console.log(`Attempting to update note ${id} with:`, JSON.stringify(noteToUpdate, null, 2));
      const { data, error, status } = await supabase.from(NOTES_TABLE).update(noteToUpdate).eq('id', parseInt(id, 10)).select().single();
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Note not found for update.' });
        console.error(`Supabase PUT Error (ID: ${id}): Code=${error.code}, Message=${error.message}, Details=${error.details}, Hint=${error.hint}`);
        return res.status(status || 500).json({ error: 'Failed to update note in database', details: error.message, code: error.code });
      }
      console.log(`Note ID ${id} updated.`);
      return res.status(200).json(data);
    }

    // --- DELETE /api/notes/:id ---
    if (method === 'DELETE' && pathSegments.length === 3 && pathSegments[1] === 'notes') {
      const id = pathSegments[2];
      console.log(`DELETE /api/notes/${id}`);
      if (!id || isNaN(parseInt(id, 10))) {
        return res.status(400).json({ error: 'Valid Note ID parameter is required.' });
      }
      const { error, status, count } = await supabase.from(NOTES_TABLE).delete({ count: 'exact' }).eq('id', parseInt(id, 10));
      if (error) throw error;
      if (count === 0) return res.status(404).json({ error: 'Note not found for deletion.' });
      console.log(`Note ID ${id} deleted.`);
      return res.status(200).json({ success: true, message: 'Note deleted successfully.' });
    }

    // --- Not Found ---
    res.status(404).json({ error: 'Not Found', path: parsedUrl.pathname });

  } catch (error) {
    console.error(`API Error (${method} ${url}):`, error);
    // Ensure a response is sent even if an unexpected error occurs
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }
}
