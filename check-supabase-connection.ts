import { createClient } from '@supabase/supabase-js';

// Pobieramy dane uwierzytelniające z zmiennych środowiskowych
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_API_KEY || '';

console.log('Sprawdzanie połączenia z Supabase...');
console.log(`URL: ${supabaseUrl}`);
console.log('Klucz API jest dostępny:', supabaseKey ? 'Tak' : 'Nie');

// Tworzymy klienta Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  try {
    // Najpierw sprawdźmy, czy możemy wykonać podstawowe zapytanie
    console.log('Próba wykonania podstawowego zapytania...');
    
    const startTime = Date.now();
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    const endTime = Date.now();
    
    console.log(`Czas wykonania zapytania: ${endTime - startTime}ms`);
    
    if (error) {
      if (error.code === '42P01') { // relation does not exist
        console.log('Tabela _test nie istnieje (to jest oczekiwane), ale udało się połączyć z bazą danych.');
        console.log('Status połączenia: OK');
        return;
      }
      
      console.error('Błąd podczas wykonywania zapytania:', error);
      console.error('Kod błędu:', error.code);
      console.error('Szczegóły błędu:', error.details);
      console.error('Wiadomość błędu:', error.message);
      console.error('Cały obiekt błędu:', JSON.stringify(error, null, 2));
    } else {
      console.log('Dane z tabeli _test:', data);
      console.log('Status połączenia: OK');
    }
    
    // Sprawdźmy raz jeszcze, czy tabela tasks istnieje
    console.log('\nSprawdzanie, czy tabela tasks istnieje...');
    const { error: tasksError } = await supabase.from('tasks').select('count').limit(1);
    
    if (tasksError) {
      if (tasksError.code === '42P01') { // relation does not exist
        console.log('Tabela tasks nie istnieje. Należy ją utworzyć za pomocą skryptu SQL w panelu Supabase.');
      } else {
        console.error('Błąd podczas sprawdzania tabeli tasks:', tasksError);
      }
    } else {
      console.log('Tabela tasks istnieje!');
    }
    
  } catch (error) {
    console.error('Wystąpił nieoczekiwany błąd podczas sprawdzania połączenia:');
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
    
    console.log('\nProblem może być związany z:');
    console.log('1. Nieprawidłowym URL Supabase lub kluczem API');
    console.log('2. Brakiem połączenia z internetem');
    console.log('3. Ograniczeniami bezpieczeństwa w Supabase');
  }
}

checkConnection();