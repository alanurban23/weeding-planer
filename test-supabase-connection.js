console.log('🚀 Starting Supabase connection test...');
console.log('Using Supabase URL:', process.env.SUPABASE_URL);
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  
  try {
    console.log('🔎 Checking notes table...');
    const { data: notes, error: notesError, count: notesCount } = await supabase
      .from('notes')
      .select('*', { count: 'exact' })
      .limit(1);

    if (notesError) {
      console.error('❌ Notes table error:', notesError);
      throw notesError;
    }
    
    console.log('✅ Successfully connected to Supabase');
    console.log(`📝 Found ${notesCount} notes in the database`);
    
    console.log('🔎 Checking tasks table...');
    const { data: tasks, error: tasksError, count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .limit(1);

    if (tasksError) {
      console.error('❌ Tasks table error:', tasksError);
      throw tasksError;
    }
    console.log(`✅ Found ${tasksCount} tasks in the database`);

  } catch (error) {
    console.error('❌ Supabase connection failed:');
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();
