// This file is used as the entry point for Vercel's serverless functions
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Supabase client
const createSupabaseClient = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

// Create a simple Express app
const app = express();
// app.use(express.json()); // REMOVED global body parser - let individual files handle it if needed

// Add middleware to handle the "i.map is not a function" error
app.use((req, res, next) => {
  // Original map function
  const originalArrayMap = Array.prototype.map;
  
  // Safe map function that checks if the object is an array first
  Array.prototype.map = function(...args) {
    if (!Array.isArray(this)) {
      return [];
    }
    return originalArrayMap.apply(this, args);
  };
  
  next();
});

// Setup API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// API route for tasks
app.get('/api/tasks', async (req, res) => {
  try {
    // Inicjalizacja klienta Supabase z kluczem serwisowym
    const supabase = createSupabaseClient();
    
    // Pobierz zadania
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error?.code === '42P01') {
      // Tabela nie istnieje
      return res.status(200).json([]);
    }
    if (error) {
      throw error;
    }
    
    // Sprawdźmy, czy tasks jest tablicą
    if (!Array.isArray(tasks)) {
      return res.status(200).json([]);
    }
    
    res.json(tasks || []);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch tasks',
      message: error.message 
    });
  }
});

// API route for categories
app.get('/api/categories', async (req, res) => {
  try {
    // Inicjalizacja klienta Supabase z kluczem serwisowym
    const supabase = createSupabaseClient();
    
    // Sprawdź, czy zmienne środowiskowe są dostępne
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_API_KEY) {
      return res.status(500).json({ error: 'Błąd konfiguracji serwera' });
    }
    
    // Pobierz kategorie z tabeli tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('category');
    
    if (tasksError) {
      return res.status(500).json({ error: tasksError.message });
    }
    
    // Wyodrębniamy unikalne kategorie z zadań
    const categoriesFromTasks = Array.from(
      new Set(tasks.map(task => task.category).filter(Boolean))
    );
    
    // Formatujemy kategorie jako obiekty z polami id i name
    const formattedCategories = categoriesFromTasks.map(category => ({
      id: category,
      name: category
    }));
    
    return res.status(200).json(formattedCategories);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Public API route for notes (no authentication required)
app.get('/api/notes', async (req, res) => {
  try {
    const supabase = createSupabaseClient();

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Błąd bazy danych' });
    }

    res.json(notes || []);
  } catch (error) {
    res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// Endpoint do dodawania notatek
app.post('/api/notes', async (req, res) => {
  try {
    const supabase = createSupabaseClient();
    
    // Sprawdź, czy mamy treść notatki
    if (!req.body || !req.body.content) {
      return res.status(400).json({ error: 'Brak wymaganej treści notatki' });
    }
    
    // Przygotuj dane notatki (bez id - Supabase wygeneruje je automatycznie)
    const noteData = {
      content: req.body.content,
      created_at: new Date().toISOString()
    };
    
    // Dodaj notatkę do bazy danych
    const { data, error } = await supabase
      .from('notes')
      .insert(noteData)
      .select();
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(201).json(data[0] || { success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Wewnętrzny błąd serwera' });
  }
});

// Setup a catch-all route for API
app.all('/api/*', (req, res) => {
  res.status(200).json({
    message: 'Wedding Planner API',
    path: req.path,
    method: req.method,
    query: req.query
  });
});

// Export the Express app as a serverless function
export default app;
