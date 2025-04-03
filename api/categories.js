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
// !!! CRITICAL SECURITY FIX: Use ANON KEY for API routes, NOT the secret API_KEY !!!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL ERROR: Supabase URL and Anon Key must be defined.");
  process.exit(1);
}

// --- Initialize Supabase Client ---
// Use ANON key for API routes accessed by users/clients
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});

const NOTES_TABLE = 'notes';
const TASKS_TABLE = 'tasks';
const CATEGORIES_TABLE = 'categories';

// --- Initialize Express App ---
const app = express();

// --- Middleware ---
app.use(cors());
// app.use(express.json()); // Removed global JSON middleware

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

// --- Helper Function for Formatting Task Output (If needed by other routes) ---
const formatTask = (task) => {
    if (!task) return null;
    return { /* ... task formatting logic ... */ };
};

// --- API Routes ---

// --- Notes API Routes (Paste previously optimized routes here) ---
// GET /api/notes, GET /api/notes/:id, POST /api/notes, PUT /api/notes/:id, DELETE /api/notes/:id
// POST /api/add-note (if still needed)
// ... (Paste from previous answers) ...

// --- Tasks API Routes (Paste previously optimized routes here) ---
// GET /api/tasks, POST /api/tasks, GET /api/tasks/:id, PUT /api/tasks/:id, PATCH /api/tasks/:id/toggle, DELETE /api/tasks/:id
// ... (Paste from previous answers) ...


// --- Categories API Routes ---

