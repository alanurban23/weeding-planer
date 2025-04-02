// Import necessary modules
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// --- Configuration ---
const PORT = process.env.PORT || 3001; // Use port from env or default
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL ERROR: Supabase URL and Anon Key must be defined in environment variables.");
  process.exit(1); // Exit if essential config is missing
}

// --- Initialize Supabase Client ---
// REMOVED schema validation bypass
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});

const NOTES_TABLE = 'notes';

// --- Initialize Express App ---
const app = express();

// --- Middleware ---
app.use(cors()); // Enable CORS for all origins (configure specific origins in production)
app.use(express.json()); // Middleware to parse JSON request bodies

// --- Helper Function for Parsing Category ID ---
function parseCategoryId(id_category) {
  if (id_category === undefined || id_category === null || id_category === '') {
    return null; // Treat empty/null/undefined as null
  }
  const parsed = parseInt(String(id_category), 10);
  if (isNaN(parsed)) {
    console.warn(`Received non-numeric id_category '${id_category}', treating as null.`);
    return null; // Treat non-numeric strings as null
  }
  return parsed;
}


// --- API Routes for /api/notes ---

// GET /api/notes OR /api/notes?id_category=... OR /api/notes?category=
app.get('/api/notes', async (req, res) => {
  try {
    const { id_category, category } = req.query;
    console.log(`GET /api/notes - Query Params: id_category=${id_category}, category=${category}`);

    let query = supabase.from(NOTES_TABLE).select('*');

    if (id_category !== undefined) {
      // Filter by numeric category ID
      const categoryIdNum = parseCategoryId(id_category);
      if (categoryIdNum === null && String(id_category).length > 0) { // Check if it was non-empty but invalid
        console.log(`Invalid id_category '${id_category}' provided.`);
        // Return empty array if ID format is invalid but was provided
        return res.status(200).json([]);
      }
       // If parseCategoryId returns null (for empty string or actual null), filter for null
      query = query.eq('id_category', categoryIdNum);
    } else if (category === '') {
      // Filter notes without category
      query = query.is('id_category', null);
    }
    // Note: Filtering by category *name* is not implemented here, requires join/different approach

    query = query.order('created_at', { ascending: false });

    const { data, error, status } = await query;

    if (error) {
      console.error('Supabase GET Error:', error);
      return res.status(status || 500).json({ error: 'Failed to fetch notes', details: error.message });
    }

    console.log(`Returning ${data?.length ?? 0} notes.`);
    return res.status(200).json(data || []); // Ensure data is always an array

  } catch (error) {
    console.error('GET /api/notes Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// GET /api/notes/:id
app.get('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`GET /api/notes/${id}`);

    if (!id || isNaN(parseInt(id, 10))) {
         return res.status(400).json({ error: 'Valid Note ID parameter is required.' });
    }

    const { data, error, status } = await supabase
      .from(NOTES_TABLE)
      .select('*')
      .eq('id', parseInt(id, 10))
      .single();

    if (error) {
      // Handle not found specifically (e.g., PGROUT02 error code for .single())
       if (error.code === 'PGRST116') { // Check Supabase error codes documentation
         return res.status(404).json({ error: 'Note not found.' });
       }
      console.error(`Supabase GET by ID Error (ID: ${id}):`, error);
      return res.status(status || 500).json({ error: 'Failed to fetch note', details: error.message });
    }

     console.log(`Returning note ID ${id}.`);
    return res.status(200).json(data);

  } catch (error) {
    console.error(`GET /api/notes/:id Error:`, error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


// POST /api/notes
app.post('/api/notes', async (req, res) => {
  try {
    const { content, id_category } = req.body;
    console.log('POST /api/notes - Body:', req.body);

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ error: 'Note content is required and must be a non-empty string.' });
    }

    const noteToInsert = {
      content: content.trim(),
      id_category: parseCategoryId(id_category), // Use helper to handle conversion/null
      // created_at should be handled by database default 'now()'
    };

    const { data, error, status } = await supabase
      .from(NOTES_TABLE)
      .insert(noteToInsert)
      .select()
      .single();

    if (error) {
      console.error('Supabase POST Error:', error);
      return res.status(status || 500).json({ error: 'Failed to add note', details: error.message });
    }

    console.log(`Note added with ID ${data?.id}.`);
    return res.status(201).json(data); // 201 Created

  } catch (error) {
    console.error('POST /api/notes Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


// PUT /api/notes/:id
app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
     const { content, id_category } = req.body; // Extract specific fields for update
    console.log(`PUT /api/notes/${id} - Body:`, req.body);

    if (!id || isNaN(parseInt(id, 10))) {
         return res.status(400).json({ error: 'Valid Note ID parameter is required.' });
    }

    const noteToUpdate = {};

    // Only include fields in the update if they are provided
    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim() === '') {
         return res.status(400).json({ error: 'Note content must be a non-empty string if provided.' });
      }
      noteToUpdate.content = content.trim();
    }

    // Handle id_category update (allow setting to null)
    if (id_category !== undefined) { // Check if the key exists in the request body
        noteToUpdate.id_category = parseCategoryId(id_category); // Use helper
    }

    // Prevent empty updates
    if (Object.keys(noteToUpdate).length === 0) {
       return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const { data, error, status } = await supabase
      .from(NOTES_TABLE)
      .update(noteToUpdate)
      .eq('id', parseInt(id, 10))
      .select()
      .single();

    if (error) {
       // Handle not found specifically
       if (error.code === 'PGRST116') {
         return res.status(404).json({ error: 'Note not found for update.' });
       }
      console.error(`Supabase PUT Error (ID: ${id}):`, error);
      return res.status(status || 500).json({ error: 'Failed to update note', details: error.message });
    }

     console.log(`Note ID ${id} updated.`);
    return res.status(200).json(data);

  } catch (error) {
    console.error(`PUT /api/notes/:id Error:`, error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


// DELETE /api/notes/:id
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`DELETE /api/notes/${id}`);

     if (!id || isNaN(parseInt(id, 10))) {
         return res.status(400).json({ error: 'Valid Note ID parameter is required.' });
    }

    const { error, status, count } = await supabase
      .from(NOTES_TABLE)
      .delete({ count: 'exact' }) // Request count of deleted rows
      .eq('id', parseInt(id, 10));

    if (error) {
      console.error(`Supabase DELETE Error (ID: ${id}):`, error);
      return res.status(status || 500).json({ error: 'Failed to delete note', details: error.message });
    }

    // Check if a row was actually deleted
    if (count === 0) {
         return res.status(404).json({ error: 'Note not found for deletion.' });
    }

    console.log(`Note ID ${id} deleted.`);
    // Send 200 with success message or 204 No Content
    return res.status(200).json({ success: true, message: 'Note deleted successfully.' });
    // return res.status(204).end();

  } catch (error) {
    console.error(`DELETE /api/notes/:id Error:`, error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.send('Notes API is running.');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Supabase URL: ${supabaseUrl}`); // Log URL but not key
});