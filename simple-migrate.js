import { createClient } from '@supabase/supabase-js';

const oldSupabase = createClient(
  'https://neshsbgsxdoqzclufqxm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lc2hzYmdzeGRvcXpjbHVmcXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNTM2NDYsImV4cCI6MjA1ODcyOTY0Nn0.ViiQ0EijVgsk80pY5EA68_GyMZ-8-jxqzYElwHwUDc8'
);

const newSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

async function migrateTable(tableName) {
  try {
    console.log(`\n=== Starting ${tableName} migration ===`);
    
    // Check source data
    console.log(`🔍 Fetching ${tableName} from old Supabase...`);
    const { data, error: fetchError } = await oldSupabase
      .from(tableName)
      .select('*');
    
    if (fetchError) throw fetchError;
    if (!data?.length) {
      console.log(`ℹ️ No ${tableName} found to migrate`);
      return;
    }

    console.log(`📊 Found ${data.length} ${tableName} records`);
    
    // Insert into new Supabase
    console.log(`⬆️ Uploading to new Supabase...`);
    const { error: insertError } = await newSupabase
      .from(tableName)
      .insert(data);
    
    if (insertError) throw insertError;
    console.log(`✅ Successfully migrated ${data.length} ${tableName}`);

  } catch (error) {
    console.error(`❌ ${tableName} migration failed:`);
    console.error(error);
    process.exit(1);
  }
}

async function run() {
  await migrateTable('notes');
  await migrateTable('tasks');
  console.log('Migration complete!');
}

run().catch(console.error);
