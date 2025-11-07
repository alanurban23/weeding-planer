import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCostsData() {
  console.log('Sprawdzam dane kosztów w bazie...\n');

  // Check costs
  const { data: costs, error: costsError } = await supabase
    .from('costs')
    .select(`
      id,
      name,
      value,
      created_at,
      category_id,
      category:categories(name)
    `)
    .order('created_at', { ascending: false });

  if (costsError) {
    console.error('Błąd pobierania kosztów:', costsError);
  } else {
    console.log(`Znaleziono ${costs?.length || 0} kosztów w bazie:`);
    console.log(JSON.stringify(costs, null, 2));
  }

  // Check categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (categoriesError) {
    console.error('\nBłąd pobierania kategorii:', categoriesError);
  } else {
    console.log(`\nZnaleziono ${categories?.length || 0} kategorii:`);
    console.log(JSON.stringify(categories, null, 2));
  }
}

checkCostsData().catch(console.error);
