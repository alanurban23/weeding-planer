import { createClient } from '@supabase/supabase-js';

// Pobieramy dane uwierzytelniające z zmiennych środowiskowych
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Sprawdzenie, czy zmienne środowiskowe zostały ustawione
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Brak wymaganych zmiennych środowiskowych SUPABASE_URL i SUPABASE_API_KEY');
}

// Tworzymy klienta Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTasksTable() {
  console.log('Próba utworzenia tabeli tasks za pomocą zapytania SQL...');

  const sql = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT[] NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    category TEXT NOT NULL,
    due_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  `;

  const { error } = await supabase.rpc('pgexec', { query: sql });

  if (error) {
    console.error('Błąd podczas tworzenia tabeli tasks:', error);
    
    // Alternatywnie spróbujmy utworzyć tabelę z bardziej podstawowymi uprawnieniami
    console.log('Próba utworzenia tabeli tasks za pomocą prostszego podejścia...');
    try {
      // Sprawdźmy najpierw, czy tabela już istnieje
      const { data: existingTable, error: checkError } = await supabase
        .from('tasks')
        .select('id')
        .limit(1);
      
      if (checkError) {
        console.log('Tabela tasks nie istnieje lub wystąpił błąd sprawdzania:', checkError);
      } else {
        console.log('Tabela tasks już istnieje, można jej używać:', existingTable);
        return;
      }

      // Spróbujmy użyć klienta Supabase do dodania przykładowego rekordu
      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert({
          id: 'test-123',
          title: 'Test',
          notes: ['Test note'],
          completed: false,
          category: 'Test',
          due_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        console.error('Nie można dodać rekordu testowego:', insertError);
      } else {
        console.log('Pomyślnie dodano rekord testowy, tabela istnieje:', data);
      }
    } catch (err) {
      console.error('Wystąpił błąd podczas alternatywnego podejścia:', err);
    }
  } else {
    console.log('Tabela tasks została pomyślnie utworzona!');
  }
}

// Uruchamiamy funkcję tworzenia tabeli
createTasksTable().catch(console.error);
