import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { URL } from 'url';

// Load environment variables
dotenv.config();

// --- Configuration ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL ERROR: Supabase URL and Anon Key must be defined.");
  throw new Error("Missing Supabase configuration.");
}

// --- Initialize Supabase Client ---
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
});

const CATEGORIES_TABLE = 'categories';

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
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust in production
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, url } = req;
  const parsedUrl = new URL(url, `http://${req.headers.host}`);
  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean); // e.g., ['api', 'categories', '70']

  try {
    // --- GET /api/categories ---
    if (method === 'GET' && pathSegments.length === 2 && pathSegments[1] === 'categories') {
      console.log('GET /api/categories');
      const { data, error, status } = await supabase
        .from(CATEGORIES_TABLE)
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      const formattedCategories = data?.map(cat => ({
        ...cat,
        id: parseCategoryId(cat.id) ?? cat.id,
        parent_id: parseCategoryId(cat.parent_id)
      })) || [];
      console.log(`Returning ${formattedCategories.length} categories.`);
      return res.status(200).json(formattedCategories);
    }

    // --- GET /api/categories/:id ---
    if (method === 'GET' && pathSegments.length === 3 && pathSegments[1] === 'categories') {
      const id = pathSegments[2];
      console.log(`GET /api/categories/${id}`);
      const categoryIdNum = parseCategoryId(id);
      if (categoryIdNum === null) {
        return res.status(400).json({ error: 'Valid Category ID parameter is required.' });
      }
      const { data, error, status } = await supabase.from(CATEGORIES_TABLE).select('*').eq('id', categoryIdNum).single();
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Category not found.' });
        throw error;
      }
      const formattedCategory = { ...data, id: parseCategoryId(data.id) ?? data.id, parent_id: parseCategoryId(data.parent_id) };
      console.log(`Returning category ID ${id}.`);
      return res.status(200).json(formattedCategory);
    }

    // --- POST /api/categories ---
    if (method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'categories') {
      const body = await parseJsonBody(req);
      console.log('POST /api/categories - Parsed Body:', body);
      const { name, parent_id } = body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Category name is required.' });
      }
      const categoryToInsert = { name: name.trim(), parent_id: parseCategoryId(parent_id) };
      const { data, error, status } = await supabase.from(CATEGORIES_TABLE).insert(categoryToInsert).select().single();
      if (error) throw error;
      const formattedCategory = { ...data, id: parseCategoryId(data.id) ?? data.id, parent_id: parseCategoryId(data.parent_id) };
      console.log(`Category added with ID ${data?.id}.`);
      return res.status(201).json(formattedCategory);
    }

    // --- PUT /api/categories/:id ---
    if (method === 'PUT' && pathSegments.length === 3 && pathSegments[1] === 'categories') {
      const id = pathSegments[2];
      const body = await parseJsonBody(req);
      console.log(`PUT /api/categories/${id} - Parsed Body:`, body);
      const { name } = body;
      const categoryIdNum = parseCategoryId(id);
      if (categoryIdNum === null) {
        return res.status(400).json({ error: 'Valid Category ID parameter is required.' });
      }
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Category name is required for update.' });
      }
      const categoryToUpdate = { name: name.trim() };
      console.log(`Attempting to update category ${id} with:`, JSON.stringify(categoryToUpdate, null, 2));
      const { data, error, status } = await supabase.from(CATEGORIES_TABLE).update(categoryToUpdate).eq('id', categoryIdNum).select().single();
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Category not found for update.' });
        console.error(`Supabase PUT Category Error (ID: ${id}): Code=${error.code}, Message=${error.message}`);
        return res.status(status || 500).json({ error: 'Failed to update category in database', details: error.message, code: error.code });
      }
      const formattedCategory = { ...data, id: parseCategoryId(data.id) ?? data.id, parent_id: parseCategoryId(data.parent_id) };
      console.log(`Category ID ${id} updated.`);
      return res.status(200).json(formattedCategory);
    }

    // --- DELETE /api/categories/:id ---
    if (method === 'DELETE' && pathSegments.length === 3 && pathSegments[1] === 'categories') {
      const id = pathSegments[2];
      console.log(`DELETE /api/categories/${id}`);
      const categoryIdNum = parseCategoryId(id);
      if (categoryIdNum === null) {
        return res.status(400).json({ error: 'Valid Category ID parameter is required.' });
      }

      // Check if any tasks are using this category
      const { count: taskCount, error: taskCheckError } = await supabase
        .from('tasks') // Check the tasks table
        .select('id', { count: 'exact', head: true }) // Just need the count
        .eq('id_category', categoryIdNum);

      if (taskCheckError) {
        console.error(`Error checking tasks for category ${categoryIdNum}:`, taskCheckError);
        // Decide if this should prevent deletion or just log. Let's prevent for safety.
        return res.status(500).json({ error: 'Failed to check associated tasks', details: taskCheckError.message });
      }

      if (taskCount > 0) {
        console.log(`Attempted to delete category ${categoryIdNum} which is still in use by ${taskCount} tasks.`);
        return res.status(409).json({ // 409 Conflict is appropriate here
          error: 'Kategoria jest w użyciu',
          details: `Nie można usunąć kategorii, ponieważ jest przypisana do ${taskCount} zadań.`
        });
      }

      // Proceed with deletion if no tasks are using it
      const { error, status, count } = await supabase.from(CATEGORIES_TABLE).delete({ count: 'exact' }).eq('id', categoryIdNum);

      // Handle potential deletion errors (though FK violation should be caught above now)
      if (error) {
         console.error(`Supabase DELETE Category Error (ID: ${id}): Code=${error.code}, Message=${error.message}`);
         // Don't throw here, return a specific error response
         return res.status(status || 500).json({ error: 'Failed to delete category', details: error.message });
      }

      if (count === 0) return res.status(404).json({ error: 'Category not found for deletion.' });
      console.log(`Category ID ${id} deleted.`);
      return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
    }

    // --- Not Found ---
    res.status(404).json({ error: 'Not Found', path: parsedUrl.pathname });

  } catch (error) {
    console.error(`API Error (${method} ${url}):`, error);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }
}
