// Import necessary modules
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Keep if '/api/add-note' still needs it

// Load environment variables from .env file
dotenv.config();

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // Use ANON key for client-facing API

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL ERROR: Supabase URL and Anon Key must be defined in environment variables.");
  process.exit(1);
}

// --- Initialize Supabase Client ---
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});

const NOTES_TABLE = 'notes';
const TASKS_TABLE = 'tasks';
const CATEGORIES_TABLE = 'categories'; // Added for potential future use

// --- Initialize Express App ---
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Helper Function for Parsing Category ID (from previous optimization) ---
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

// --- Helper Function for Formatting Task Output ---
// (Kept similar to original, ensures consistent output shape)
const formatTask = (task) => {
  if (!task) return null;
  return {
    ...task,
    dueDate: task.due_date, // Rename field for frontend consistency
    notes: Array.isArray(task.notes) ? task.notes : [], // Ensure notes is always an array
    // Optionally add category name here via JOIN if needed in the future
    // Remove the potentially confusing fallback 'category' field generation
    // Keep id_category as the source of truth
  };
};


// --- Notes API Routes (Paste previously optimized routes here) ---
// GET /api/notes, GET /api/notes/:id, POST /api/notes, PUT /api/notes/:id, DELETE /api/notes/:id
// POST /api/add-note (if still needed)
// ... (Paste from previous answers) ...
// GET /api/notes OR /api/notes?id_category=... OR /api/notes?category=
app.get('/api/notes', async (req, res) => {
  try {
    const { id_category, category } = req.query;
    // console.log(`GET /api/notes - Query Params: id_category=${id_category}, category=${category}`);
    let query = supabase.from(NOTES_TABLE).select('*');
    if (id_category !== undefined) {
      const categoryIdNum = parseCategoryId(id_category);
      if (categoryIdNum === null && String(id_category).length > 0) {
        // console.log(`Invalid id_category '${id_category}' provided.`);
        return res.status(200).json([]);
      }
      query = query.eq('id_category', categoryIdNum);
    } else if (category === '') {
      query = query.is('id_category', null);
    }
    query = query.order('created_at', { ascending: false });
    const { data, error, status } = await query;
    if (error) throw error; // Let global handler catch
    // console.log(`Returning ${data?.length ?? 0} notes.`);
    return res.status(200).json(data || []);
  } catch (error) {
    console.error('GET /api/notes Error:', error);
    return res.status(500).json({ error: 'Failed to fetch notes', details: error.message });
  }
});
// GET /api/notes/:id
app.get('/api/notes/:id', async (req, res) => {
   try {
    const { id } = req.params;
    // console.log(`GET /api/notes/${id}`);
    if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'Valid Note ID parameter is required.' });
    const { data, error, status } = await supabase.from(NOTES_TABLE).select('*').eq('id', parseInt(id, 10)).single();
    if (error) {
       if (error.code === 'PGRST116') return res.status(404).json({ error: 'Note not found.' });
       throw error;
    }
    // console.log(`Returning note ID ${id}.`);
    return res.status(200).json(data);
  } catch (error) {
    console.error(`GET /api/notes/:id Error:`, error);
    return res.status(500).json({ error: 'Failed to fetch note', details: error.message });
  }
});
// POST /api/notes
app.post('/api/notes', async (req, res) => {
  try {
    const { content, id_category } = req.body;
    // console.log('POST /api/notes - Body:', req.body);
    if (!content || typeof content !== 'string' || content.trim() === '') return res.status(400).json({ error: 'Note content is required and must be a non-empty string.' });
    const noteToInsert = { content: content.trim(), id_category: parseCategoryId(id_category) };
    const { data, error, status } = await supabase.from(NOTES_TABLE).insert(noteToInsert).select().single();
    if (error) throw error;
    // console.log(`Note added with ID ${data?.id}.`);
    return res.status(201).json(data);
  } catch (error) {
    console.error('POST /api/notes Error:', error);
    return res.status(500).json({ error: 'Failed to add note', details: error.message });
  }
});
// PUT /api/notes/:id
app.put('/api/notes/:id', async (req, res) => {
   try {
    const { id } = req.params;
     const { content, id_category } = req.body;
    // console.log(`PUT /api/notes/${id} - Body:`, req.body);
    if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'Valid Note ID parameter is required.' });
    const noteToUpdate = {};
    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim() === '') return res.status(400).json({ error: 'Note content must be a non-empty string if provided.' });
      noteToUpdate.content = content.trim();
    }
    if (id_category !== undefined) noteToUpdate.id_category = parseCategoryId(id_category);
    if (Object.keys(noteToUpdate).length === 0) return res.status(400).json({ error: 'No valid fields provided for update.' });
    const { data, error, status } = await supabase.from(NOTES_TABLE).update(noteToUpdate).eq('id', parseInt(id, 10)).select().single();
    if (error) {
       if (error.code === 'PGRST116') return res.status(404).json({ error: 'Note not found for update.' });
       throw error;
    }
    // console.log(`Note ID ${id} updated.`);
    return res.status(200).json(data);
  } catch (error) {
    console.error(`PUT /api/notes/:id Error:`, error);
    return res.status(500).json({ error: 'Failed to update note', details: error.message });
  }
});
// DELETE /api/notes/:id
app.delete('/api/notes/:id', async (req, res) => {
   try {
    const { id } = req.params;
    // console.log(`DELETE /api/notes/${id}`);
     if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'Valid Note ID parameter is required.' });
    const { error, status, count } = await supabase.from(NOTES_TABLE).delete({ count: 'exact' }).eq('id', parseInt(id, 10));
    if (error) throw error;
    if (count === 0) return res.status(404).json({ error: 'Note not found for deletion.' });
    // console.log(`Note ID ${id} deleted.`);
    return res.status(200).json({ success: true, message: 'Note deleted successfully.' });
  } catch (error) {
    console.error(`DELETE /api/notes/:id Error:`, error);
    return res.status(500).json({ error: 'Failed to delete note', details: error.message });
  }
});
// POST /api/add-note (using fetch)
app.post('/api/add-note', async (req, res) => {
   try {
    const { content, id_category } = req.body;
    // console.log('POST /api/add-note - Body:', req.body);
    if (!content || typeof content !== 'string' || content.trim() === '') return res.status(400).json({ error: 'Note content is required and must be a non-empty string.' });
    const noteData = { content: content.trim(), id_category: parseCategoryId(id_category) };
    // console.log('Prepared note data for fetch:', noteData);
    const response = await fetch(`${supabaseUrl}/rest/v1/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}`, 'Prefer': 'return=representation' }, body: JSON.stringify(noteData) });
    const responseBodyText = await response.text();
    if (!response.ok) {
      console.error(`Error adding note via REST API (${response.status}):`, responseBodyText);
      let errorDetails = responseBodyText; try { errorDetails = JSON.parse(responseBodyText); } catch(e) { /* Ignore */ }
      return res.status(response.status || 500).json({ error: 'Failed to add note via REST', details: errorDetails });
    }
    let responseData; try { responseData = JSON.parse(responseBodyText); } catch (e) { console.error('Error parsing successful response from Supabase REST API:', e); return res.status(500).json({ error: 'Failed to parse Supabase response', details: responseBodyText }); }
    // console.log('Note added successfully via REST API:', responseData);
    const createdNote = Array.isArray(responseData) ? responseData[0] : responseData;
    return res.status(201).json(createdNote);
  } catch (error) {
    console.error('POST /api/add-note Error:', error);
    return res.status(500).json({ error: 'Internal Server Error while adding note', details: error.message });
  }
});


