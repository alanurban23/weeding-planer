import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

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

// Funkcja pomocnicza do tworzenia routerów API
const createApiRouter = (basePath, handlerPath) => {
  app.all(`${basePath}`, async (req, res) => {
    try {
      const handler = await importHandler(handlerPath);
      handler(req, res);
    } catch (error) {
      res.status(500).json({ error: `Błąd serwera: ${error.message}` });
    }
  });

  app.all(`${basePath}/*`, async (req, res) => {
    try {
      const handler = await importHandler(handlerPath);
      handler(req, res);
    } catch (error) {
      res.status(500).json({ error: `Błąd serwera: ${error.message}` });
    }
  });
};

// Konfiguracja routerów API
createApiRouter('/api/tasks', './api/tasks.js');
createApiRouter('/api/notes', './api/notes.js');
createApiRouter('/api/categories', './api/categories.js');
createApiRouter('/api/guests', './api/guests.js');

// Uruchom serwer
app.listen(PORT, () => {});
