// This file is used as the entry point for Vercel's serverless functions
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Create a simple Express app
const app = express();
app.use(express.json());

// Add middleware to handle the "i.map is not a function" error
app.use((req, res, next) => {
  // Original map function
  const originalArrayMap = Array.prototype.map;
  
  // Safe map function that checks if the object is an array first
  Array.prototype.map = function(...args) {
    if (!Array.isArray(this)) {
      console.warn('Attempted to call map on a non-array:', this);
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
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_API_KEY);
    
    // Check if tasks table exists
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*');

    if (error?.code === '42P01') {
      // Table doesn't exist
      return res.status(200).json([]);
    }
    if (error) throw error;
    
    res.json(tasks || []);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tasks',
      message: error.message 
    });
  }
});

// Import required modules for notes API
import { fetchNotes } from '../server/supabase-notes';
import { supabase } from '../server/supabase';

// API route for notes
app.get('/api/notes', async (req, res) => {
  try {
    // Initialize Supabase connection
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Fetch notes from Supabase
    const notes = await fetchNotes();
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notes',
      message: error.message 
    });
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
