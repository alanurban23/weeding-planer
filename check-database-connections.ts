/**
 * Ten skrypt sprawdza połączenia z bazami danych PostgreSQL i Supabase.
 * Pozwala upewnić się, że obie bazy danych są poprawnie skonfigurowane i dostępne.
 */

import { Pool } from '@neondatabase/serverless';
import { createClient } from '@supabase/supabase-js';

// PostgreSQL connection check
async function checkPostgresConnection() {
  console.log('Sprawdzanie połączenia z PostgreSQL...');
  
  if (!process.env.DATABASE_URL) {
    console.error('Błąd: Brak zmiennej środowiskowej DATABASE_URL');
    return false;
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query('SELECT NOW() as time');
    
    console.log('✅ Połączenie z PostgreSQL działa!');
    console.log(`   Czas serwera: ${result.rows[0].time}`);
    
    // Sprawdźmy, czy tabele istnieją
    try {
      const tableResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      console.log('   Znalezione tabele:');
      tableResult.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
      
      // Sprawdźmy, czy tabela tasks istnieje
      const tasksExists = tableResult.rows.some(row => row.table_name === 'tasks');
      
      if (tasksExists) {
        // Policzmy zadania
        const countResult = await pool.query('SELECT COUNT(*) FROM tasks');
        console.log(`   Liczba zadań w tabeli tasks: ${countResult.rows[0].count}`);
      } else {
        console.log('   ⚠️ Tabela tasks nie istnieje w PostgreSQL');
      }
      
    } catch (err) {
      console.error('   Błąd podczas sprawdzania tabel:', err);
    }
    
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Błąd połączenia z PostgreSQL:', error);
    await pool.end();
    return false;
  }
}

// Supabase connection check
async function checkSupabaseConnection() {
  console.log('\nSprawdzanie połączenia z Supabase...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Błąd: Brak zmiennych środowiskowych SUPABASE_URL lub SUPABASE_ANON_KEY');
    return false;
  }
  
  console.log(`   URL Supabase: ${supabaseUrl}`);
  console.log('   Klucz API: [Znaleziony]');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Sprawdźmy, czy możemy pobrać informacje o projekcie
    const { data, error } = await supabase.from('tasks').select('count');
    
    if (error) {
      if (error.code === '42P01') { // relation does not exist
        console.error('❌ Tabela tasks nie istnieje w Supabase');
        console.log('   Utwórz tabelę tasks za pomocą skryptu SQL w panelu Supabase.');
      } else {
        console.error(`❌ Błąd Supabase: ${error.message} (Kod: ${error.code})`);
      }
      return false;
    }
    
    console.log('✅ Połączenie z Supabase działa!');
    
    // Pobierz dane z tabeli tasks i sprawdź poprawność dat
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(5);
    
    if (tasksError) {
      console.error('   Błąd podczas pobierania zadań:', tasksError);
    } else {
      console.log(`   Liczba zadań w tabeli tasks: ${tasks.length}`);
      
      // Sprawdź poprawność dat w rekordach
      const invalidTasks = tasks.filter(task => {
        const date = new Date(task.created_at);
        return isNaN(date.getTime());
      });
      
      if (invalidTasks.length > 0) {
        console.error(`   ⚠️ Znaleziono ${invalidTasks.length} nieprawidłowych dat created_at:`);
        invalidTasks.forEach((task, index) => {
          console.log(`   ${index + 1}. ID: ${task.id}`);
          console.log(`      created_at: ${task.created_at}`);
          console.log(`      Tytuł: ${task.title}`);
        });
      } else if (tasks.length > 0) {
        console.log('   Przykładowe zadania:');
        tasks.forEach((task: any) => {
          const date = new Date(task.created_at);
          console.log(`   - ${task.title} (${task.category})`);
          console.log(`     created_at: ${date.toISOString()} (poprawny format)`);
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Błąd połączenia z Supabase:', error);
    return false;
  }
}

// Główna funkcja sprawdzająca oba połączenia
async function checkConnections() {
  console.log('=== Sprawdzanie połączeń z bazami danych ===\n');
  
  const pgStatus = process.env.DATABASE_URL ? await checkPostgresConnection() : false;
  const supabaseStatus = await checkSupabaseConnection();
  
  console.log('\n=== Podsumowanie ===');
  console.log(`PostgreSQL: ${pgStatus ? '✅ Połączony' : '❌ Nie połączony'}`);
  console.log(`Supabase:   ${supabaseStatus ? '✅ Połączony' : '❌ Nie połączony'}`);
  
  if (pgStatus && supabaseStatus) {
    console.log('\n✅ Wszystkie połączenia działają poprawnie!');
    console.log('   Aplikacja może korzystać z obu baz danych.');
  } else if (pgStatus) {
    console.log('\n⚠️ Tylko PostgreSQL działa poprawnie.');
    console.log('   Aplikacja będzie korzystać z lokalnej bazy danych PostgreSQL.');
  } else if (supabaseStatus) {
    console.log('\n⚠️ Tylko Supabase działa poprawnie.');
    console.log('   Aplikacja będzie korzystać z bazy danych Supabase.');
  } else {
    console.log('\n❌ Żadne połączenie nie działa poprawnie.');
    console.log('   Aplikacja może nie działać prawidłowo.');
  }
}

// Uruchom sprawdzenie
checkConnections().catch(error => {
  console.error('Nieoczekiwany błąd podczas sprawdzania połączeń:', error);
});