// --- Tasks API Routes ---

// GET /api/tasks
app.get('/api/tasks', async (req, res) => {
  try {
    // console.log('GET /api/tasks');
    // Add filtering capabilities if needed (e.g., by category, completion status)
    // const { id_category, completed } = req.query;
    let query = supabase
      .from(TASKS_TABLE)
      .select('*')
      // .not('created_at', 'is', null) // Usually not needed if created_at is non-nullable
      .order('created_at', { ascending: false });

    // Example filtering:
    // if (id_category) { query = query.eq('id_category', parseCategoryId(id_category)); }
    // if (completed !== undefined) { query = query.eq('completed', String(completed) === 'true'); }

    const { data, error, status } = await query;

    if (error) throw error;

    const formattedData = data?.map(formatTask) || [];
    // console.log(`Returning ${formattedData.length} tasks.`);
    return res.status(200).json(formattedData);

  } catch (error) {
    console.error('GET /api/tasks Error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
  }
});

// POST /api/tasks
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, notes, completed, dueDate, id_category } = req.body;
    // console.log('POST /api/tasks - Body:', req.body);

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    // Prepare task data - SIMPLIFIED category logic
    const taskToInsert = {
      title: title.trim(),
      notes: Array.isArray(notes) ? notes : [], // Ensure notes is an array
      completed: Boolean(completed) || false,
      due_date: dueDate || null, // Map frontend name to DB name
      id_category: parseCategoryId(id_category), // Use helper, expect ID
      // created_at handled by DB
    };

    const { data, error, status } = await supabase
      .from(TASKS_TABLE)
      .insert(taskToInsert)
      .select()
      .single();

    if (error) throw error;

    // console.log(`Task added with ID ${data?.id}.`);
    return res.status(201).json(formatTask(data)); // Format output

  } catch (error) {
    console.error('POST /api/tasks Error:', error);
    return res.status(500).json({ error: 'Failed to add task', details: error.message });
  }
});