// GET /api/categories - List all categories
app.get('/api/categories', async (req, res) => {
    try {
        // console.log('GET /api/categories');
        // Query ONLY the categories table. Removed fallback logic.
        const { data, error, status } = await supabase
            .from(CATEGORIES_TABLE)
            .select('*')
            .order('name', { ascending: true }); // Order alphabetically by name

        if (error) {
            console.error('Supabase GET Categories Error:', error);
            // Do NOT fallback. Return an error if the primary source fails.
            return res.status(status || 500).json({ error: 'Failed to fetch categories', details: error.message });
        }

        // Ensure IDs are numbers if necessary (depends on how frontend uses them)
        const formattedCategories = data?.map(cat => ({
            ...cat,
            id: parseCategoryId(cat.id) ?? cat.id, // Attempt parse, fallback to original if null
            parent_id: parseCategoryId(cat.parent_id) // Allow null parent_id
        })) || [];

        // console.log(`Returning ${formattedCategories.length} categories.`);
        return res.status(200).json(formattedCategories);

    } catch (error) {
        console.error('GET /api/categories Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// GET /api/categories/:id - Get a single category
app.get('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // console.log(`GET /api/categories/${id}`);

        const categoryIdNum = parseCategoryId(id); // Use helper

        if (categoryIdNum === null) {
            return res.status(400).json({ error: 'Valid Category ID parameter is required.' });
        }

        // Query ONLY the categories table. Removed fallback logic.
        const { data, error, status } = await supabase
            .from(CATEGORIES_TABLE)
            .select('*')
            .eq('id', categoryIdNum)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // Standard Supabase code for "Not Found" on .single()
                return res.status(404).json({ error: 'Category not found.' });
            }
            console.error(`Supabase GET Category by ID Error (ID: ${id}):`, error);
            return res.status(status || 500).json({ error: 'Failed to fetch category', details: error.message });
        }

        // console.log(`Returning category ID ${id}.`);
        // Format the single category
         const formattedCategory = {
            ...data,
            id: parseCategoryId(data.id) ?? data.id,
            parent_id: parseCategoryId(data.parent_id)
         };
        return res.status(200).json(formattedCategory);

    } catch (error) {
        console.error(`GET /api/categories/:id Error:`, error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// POST /api/categories - Create a new category
// REMOVED express.json() middleware - assuming Vercel handles body parsing
app.post('/api/categories', async (req, res) => {
    try {
        // Vercel might populate req.body automatically
        const { name, parent_id } = req.body || {}; // Add fallback for safety
        // console.log('POST /api/categories - Body:', req.body);

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Category name is required.' });
        }

        const categoryToInsert = {
            name: name.trim(),
            parent_id: parseCategoryId(parent_id), // Allow null parent
            // created_at handled by DB
        };

        const { data, error, status } = await supabase
            .from(CATEGORIES_TABLE)
            .insert(categoryToInsert)
            .select()
            .single();

        if (error) {
            // Handle potential unique constraint violation, etc.
            console.error('Supabase POST Category Error:', error);
            return res.status(status || 500).json({ error: 'Failed to add category', details: error.message });
        }

        // console.log(`Category added with ID ${data?.id}.`);
         const formattedCategory = { // Format output
            ...data,
            id: parseCategoryId(data.id) ?? data.id,
            parent_id: parseCategoryId(data.parent_id)
         };
        return res.status(201).json(formattedCategory); // 201 Created

    } catch (error) {
        console.error('POST /api/categories Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// PUT /api/categories/:id - Update a category name
// REMOVED express.json() middleware - assuming Vercel handles body parsing
app.put('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Vercel might populate req.body automatically
        const { name } = req.body || {}; // Add fallback for safety
        // console.log(`PUT /api/categories/${id} - Body:`, req.body);

        const categoryIdNum = parseCategoryId(id);
        if (categoryIdNum === null) {
            return res.status(400).json({ error: 'Valid Category ID parameter is required.' });
        }

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ error: 'Category name is required for update.' });
        }

        const categoryToUpdate = {
            name: name.trim(),
        };

        const { data, error, status } = await supabase
            .from(CATEGORIES_TABLE)
            .update(categoryToUpdate)
            .eq('id', categoryIdNum)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Category not found for update.' });
            }
            // Handle other potential errors like unique constraint violations if names must be unique
            console.error(`Supabase PUT Category Error (ID: ${id}):`, error);
            return res.status(status || 500).json({ error: 'Failed to update category', details: error.message });
        }

        // console.log(`Category ID ${id} updated.`);
        const formattedCategory = { // Format output
            ...data,
            id: parseCategoryId(data.id) ?? data.id,
            parent_id: parseCategoryId(data.parent_id)
         };
        return res.status(200).json(formattedCategory);

    } catch (error) {
        console.error(`PUT /api/categories/:id Error:`, error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});


// DELETE /api/categories/:id - Delete a category
app.delete('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // console.log(`DELETE /api/categories/${id}`);

        const categoryIdNum = parseCategoryId(id);

        if (categoryIdNum === null) {
            return res.status(400).json({ error: 'Valid Category ID parameter is required.' });
        }

        // Add check: Prevent deleting category if it's used as parent_id? (Optional)
        // const { count: childCount, error: childError } = await supabase
        //    .from(CATEGORIES_TABLE)
        //    .select('id', { count: 'exact', head: true })
        //    .eq('parent_id', categoryIdNum);
        // if (childError) { /* handle error */ }
        // if (childCount > 0) return res.status(409).json({ error: 'Cannot delete category with subcategories.' });

        // Add check: Prevent deleting category if used by tasks/notes? (Optional)
        // This might involve setting FK constraints to RESTRICT or requires checks here.
        // Example check (adjust based on your needs):
        // const { count: taskCount, error: taskErr } = await supabase.from(TASKS_TABLE).select('id', { count: 'exact', head: true }).eq('id_category', categoryIdNum);
        // const { count: noteCount, error: noteErr } = await supabase.from(NOTES_TABLE).select('id', { count: 'exact', head: true }).eq('id_category', categoryIdNum);
        // if (taskCount > 0 || noteCount > 0) return res.status(409).json({ error: 'Cannot delete category associated with tasks or notes.' });


        // Proceed with deletion
        const { error, status, count } = await supabase
            .from(CATEGORIES_TABLE)
            .delete({ count: 'exact' }) // Request count
            .eq('id', categoryIdNum);

        if (error) {
            // Handle potential FK constraint errors if delete is restricted
            console.error(`Supabase DELETE Category Error (ID: ${id}):`, error);
            return res.status(status || 500).json({ error: 'Failed to delete category', details: error.message });
        }

        if (count === 0) {
            return res.status(404).json({ error: 'Category not found for deletion.' });
        }

        // console.log(`Category ID ${id} deleted.`);
        return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
        // Alternatively: return res.status(204).end();

    } catch (error) {
        console.error(`DELETE /api/categories/:id Error:`, error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});


// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.send('Notes, Tasks, & Categories API is running.');
});

// --- Export the app for Vercel ---
export default app;
