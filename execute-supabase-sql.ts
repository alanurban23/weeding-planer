import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Uzyskujemy bieżący katalog w ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function executeSQL() {
  try {
    // Odczytujemy zawartość pliku SQL
    const sqlFilePath = path.join(__dirname, 'supabase-setup.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Wczytano plik SQL:', sqlFilePath);
    
    // Wykonujemy zapytanie SQL bezpośrednio przez API REST Supabase
    console.log('Wykonuję SQL bezpośrednio na serwerze Supabase...');
    
    const { data, error } = await supabase.rpc('exec_sql', { query: sqlContent });
    
    if (error) {
      console.error('Błąd podczas wykonywania SQL:', error);
      
      // Spróbujmy alternatywnego podejścia - podzielmy zapytanie na części
      console.log('\nSpróbuję wykonać zapytania pojedynczo...');
      
      // Usuwamy komentarze i dzielimy na poszczególne zapytania
      const queries = sqlContent
        .replace(/--.*$/gm, '') // Usuwamy komentarze liniowe
        .split(';')             // Dzielimy na poszczególne zapytania
        .map(q => q.trim())     // Przycinamy białe znaki
        .filter(q => q.length > 0); // Usuwamy puste zapytania
      
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        console.log(`\nWykonuję zapytanie ${i + 1}/${queries.length}:`);
        console.log(query);
        
        try {
          const { error } = await supabase.rpc('exec_sql', { query: query });
          
          if (error) {
            console.error(`Błąd w zapytaniu ${i + 1}:`, error);
          } else {
            console.log(`Zapytanie ${i + 1} wykonane pomyślnie!`);
          }
        } catch (err) {
          console.error(`Wyjątek w zapytaniu ${i + 1}:`, err);
        }
      }
      
      console.log('\nAlternatywny sposób:');
      console.log('Wygląda na to, że funkcja exec_sql może nie być dostępna w Twoim projekcie Supabase.');
      console.log('Zalecam wykonanie następujących czynności:');
      console.log('1. Zaloguj się do panelu administracyjnego Supabase');
      console.log('2. Przejdź do sekcji "SQL"');
      console.log('3. Kliknij "New query"');
      console.log('4. Wklej zawartość pliku supabase-setup.sql');
      console.log('5. Kliknij "Run"');
      
      // Sprawdźmy, czy tabela tasks istnieje pomimo błędu
      const { error: checkError } = await supabase.from('tasks').select('count').limit(1);
      
      if (checkError && checkError.code === '42P01') {
        console.error('Tabela tasks nadal nie istnieje. Wykonaj instrukcje powyżej.');
      } else if (!checkError) {
        console.log('\nDobra wiadomość! Wygląda na to, że tabela tasks istnieje!');
        console.log('Możesz kontynuować i dodać przykładowe dane za pomocą skryptu setup-supabase.ts');
      }
      
    } else {
      console.log('SQL wykonany pomyślnie!');
      console.log('Odpowiedź:', data);
      
      // Sprawdźmy, czy tabela tasks istnieje
      const { error: checkError } = await supabase.from('tasks').select('count').limit(1);
      
      if (checkError && checkError.code === '42P01') {
        console.error('Tabela tasks nadal nie istnieje mimo pomyślnego wykonania SQL.');
      } else if (!checkError) {
        console.log('Tabela tasks istnieje!');
      }
    }
    
  } catch (error) {
    console.error('Wystąpił nieoczekiwany błąd podczas wykonywania SQL:');
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error:', error);
    }
  }
}

executeSQL();