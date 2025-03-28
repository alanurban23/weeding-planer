import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Inicjalizacja bazy danych tylko gdy jest wywoływana
let pool: Pool | null = null;
let db: any = null;

export function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
  }
  
  return { pool, db };
}

// Eksportujemy gettery, które inicjalizują połączenie przy pierwszym użyciu
export const getPool = () => {
  if (!pool) {
    initializeDatabase();
  }
  return pool;
};

export const getDb = () => {
  if (!db) {
    initializeDatabase();
  }
  return db;
};

// Dla kompatybilności z istniejącym kodem
export { pool, db };
