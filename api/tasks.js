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

const TASKS_TABLE = 'tasks';
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

// --- Helper Function for Formatting Task Output ---
const formatTask = (task) => {
  if (!task) return null;
  return {
    ...task,
    id: task.id, // Ensure ID is present
    title: task.title,
    notes: Array.isArray(task.notes) ? task.notes : [],
    completed: task.completed,
    dueDate: task.due_date, // Rename field for frontend consistency
    id_category: task.id_category,
    created_at: task.created_at,
    // Add category name if needed via separate query or join in the future
  };
};

// Fetch name of category by id
async function fetchCategoryName(id) {
  if (id === null || id === undefined) return null;
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .select('name')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Failed to fetch category name', id, error.message);
    return null;
  }
  return data?.name || null;
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
  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean); // e.g., ['api', 'tasks', '70'] or ['api', 'tasks', '70', 'toggle']

  try {
    // --- GET /api/tasks ---
    if (method === 'GET' && pathSegments.length === 2 && pathSegments[1] === 'tasks') {
      console.log('GET /api/tasks');
      let query = supabase
        .from(TASKS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      let tasks = data?.map(formatTask) || [];

      const categoryIds = [...new Set(tasks.map(t => t.id_category).filter(id => id))];
      if (categoryIds.length > 0) {
        const { data: categoriesData, error: catErr } = await supabase
          .from(CATEGORIES_TABLE)
          .select('id,name')
          .in('id', categoryIds);
        if (!catErr && categoriesData) {
          const map = new Map(categoriesData.map(c => [c.id, c.name]));
          tasks = tasks.map(t => ({ ...t, category: t.category || map.get(t.id_category) || null }));
        }
      }

      console.log(`Returning ${tasks.length} tasks.`);
      return res.status(200).json(tasks);
    }

    // --- POST /api/tasks ---
    if (method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'tasks') {
      const body = await parseJsonBody(req);
      console.log('POST /api/tasks - Parsed Body:', body);
      const { title, notes, completed, dueDate, id_category } = body;

      if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: 'Task title is required.' });
      }
      const categoryId = parseCategoryId(id_category);
      const categoryName = await fetchCategoryName(categoryId);
      const taskToInsert = {
        title: title.trim(),
        notes: Array.isArray(notes) ? notes : [],
        completed: Boolean(completed) || false,
        due_date: dueDate || null,
        id_category: categoryId,
        category: categoryName || null,
      };
      const { data, error } = await supabase.from(TASKS_TABLE).insert(taskToInsert).select().single();
      if (error) throw error;
      console.log(`Task added with ID ${data?.id}.`);
      return res.status(201).json(formatTask(data));
    }

    // --- GET /api/tasks/:id ---
    if (method === 'GET' && pathSegments.length === 3 && pathSegments[1] === 'tasks') {
      const id = pathSegments[2];
      console.log(`GET /api/tasks/${id}`);
      if (!id || isNaN(parseInt(id, 10))) {
        return res.status(400).json({ error: 'Valid Task ID parameter is required.' });
      }
      const { data, error, status } = await supabase.from(TASKS_TABLE).select('*').eq('id', parseInt(id, 10)).single();
      if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'Task not found.' });
        throw error;
      }
      console.log(`Returning task ID ${id}.`);
      return res.status(200).json(formatTask(data));
    }

    // --- PUT /api/tasks/:id ---
    if (method === 'PUT' && pathSegments.length === 3 && pathSegments[1] === 'tasks') {
        const id = pathSegments[2];
        const body = await parseJsonBody(req);
        console.log(`PUT /api/tasks/${id} - Parsed Body:`, body);
        const { title, notes, completed, dueDate, id_category } = body;

        if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'Valid Task ID parameter is required.' });

        const taskToUpdate = {};
        if (title !== undefined) {
            if (typeof title !== 'string' || title.trim() === '') return res.status(400).json({ error: 'Task title must be a non-empty string if provided.' });
            taskToUpdate.title = title.trim();
        }
        if (notes !== undefined) taskToUpdate.notes = Array.isArray(notes) ? notes : [];
        if (completed !== undefined) taskToUpdate.completed = Boolean(completed);
        if (dueDate !== undefined) taskToUpdate.due_date = dueDate;
        if (id_category !== undefined) {
            const parsedCat = parseCategoryId(id_category);
            taskToUpdate.id_category = parsedCat;
            const catName = await fetchCategoryName(parsedCat);
            if (catName !== null) {
                taskToUpdate.category = catName;
            }
        }

        if (Object.keys(taskToUpdate).length === 0) {
           return res.status(400).json({ error: 'No valid fields provided for update.' });
        }
        console.log(`Attempting to update task ${id} with:`, JSON.stringify(taskToUpdate, null, 2));
        const { data, error, status } = await supabase.from(TASKS_TABLE).update(taskToUpdate).eq('id', parseInt(id, 10)).select().single();
        if (error) {
           if (error.code === 'PGRST116') return res.status(404).json({ error: 'Task not found for update.' });
           console.error(`Supabase PUT Task Error (ID: ${id}): Code=${error.code}, Message=${error.message}`);
           return res.status(status || 500).json({ error: 'Failed to update task in database', details: error.message, code: error.code });
        }
        console.log(`Task ID ${id} updated.`);
        return res.status(200).json(formatTask(data));
    }

    // --- PATCH /api/tasks/:id/toggle ---
    if (method === 'PATCH' && pathSegments.length === 4 && pathSegments[1] === 'tasks' && pathSegments[3] === 'toggle') {
        const id = pathSegments[2];
        console.log(`PATCH /api/tasks/${id}/toggle`);
        if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'Valid Task ID parameter is required.' });

        const { data: currentTask, error: fetchError } = await supabase.from(TASKS_TABLE).select('completed').eq('id', parseInt(id, 10)).single();
        if (fetchError) {
            if (fetchError.code === 'PGRST116') return res.status(404).json({ error: 'Task not found to toggle.' });
            throw fetchError;
        }
        const { data, error, status } = await supabase.from(TASKS_TABLE).update({ completed: !currentTask.completed }).eq('id', parseInt(id, 10)).select().single();
        if (error) throw error;
        console.log(`Task ID ${id} toggled.`);
        return res.status(200).json(formatTask(data));
    }

    // --- DELETE /api/tasks/:id ---
    if (method === 'DELETE' && pathSegments.length === 3 && pathSegments[1] === 'tasks') {
        const id = pathSegments[2];
        console.log(`DELETE /api/tasks/${id}`);
        if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: 'Valid Task ID parameter is required.' });

        const { error, status, count } = await supabase.from(TASKS_TABLE).delete({ count: 'exact' }).eq('id', parseInt(id, 10));
        if (error) throw error;
        if (count === 0) return res.status(404).json({ error: 'Task not found for deletion.' });
        console.log(`Task ID ${id} deleted.`);
        return res.status(200).json({ success: true, message: 'Task deleted successfully.' });
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
