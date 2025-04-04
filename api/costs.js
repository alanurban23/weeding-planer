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
      const { data, error } = await supabase
        .from(COSTS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Ensure value is returned as a number
      const formattedData = data?.map(cost => ({
        ...cost,
        value: parseFloat(cost.value) // Convert DECIMAL to number
      })) || [];
      console.log(`Returning ${formattedData.length} costs.`);
      return res.status(200).json(formattedData);
    }

    // --- POST /api/costs ---
    if (method === 'POST' && pathSegments.length === 2 && pathSegments[1] === 'costs') {
      const body = await parseJsonBody(req);
      console.log('POST /api/costs - Parsed Body:', body);
      const { name, value } = body;

      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Cost name is required.' });
      }
      const numericValue = parseFloat(value);
      if (isNaN(numericValue) || numericValue <= 0) {
        return res.status(400).json({ error: 'Valid positive cost value is required.' });
      }

      const costToInsert = {
        name: name.trim(),
        value: numericValue,
      };
      const { data, error } = await supabase.from(COSTS_TABLE).insert(costToInsert).select().single();
      if (error) throw error;

      const formattedCost = { ...data, value: parseFloat(data.value) };
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
