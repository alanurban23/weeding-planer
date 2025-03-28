import { createClient } from '@supabase/supabase-js';

// Pobieramy dane uwierzytelniające z zmiennych środowiskowych
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_API_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Błąd: Brak wymaganych zmiennych środowiskowych SUPABASE_URL i SUPABASE_API_KEY');
  process.exit(1);
}

console.log('Używam URL Supabase:', supabaseUrl);
console.log('Klucz API został poprawnie znaleziony');

// Tworzymy klienta Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  try {
    console.log('Sprawdzanie, czy tabela tasks istnieje w Supabase...');
    
    // Sprawdzamy, czy tabela istnieje, próbując pobrać rekordy
    const { data, error } = await supabase
      .from('tasks')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') { // relation does not exist
        console.error('Tabela tasks nie istnieje w Supabase.');
        console.log('\nMusisz utworzyć tabelę tasks w panelu Supabase SQL Editor.');
        console.log('Instrukcje:');
        console.log('1. Zaloguj się do panelu administracyjnego Supabase');
        console.log('2. Przejdź do sekcji "SQL"');
        console.log('3. Kliknij "New query"');
        console.log('4. Wklej zawartość pliku supabase-setup.sql');
        console.log('5. Kliknij "Run"');
        console.log('\nPo utworzeniu tabeli uruchom ponownie skrypt setup-supabase.ts aby dodać przykładowe dane.');
      } else {
        console.error('Wystąpił błąd podczas sprawdzania tabeli tasks:', error);
      }
    } else {
      console.log('Tabela tasks istnieje w Supabase!');
      console.log('Dane:', data);
      
      // Sprawdźmy, czy mamy uprawnienia do zapisu
      console.log('\nSprawdzanie uprawnień do zapisu...');
      
      const testTask = {
        id: 'test-connection-task',
        title: 'Test połączenia',
        notes: ['To jest zadanie testowe do sprawdzenia połączenia'],
        completed: false,
        category: 'Test',
        due_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      const { error: insertError } = await supabase
        .from('tasks')
        .insert(testTask);
      
      if (insertError) {
        console.error('Nie udało się dodać testowego zadania:', insertError);
        console.log('Możliwe, że nie masz uprawnień do zapisu lub wystąpił inny problem.');
      } else {
        console.log('Pomyślnie dodano testowe zadanie!');
        
        // Usuńmy testowe zadanie
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', 'test-connection-task');
        
        if (deleteError) {
          console.error('Nie udało się usunąć testowego zadania:', deleteError);
        } else {
          console.log('Pomyślnie usunięto testowe zadanie.');
          console.log('\nWszystko działa poprawnie! Możesz teraz uruchomić skrypt setup-supabase.ts, aby dodać przykładowe dane.');
        }
      }
    }
    
  } catch (error) {
    console.error('Wystąpił nieoczekiwany błąd:');
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
  }
}

checkTable();