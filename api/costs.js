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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST'); // Allow GET and POST
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
      let rows = [];
      let fallbackCategoryMap = new Map();

      const { data, error } = await supabase
        .from(COSTS_TABLE)
        .select(`
          id,
          name,
          value,
          created_at,
          category_id,
          category:categories(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        const errorFragments = [error.code, error.message, error.details, error.hint]
          .filter(Boolean)
          .map((fragment) => String(fragment));
        const errorMessage = errorFragments.join(' ').trim();
        const shouldFallback = errorFragments.some((fragment) => /category/i.test(fragment));

        if (shouldFallback) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from(COSTS_TABLE)
            .select(`
              id,
              name,
              value,
              created_at,
              category_id
            `)
            .order('created_at', { ascending: false });

          if (fallbackError) {
            console.error('Fallback query for /api/costs failed:', fallbackError);
            throw fallbackError;
          }

          const fallbackRows = fallbackData ?? [];
          const categoryIds = Array.from(
            new Set(
              fallbackRows
                .map((row) => parseCategoryId(row.category_id))
                .filter((id) => id !== null),
            ),
          );

          if (categoryIds.length > 0) {
            const { data: categoryData, error: categoriesError } = await supabase
              .from('categories')
              .select('id, name')
              .in('id', categoryIds);

            if (categoriesError) {
              console.warn('Failed to load categories for fallback /api/costs query:', categoriesError);
            } else if (Array.isArray(categoryData)) {
              fallbackCategoryMap = new Map(
                categoryData
                  .map((category) => [parseCategoryId(category.id), category.name])
                  .filter(([id]) => id !== null),
              );
            }
          }

          console.warn('Falling back to basic cost query due to:', errorMessage);
          rows = fallbackRows;
        } else {
          throw error;
        }
      } else {
        rows = data ?? [];
      }

      // Ensure value is returned as a number
      const formattedData = rows.map((cost) => {
        const numericValue =
          typeof cost.value === 'number' ? cost.value : parseFloat(String(cost.value ?? '0'));
        const parsedCategoryId = 'category_id' in cost ? parseCategoryId(cost.category_id) : null;

        return {
          id: cost.id,
          name: cost.name,
          created_at: cost.created_at,
          value: Number.isFinite(numericValue) ? numericValue : 0,
          category_id: parsedCategoryId,
          category_name:
            cost.category?.name ??
            (parsedCategoryId !== null ? fallbackCategoryMap.get(parsedCategoryId) ?? null : null),
        };
      });
      console.log(`Returning ${formattedData.length} costs.`);
      return res.status(200).json(formattedData);
    }

    // --- POST /api/costs ---
    if (method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'costs') {
      const body = await parseJsonBody(req);
      console.log('POST /api/costs - Parsed Body:', body);
      const { name, value, category_id } = body;

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
      };
      const { data, error } = await supabase.from(COSTS_TABLE).insert(costToInsert).select().single();
      if (error) throw error;

      const formattedCost = {
        ...data,
        value: parseFloat(data.value),
        category_id: parseCategoryId(data.category_id),
        category_name: null,
      };
      console.log(`Cost added with ID ${formattedCost.id}.`);
      return res.status(201).json(formattedCost);
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
