// Script to add a title column to the notes table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY
);

async function addTitleColumn() {
  try {
    console.log('Attempting to add title column to notes table...');
    
    // Execute raw SQL to add the title column
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE notes 
        ADD COLUMN IF NOT EXISTS title TEXT;
      `
    });
    
    if (error) {
      console.error('Error adding title column:', error);
      
      // Try an alternative approach using direct SQL
      console.log('Trying alternative approach with direct SQL...');
      
      // This is a fallback if the RPC method doesn't work
      // Note: This requires appropriate permissions
      const { error: sqlError } = await supabase
        .from('_sql')
        .rpc('ALTER TABLE notes ADD COLUMN IF NOT EXISTS title TEXT');
      
      if (sqlError) {
        console.error('Alternative approach failed:', sqlError);
        console.log('Please run this SQL in the Supabase SQL editor:');
        console.log('ALTER TABLE notes ADD COLUMN IF NOT EXISTS title TEXT;');
      } else {
        console.log('Title column added successfully using alternative approach!');
      }
    } else {
      console.log('Title column added successfully!');
    }
    
    // Verify the column was added
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .limit(1);
    
    if (notesError) {
      console.error('Error verifying notes table structure:', notesError);
    } else {
      console.log('Notes table structure:', notesData.length > 0 ? Object.keys(notesData[0]) : 'No records found');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addTitleColumn();
