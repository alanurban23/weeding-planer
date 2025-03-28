import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { MemStorage } from './server/storage';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_API_KEY environment variables must be set');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Create an instance of MemStorage to get sample tasks
const memStorage = new MemStorage();

async function migrateSampleDataToSupabase() {
  try {
    console.log('Starting migration of sample data to Supabase...');

    // Get all tasks from MemStorage
    const tasks = await memStorage.getTasks();
    console.log(`Found ${tasks.length} tasks in MemStorage`);

    // Check if the tasks table exists in Supabase
    const { error: tableCheckError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.code === '42P01') {
      console.error('Error: The "tasks" table does not exist in Supabase');
      console.log('Creating "tasks" table in Supabase...');
      
      // Create the tasks table
      const { error: createTableError } = await supabase.rpc('create_tasks_table');
      
      if (createTableError) {
        console.error('Error creating tasks table:', createTableError);
        
        // Try direct SQL approach
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql: `
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
        
        if (sqlError) {
          console.error('Error creating tasks table with SQL:', sqlError);
          return;
        }
      }
      
      console.log('Tasks table created successfully');
    }

    // Insert tasks into Supabase
    console.log('Inserting tasks into Supabase...');
    
    // Process tasks in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      // Convert tasks to the format expected by Supabase
      const supabaseTasks = batch.map(task => ({
        id: task.id,
        title: task.title,
        notes: task.notes || [],
        completed: task.completed || false,
        category: task.category,
        due_date: task.dueDate,
        created_at: task.createdAt
      }));
      
      // Insert tasks into Supabase
      const { error } = await supabase
        .from('tasks')
        .upsert(supabaseTasks, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} tasks)`);
      }
    }

    // Get all notes from MemStorage
    const notes = await memStorage.getNotes();
    console.log(`Found ${notes.length} notes in MemStorage`);

    // Check if the notes table exists in Supabase
    const { error: notesTableCheckError } = await supabase
      .from('notes')
      .select('id')
      .limit(1);

    if (notesTableCheckError && notesTableCheckError.code === '42P01') {
      console.error('Error: The "notes" table does not exist in Supabase');
      console.log('Creating "notes" table in Supabase...');
      
      // Create the notes table
      const { error: createNotesTableError } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `
      });
      
      if (createNotesTableError) {
        console.error('Error creating notes table:', createNotesTableError);
        return;
      }
      
      console.log('Notes table created successfully');
    }

    // Insert notes into Supabase if there are any
    if (notes.length > 0) {
      console.log('Inserting notes into Supabase...');
      
      // Process notes in batches
      for (let i = 0; i < notes.length; i += batchSize) {
        const batch = notes.slice(i, i + batchSize);
        
        // Convert notes to the format expected by Supabase
        const supabaseNotes = batch.map(note => ({
          id: note.id,
          content: note.content,
          created_at: note.createdAt
        }));
        
        // Insert notes into Supabase
        const { error } = await supabase
          .from('notes')
          .upsert(supabaseNotes, { onConflict: 'id' });
        
        if (error) {
          console.error(`Error inserting notes batch ${i / batchSize + 1}:`, error);
        } else {
          console.log(`Inserted notes batch ${i / batchSize + 1} (${batch.length} notes)`);
        }
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Run the migration
migrateSampleDataToSupabase()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error in migration script:', error);
    process.exit(1);
  });
