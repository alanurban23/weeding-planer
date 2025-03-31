import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Wczytaj zmienne środowiskowe
dotenv.config();

// Uzyskaj ścieżkę bieżącego pliku
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Dynamicznie importuj handlery
const importHandler = async (path) => {
  try {
    const module = await import(path);
    return module.default;
  } catch (error) {
    return (req, res) => res.status(500).json({ error: `Nie można załadować handlera: ${error.message}` });
  }
};

// Obsługa funkcji serverless
app.all('/api/tasks', async (req, res) => {
  try {
    const tasksHandler = await importHandler('./api/tasks.js');
    tasksHandler(req, res);
  } catch (error) {
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

app.all('/api/tasks/*', async (req, res) => {
  try {
    const tasksHandler = await importHandler('./api/tasks.js');
    tasksHandler(req, res);
  } catch (error) {
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

app.all('/api/notes', async (req, res) => {
  try {
    const notesHandler = await importHandler('./api/notes.js');
    notesHandler(req, res);
  } catch (error) {
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

app.all('/api/notes/*', async (req, res) => {
  try {
    const notesHandler = await importHandler('./api/notes.js');
    notesHandler(req, res);
  } catch (error) {
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

app.all('/api/categories', async (req, res) => {
  try {
    const categoriesHandler = await importHandler('./api/categories.js');
    categoriesHandler(req, res);
  } catch (error) {
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

app.all('/api/categories/*', async (req, res) => {
  try {
    const categoriesHandler = await importHandler('./api/categories.js');
    categoriesHandler(req, res);
  } catch (error) {
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

// Uruchom serwer
app.listen(PORT, () => {});
