// Public API endpoint - no authentication required
import { createClient } from '@supabase/supabase-js';

// Bypass Vercel's authentication by adding this header
const BYPASS_VERCEL_AUTH = {
  'x-vercel-protection-bypass': process.env.VERCEL_AUTH_BYPASS_SECRET || ''
};

export default async (req, res) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: BYPASS_VERCEL_AUTH
        }
      }
    );

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data || []);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch notes',
      details: error.message 
    });
  }
};
