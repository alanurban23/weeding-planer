// Import necessary modules
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Keep fetch as the original code used it

// Load environment variables from .env file
dotenv.config();

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL ERROR: Supabase URL and Anon Key must be defined in environment variables.");
  process.exit(1);
}

// --- Initialize Supabase Client (Optional here, but good practice if other routes use it) ---
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});

const NOTES_TABLE = 'notes'; // Still useful for potential future refactoring

// --- Initialize Express App ---
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Helper Function for Parsing Category ID (Copied from previous optimization) ---
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

// --- API Routes ---

// Include the previously optimized routes for /api/notes/:id, PUT, DELETE, GET /api/notes
// ... (paste the GET, PUT, DELETE routes for /api/notes/:id etc. from the previous answer here) ...

// GET /api/notes OR /api/notes?id_category=... OR /api/notes?category=
app.get('/api/notes', async (req, res) => {
  try {
    const { id_category, category } = req.query;
    console.log(`GET /api/notes - Query Params: id_category=${id_category}, category=${category}`);

    let query = supabase.from(NOTES_TABLE).select('*');

    if (id_category !== undefined) {
      const categoryIdNum = parseCategoryId(id_category);
      if (categoryIdNum === null && String(id_category).length > 0) {
        console.log(`Invalid id_category '${id_category}' provided.`);
        return res.status(200).json([]);
      }
      query = query.eq('id_category', categoryIdNum);
    } else if (category === '') {
      query = query.is('id_category', null);
    }

    query = query.order('created_at', { ascending: false });
    const { data, error, status } = await query;

    if (error) {
      console.error('Supabase GET Error:', error);
      return res.status(status || 500).json({ error: 'Failed to fetch notes', details: error.message });
    }
    console.log(`Returning ${data?.length ?? 0} notes.`);
    return res.status(200).json(data || []);
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
       if (error.code === 'PGRST116') {
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

// PUT /api/notes/:id
app.put('/api/notes/:id', async (req, res) => {
   try {
    const { id } = req.params;
     const { content, id_category } = req.body;
    console.log(`PUT /api/notes/${id} - Body:`, req.body);
    if (!id || isNaN(parseInt(id, 10))) {
         return res.status(400).json({ error: 'Valid Note ID parameter is required.' });
    }
    const noteToUpdate = {};
    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim() === '') {
         return res.status(400).json({ error: 'Note content must be a non-empty string if provided.' });
      }
      noteToUpdate.content = content.trim();
    }
    if (id_category !== undefined) {
        noteToUpdate.id_category = parseCategoryId(id_category);
    }
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
      .delete({ count: 'exact' })
      .eq('id', parseInt(id, 10));
    if (error) {
      console.error(`Supabase DELETE Error (ID: ${id}):`, error);
      return res.status(status || 500).json({ error: 'Failed to delete note', details: error.message });
    }
    if (count === 0) {
         return res.status(404).json({ error: 'Note not found for deletion.' });
    }
    console.log(`Note ID ${id} deleted.`);
    return res.status(200).json({ success: true, message: 'Note deleted successfully.' });
  } catch (error) {
    console.error(`DELETE /api/notes/:id Error:`, error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// --- NEW Route for POST /api/add-note (using fetch) ---
app.post('/api/add-note', async (req, res) => {
  try {
    const { content, id_category } = req.body;
    console.log('POST /api/add-note - Body:', req.body);

    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ error: 'Note content is required and must be a non-empty string.' });
    }

    // Prepare data, relying on DB for created_at
    const noteData = {
      content: content.trim(),
      id_category: parseCategoryId(id_category), // Use helper
    };

    console.log('Prepared note data for fetch:', noteData);

    // Use direct fetch call to Supabase REST API (as in original code)
    const response = await fetch(`${supabaseUrl}/rest/v1/notes`, { // Use configured URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey, // Use configured key
        'Authorization': `Bearer ${supabaseAnonKey}`, // Use configured key
        'Prefer': 'return=representation', // Ask Supabase to return the created row(s)
        // Consider removing 'X-Supabase-No-Schema-Validation': 'true' if it was implicit before
      },
      body: JSON.stringify(noteData),
    });

    const responseBodyText = await response.text(); // Read body once

    if (!response.ok) {
      console.error(`Error adding note via REST API (${response.status}):`, responseBodyText);
      // Try to parse error if JSON, otherwise return text
      let errorDetails = responseBodyText;
      try {
          errorDetails = JSON.parse(responseBodyText);
      } catch(e) { /* Ignore parsing error, use text */ }
      return res.status(response.status || 500).json({ error: 'Failed to add note via REST', details: errorDetails });
    }

    let responseData;
    try {
        responseData = JSON.parse(responseBodyText); // Parse the successful response
    } catch (e) {
        console.error('Error parsing successful response from Supabase REST API:', e);
        return res.status(500).json({ error: 'Failed to parse Supabase response', details: responseBodyText });
    }


    console.log('Note added successfully via REST API:', responseData);
    // Supabase REST API often returns an array, even for single insert with representation
    const createdNote = Array.isArray(responseData) ? responseData[0] : responseData;
    return res.status(201).json(createdNote); // Return the first object if it's an array

  } catch (error) {
    console.error('POST /api/add-note Error:', error);
    // Distinguish fetch errors from other errors if needed
    return res.status(500).json({ error: 'Internal Server Error while adding note', details: error.message });
  }
});


// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.send('Notes API is running.');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Supabase URL: ${supabaseUrl}`);
});