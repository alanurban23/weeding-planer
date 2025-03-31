import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Wczytaj zmienne środowiskowe
dotenv.config();

// Wyświetl informacje o zmiennych środowiskowych (bez wartości kluczy)
console.log('Zmienne środowiskowe Supabase:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'dostępny' : 'niedostępny');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'dostępny' : 'niedostępny');
console.log('SUPABASE_API_KEY:', process.env.SUPABASE_API_KEY ? 'dostępny' : 'niedostępny');

// Uzyskaj ścieżkę bieżącego pliku
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Dynamicznie importuj handlery
const importHandler = async (path) => {
  try {
    const module = await import(path);
    return module.default;
  } catch (error) {
    console.error(`Błąd importowania handlera z ${path}:`, error);
    return (req, res) => res.status(500).json({ error: `Nie można załadować handlera: ${error.message}` });
  }
};

// Sprawdź, czy pliki istnieją
console.log('Sprawdzanie plików API:');
console.log('api/tasks.js istnieje:', fs.existsSync('./api/tasks.js'));
console.log('api/notes.js istnieje:', fs.existsSync('./api/notes.js'));

// Obsługa funkcji serverless
app.all('/api/tasks', async (req, res) => {
  try {
    const tasksHandler = await importHandler('./api/tasks.js');
    tasksHandler(req, res);
  } catch (error) {
    console.error('Błąd podczas obsługi /api/tasks:', error);
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

app.all('/api/tasks/*', async (req, res) => {
  try {
    const tasksHandler = await importHandler('./api/tasks.js');
    tasksHandler(req, res);
  } catch (error) {
    console.error('Błąd podczas obsługi /api/tasks/*:', error);
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

app.all('/api/notes', async (req, res) => {
  try {
    const notesHandler = await importHandler('./api/notes.js');
    notesHandler(req, res);
  } catch (error) {
    console.error('Błąd podczas obsługi /api/notes:', error);
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

app.all('/api/notes/*', async (req, res) => {
  try {
    const notesHandler = await importHandler('./api/notes.js');
    notesHandler(req, res);
  } catch (error) {
    console.error('Błąd podczas obsługi /api/notes/*:', error);
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

// Uruchom serwer
app.listen(PORT, () => {
  console.log(`Serwer API działa na porcie ${PORT}`);
});
