export default async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Brak zmiennych środowiskowych Supabase');
      return res.status(500).json({ error: 'Błąd konfiguracji serwera' });
    }

    console.log(`Łączenie z Supabase URL: ${supabaseUrl.substring(0, 15)}...`);
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/notes?select=id,content,created_at`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Nie można odczytać treści błędu');
      console.error(`Supabase request failed with status: ${response.status}, details: ${errorText}`);
      return res.status(response.status).json({ 
        error: `Błąd zapytania do Supabase: ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json(data);
  } catch (error) {
    console.error('Error:', error.message, error.stack);
    res.status(500).json({ error: 'Błąd serwera', message: error.message });
  }
};
