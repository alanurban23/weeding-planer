import { createClient } from '@supabase/supabase-js';

// Old Supabase credentials (from .env)
const oldSupabaseUrl = 'https://neshsbgsxdoqzclufqxm.supabase.co';
const oldSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lc2hzYmdzeGRvcXpjbHVmcXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNTM2NDYsImV4cCI6MjA1ODcyOTY0Nn0.ViiQ0EijVgsk80pY5EA68_GyMZ-8-jxqzYElwHwUDc8';

// New Supabase credentials (from your updated settings)
const newSupabaseUrl = process.env.SUPABASE_URL;
const newSupabaseKey = process.env.SUPABASE_API_KEY;

if (!newSupabaseUrl || !newSupabaseKey) {
  console.error('Missing new Supabase credentials in environment variables');
  process.exit(1);
}

const oldSupabase = createClient(oldSupabaseUrl, oldSupabaseKey);
const newSupabase = createClient(newSupabaseUrl, newSupabaseKey);

async function migrateData() {
  try {
    console.log('🚀 Starting data migration between:');
    console.log(`OLD: ${oldSupabaseUrl}`);
    console.log(`NEW: ${newSupabaseUrl}`);
    
    // Verify connections
    console.log('🔌 Testing database connections...');
    const { data: oldNotesCount } = await oldSupabase
      .from('notes')
      .select('*', { count: 'exact', head: true });
    console.log(`📊 Old Supabase has ${oldNotesCount?.length || 0} notes`);

    const { error: newTablesError } = await newSupabase
      .from('notes')
      .select('*', { count: 'exact', head: true });
    
    if (newTablesError?.code === '42P01') {
      console.log('ℹ️ Notes table does not exist in new Supabase (this is expected)');
    }
    
    // 1. Create tables in new Supabase
    console.log('🔨 Creating tables in new Supabase...');
    await newSupabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          notes TEXT[] NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          category TEXT NOT NULL,
          due_date TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `
    });

    // 2. Migrate notes
    console.log('📝 Migrating notes...');
    const { data: notes } = await oldSupabase
      .from('notes')
      .select('*');
    
    if (notes && notes.length > 0) {
      await newSupabase
        .from('notes')
        .insert(notes);
    }

    // 3. Migrate tasks  
    console.log('✅ Migrating tasks...');
    const { data: tasks } = await oldSupabase
      .from('tasks')
      .select('*');
    
    if (tasks && tasks.length > 0) {
      await newSupabase
        .from('tasks')
        .insert(tasks);
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
