/**
 * Ten plik dostarcza funkcję do dynamicznego wybierania providera bazy danych
 * na podstawie konfiguracji środowiska i dostępności usług.
 */

import { IStorage } from './storage';
import { createClient } from '@supabase/supabase-js';

// Typy providerów bazy danych
export enum DatabaseProvider {
  POSTGRESQL = 'postgresql',
  SUPABASE = 'supabase',
  MEMORY = 'memory'
}

// Interfejs z informacjami o aktualnym providerze
export interface DatabaseInfo {
  provider: DatabaseProvider;
  isAvailable: boolean;
  name: string;
  description: string;
}

// Funkcja testująca połączenie z Supabase
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Brak konfiguracji Supabase.');
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('tasks').select('count');
    
    if (error) {
      console.error('Błąd połączenia z Supabase:', error.message);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Nieoczekiwany błąd podczas testowania Supabase:', err);
    return false;
  }
}

// Funkcja testująca połączenie z lokalnym PostgreSQL
export async function checkPostgresConnection(): Promise<boolean> {
  try {
    if (!process.env.DATABASE_URL) {
      console.log('Brak konfiguracji PostgreSQL.');
      return false;
    }
    
    // Import Pool z odpowiedniego pakietu
    const { Pool } = await import('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Wykonaj proste zapytanie testowe
    await pool.query('SELECT 1');
    
    // W tym pakiecie nie ma potrzeby zamykania połączenia, ale jest metoda end
    if (typeof pool.end === 'function') {
      await pool.end();
    }
    
    return true;
  } catch (err) {
    console.error('Błąd połączenia z PostgreSQL:', err);
    return false;
  }
}

// Główna funkcja wybierająca provider
export async function selectDatabaseProvider(): Promise<DatabaseInfo> {
  console.log('Wybieranie providera bazy danych...');
  
  // Sprawdź połączenie z Supabase
  const supabaseAvailable = await checkSupabaseConnection();
  
  if (supabaseAvailable) {
    console.log('✅ Supabase jest dostępne i skonfigurowane.');
    return {
      provider: DatabaseProvider.SUPABASE,
      isAvailable: true,
      name: 'Supabase',
      description: 'Używam Supabase jako bazy danych'
    };
  }
  
  // Sprawdź połączenie z PostgreSQL
  const postgresAvailable = await checkPostgresConnection();
  
  if (postgresAvailable) {
    console.log('✅ PostgreSQL jest dostępne i skonfigurowane.');
    return {
      provider: DatabaseProvider.POSTGRESQL,
      isAvailable: true,
      name: 'PostgreSQL',
      description: 'Używam lokalnej bazy danych PostgreSQL'
    };
  }
  
  // Fallback do pamięci
  console.log('⚠️ Żadna baza danych nie jest dostępna. Używam pamięci jako fallback.');
  return {
    provider: DatabaseProvider.MEMORY,
    isAvailable: true,
    name: 'MemStorage',
    description: 'Używam pamięci jako tymczasowego magazynu danych'
  };
}

// Funkcja zwracająca odpowiednią instancję IStorage
export async function getDatabaseStorage(): Promise<IStorage> {
  const dbInfo = await selectDatabaseProvider();
  
  console.log(`Wybrany provider: ${dbInfo.name}`);
  console.log(dbInfo.description);
  
  switch (dbInfo.provider) {
    case DatabaseProvider.SUPABASE:
      const { supabaseStorage } = await import('./supabase-storage');
      return supabaseStorage;
      
    case DatabaseProvider.POSTGRESQL:
      const { storage: postgresStorage } = await import('./storage');
      return postgresStorage;
      
    case DatabaseProvider.MEMORY:
    default:
      const { MemStorage } = await import('./storage');
      return new MemStorage();
  }
}