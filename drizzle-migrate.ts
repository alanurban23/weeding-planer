import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from "./shared/schema";

// Sprawdzamy, czy zmienne środowiskowe są ustawione
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Brak wymaganych zmiennych środowiskowych SUPABASE_URL i SUPABASE_API_KEY');
}

// Ekstrahujemy informacje o hoście, porcie i nazwie bazy danych z URL
const url = new URL(supabaseUrl);
const host = url.hostname;
const database = url.pathname.substring(1); // Usuwamy ukośnik
const password = supabaseKey;
const user = 'postgres';
const port = 5432;

// Tworzymy URL połączenia w formacie postgres://user:password@host:port/database
const connectionString = `postgres://${user}:${password}@${host}:${port}/${database}`;

console.log('Łączenie z bazą danych Supabase...');

async function performMigration() {
  try {
    // Tworzymy klienta połączenia
    const sql = postgres(connectionString, { max: 1 });
    const db = drizzle(sql, { schema });

    console.log('Wykonywanie migracji...');
    await db.insert(schema.tasks).values({
      id: "test-drizzle",
      title: "Test z Drizzle",
      notes: ["Testowa notatka"],
      completed: false,
      category: "Test",
      dueDate: new Date(),
      createdAt: new Date()
    }).execute();
    
    console.log('Migracja zakończona sukcesem!');
  } catch (error) {
    console.error('Błąd podczas migracji:', error);
  }
}

performMigration();