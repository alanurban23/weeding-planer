import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { URL } from 'url';
import nodeFetch from 'node-fetch';

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
  global: {
    fetch: nodeFetch,
  },
});

const COSTS_TABLE = 'costs';

function parseCategoryId(categoryId) {
  if (categoryId === undefined || categoryId === null || categoryId === '') {
    return null;
  }
  const parsed = parseInt(String(categoryId), 10);
  if (Number.isNaN(parsed)) {
    console.warn(`Received invalid category_id "${categoryId}". Treating as null.`);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
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
  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean); // e.g., ['api', 'costs']

  try {
    // --- GET /api/costs ---
    if (method === 'GET' && pathSegments.length === 2 && pathSegments[1] === 'costs') {
      console.log('GET /api/costs');
      const { data, error } = await supabase
        .from(COSTS_TABLE)
        .select(`
          id,
          name,
          value,
          created_at,
          category_id,
          total_amount,
          due_date,
          paid_date,
          notes,
          category:categories(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Ensure value is returned as a number
      const formattedData = data?.map(cost => ({
        id: cost.id,
        name: cost.name,
        created_at: cost.created_at,
        value: parseFloat(cost.value), // Convert DECIMAL to number
        category_id: parseCategoryId(cost.category_id),
        category_name: cost.category?.name ?? null,
        total_amount: cost.total_amount ? parseFloat(cost.total_amount) : null,
        due_date: cost.due_date,
        paid_date: cost.paid_date,
        notes: cost.notes,
      })) || [];
      console.log(`Returning ${formattedData.length} costs.`);
      return res.status(200).json(formattedData);
    }

    // --- POST /api/costs ---
    if (method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'costs') {
      const body = await parseJsonBody(req);
      console.log('POST /api/costs - Parsed Body:', body);
      const { name, value, category_id, total_amount, due_date, paid_date, notes } = body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Cost name is required.' });
      }
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || numericValue <= 0) {
        return res.status(400).json({ error: 'Valid positive cost value is required.' });
      }

      const parsedCategoryId = parseCategoryId(category_id);
      if (category_id !== undefined && category_id !== null && parsedCategoryId === null) {
        return res.status(400).json({ error: 'category_id must be a valid number or null.' });
      }

      const costToInsert = {
        name: name.trim(),
        value: numericValue,
        category_id: parsedCategoryId,
        total_amount: total_amount ? parseFloat(total_amount) : null,
        due_date: due_date || null,
        paid_date: paid_date || null,
        notes: notes?.trim() || null,
      };
      const { data, error } = await supabase.from(COSTS_TABLE).insert(costToInsert).select().single();
      if (error) throw error;

      const formattedCost = {
        ...data,
        value: parseFloat(data.value),
        category_id: parseCategoryId(data.category_id),
        category_name: null,
        total_amount: data.total_amount ? parseFloat(data.total_amount) : null,
      };
      console.log(`Cost added with ID ${formattedCost.id}.`);
      return res.status(201).json(formattedCost);
    }

    // --- PUT /api/costs/:id ---
    if (method === 'PUT' && pathSegments.length === 3 && pathSegments[1] === 'costs') {
      const id = pathSegments[2];
      const body = await parseJsonBody(req);
      console.log(`PUT /api/costs/${id} - Parsed Body:`, body);
      const { name, value, category_id, total_amount, due_date, paid_date, notes } = body;

      const costId = parseInt(id, 10);
      if (isNaN(costId)) {
        return res.status(400).json({ error: 'Valid cost ID is required.' });
      }

      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Cost name is required.' });
      }
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || numericValue <= 0) {
        return res.status(400).json({ error: 'Valid positive cost value is required.' });
      }

      const parsedCategoryId = parseCategoryId(category_id);
      if (category_id !== undefined && category_id !== null && category_id !== '' && parsedCategoryId === null) {
        return res.status(400).json({ error: 'category_id must be a valid number or null.' });
      }

      const costToUpdate = {
        name: name.trim(),
        value: numericValue,
        category_id: parsedCategoryId,
        total_amount: total_amount ? parseFloat(total_amount) : null,
        due_date: due_date || null,
        paid_date: paid_date || null,
        notes: notes?.trim() || null,
      };

      const { data, error } = await supabase
        .from(COSTS_TABLE)
        .update(costToUpdate)
        .eq('id', costId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Cost not found.' });
        }
        throw error;
      }

      const formattedCost = {
        ...data,
        value: parseFloat(data.value),
        category_id: parseCategoryId(data.category_id),
        category_name: null,
        total_amount: data.total_amount ? parseFloat(data.total_amount) : null,
      };
      console.log(`Cost ID ${id} updated.`);
      return res.status(200).json(formattedCost);
    }

    // --- DELETE /api/costs/:id ---
    if (method === 'DELETE' && pathSegments.length === 3 && pathSegments[1] === 'costs') {
      const id = pathSegments[2];
      console.log(`DELETE /api/costs/${id}`);

      const costId = parseInt(id, 10);
      if (isNaN(costId)) {
        return res.status(400).json({ error: 'Valid cost ID is required.' });
      }

      const { error, count } = await supabase
        .from(COSTS_TABLE)
        .delete({ count: 'exact' })
        .eq('id', costId);

      if (error) throw error;

      if (count === 0) {
        return res.status(404).json({ error: 'Cost not found.' });
      }

      console.log(`Cost ID ${id} deleted.`);
      return res.status(200).json({ success: true, message: 'Cost deleted successfully.' });
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
