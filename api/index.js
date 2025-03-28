// This file is used as the entry point for Vercel's serverless functions
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a simple Express app
const app = express();

// Setup a route that provides information about the application
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Setup a catch-all route
app.get('*', (req, res) => {
  res.status(200).json({
    message: 'Wedding Planner API',
    path: req.path,
    query: req.query
  });
});

// Export the Express app as a serverless function
export default app;
