import { createClient } from '@supabase/supabase-js';

const OLD_SUPABASE_URL = 'https://neshsbgsxdoqzclufqxm.supabase.co';
const OLD_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lc2hzYmdzeGRvcXpjbHVmcXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxNTM2NDYsImV4cCI6MjA1ODcyOTY0Nn0.ViiQ0EijVgsk80pY5EA68_GyMZ-8-jxqzYElwHwUDc8';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const NEW_SUPABASE_URL = process.env.SUPABASE_URL;
const NEW_SUPABASE_KEY = process.env.SUPABASE_API_KEY;

if (!NEW_SUPABASE_URL || !NEW_SUPABASE_KEY) {
  console.error('❌ Missing new Supabase credentials in .env file');
  console.error('Please ensure SUPABASE_URL and SUPABASE_API_KEY are set');
  process.exit(1);
}

async function runDiagnostics() {
  console.log('🚀 Starting Supabase Diagnostics');
  
  // Initialize clients
  const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
  const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

  // Test connection to old Supabase
  try {
    console.log('\n🔍 Testing OLD Supabase connection...');
    // Check for notes table
    const { data: notes, error: notesError } = await oldSupabase
      .from('notes')
      .select('*')
      .limit(1);
    
    if (notesError?.code === '42P01') {
      console.log('ℹ️ Notes table does not exist in old Supabase');
    } else if (notes) {
      console.log('✅ Found notes table in old Supabase');
    }
  } catch (oldError) {
    console.error('❌ Old Supabase connection failed:', oldError.message);
  }

  // Test connection to new Supabase
  try {
    console.log('\n🔍 Testing NEW Supabase connection...');
    const { data: newTables } = await newSupabase.rpc('list_tables');
    console.log('✅ New Supabase connection successful');
    console.log('📋 Tables in new Supabase:', newTables || 'Could not list tables');
  } catch (newError) {
    console.error('❌ New Supabase connection failed:', newError.message);
  }

  console.log('\nDiagnostics complete');
}

runDiagnostics().catch(console.error);