// GET /api/tasks/:id
app.get('/api/tasks/:id', async (req, res) => {
   try {
    const { id } = req.params;
    // console.log(`GET /api/tasks/${id}`);
    if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'Valid Task ID parameter is required.' });

    const { data, error, status } = await supabase
      .from(TASKS_TABLE)
      .select('*')
      .eq('id', parseInt(id, 10))
      .single();

    if (error) {
       if (error.code === 'PGRST116') return res.status(404).json({ error: 'Task not found.' });
       throw error;
    }
    // console.log(`Returning task ID ${id}.`);
    return res.status(200).json(formatTask(data)); // Format output
  } catch (error) {
    console.error(`GET /api/tasks/:id Error:`, error);
    return res.status(500).json({ error: 'Failed to fetch task', details: error.message });
  }
});


// PUT /api/tasks/:id  (Using PUT for full replacement semantics, PATCH for partial)
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, notes, completed, dueDate, id_category } = req.body; // Extract expected fields
    // console.log(`PUT /api/tasks/${id} - Body:`, req.body);

    if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'Valid Task ID parameter is required.' });

    // Prepare update data - only include fields provided in the request
    const taskToUpdate = {};
    if (title !== undefined) {
        if (typeof title !== 'string' || title.trim() === '') return res.status(400).json({ error: 'Task title must be a non-empty string if provided.' });
        taskToUpdate.title = title.trim();
    }
    if (notes !== undefined) {
        taskToUpdate.notes = Array.isArray(notes) ? notes : [];
    }
    if (completed !== undefined) {
        taskToUpdate.completed = Boolean(completed);
    }
    if (dueDate !== undefined) { // Allow setting due date to null
        taskToUpdate.due_date = dueDate;
    }
    if (id_category !== undefined) { // Allow setting category to null
        taskToUpdate.id_category = parseCategoryId(id_category);
    }

    if (Object.keys(taskToUpdate).length === 0) {
       return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const { data, error, status } = await supabase
      .from(TASKS_TABLE)
      .update(taskToUpdate)
      .eq('id', parseInt(id, 10))
      .select()
      .single();

    if (error) {
       if (error.code === 'PGRST116') return res.status(404).json({ error: 'Task not found for update.' });
       throw error;
    }

    // console.log(`Task ID ${id} updated.`);
    return res.status(200).json(formatTask(data)); // Format output

  } catch (error) {
    console.error(`PUT /api/tasks/:id Error:`, error);
    return res.status(500).json({ error: 'Failed to update task', details: error.message });
  }
});

// PATCH /api/tasks/:id/toggle
app.patch('/api/tasks/:id/toggle', async (req, res) => {
    try {
        const { id } = req.params;
        // console.log(`PATCH /api/tasks/${id}/toggle`);

        if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'Valid Task ID parameter is required.' });

        // 1. Fetch the current task to get its state
        const { data: currentTask, error: fetchError } = await supabase
            .from(TASKS_TABLE)
            .select('completed') // Only fetch necessary field
            .eq('id', parseInt(id, 10))
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') return res.status(404).json({ error: 'Task not found to toggle.' });
            throw fetchError; // Rethrow other fetch errors
        }

        // 2. Update the task with the opposite completed state
        const { data, error, status } = await supabase
            .from(TASKS_TABLE)
            .update({ completed: !currentTask.completed })
            .eq('id', parseInt(id, 10))
            .select() // Select all fields after update
            .single();

        if (error) throw error; // Let global handler catch update errors

        // console.log(`Task ID ${id} toggled.`);
        return res.status(200).json(formatTask(data)); // Format output

    } catch (error) {
        console.error(`PATCH /api/tasks/:id/toggle Error:`, error);
        return res.status(500).json({ error: 'Failed to toggle task status', details: error.message });
    }
});


// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (req, res) => {
   try {
    const { id } = req.params;
    // console.log(`DELETE /api/tasks/${id}`);
     if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'Valid Task ID parameter is required.' });

    const { error, status, count } = await supabase
      .from(TASKS_TABLE)
      .delete({ count: 'exact' })
      .eq('id', parseInt(id, 10));

    if (error) throw error;
    if (count === 0) return res.status(404).json({ error: 'Task not found for deletion.' });

    // console.log(`Task ID ${id} deleted.`);
    return res.status(200).json({ success: true, message: 'Task deleted successfully.' });
    // Alternatively: return res.status(204).end();

  } catch (error) {
    console.error(`DELETE /api/tasks/:id Error:`, error);
    return res.status(500).json({ error: 'Failed to delete task', details: error.message });
  }
});


// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.send('Notes & Tasks API is running.');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Supabase URL: ${supabaseUrl}`);
});