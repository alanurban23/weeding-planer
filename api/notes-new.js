// Public API endpoint with guaranteed public access
import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
  // Set Cache-Control header
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json(data || []);
    
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
