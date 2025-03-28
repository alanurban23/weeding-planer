import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Załaduj zmienne środowiskowe
dotenv.config();

// Pobierz dane uwierzytelniające z zmiennych środowiskowych
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_API_KEY || '';

// Sprawdź czy dane uwierzytelniające są dostępne
if (!supabaseUrl || !supabaseKey) {
  console.error('Brakuje danych uwierzytelniających do Supabase. Sprawdź zmienne środowiskowe SUPABASE_URL i SUPABASE_API_KEY.');
  process.exit(1);
}

// Utwórz klienta Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function createNotesTable() {
  console.log('Tworzenie tabeli notes w Supabase...');

  try {
    // Utworzenie tabeli notes przez bezpośredni insert
    // Jeśli tabela nie istnieje, Supabase zwróci błąd, ale możemy to wykorzystać
    // do określenia, że tabela powinna zostać utworzona przez administratora
    console.log('Próba utworzenia notatki, aby sprawdzić czy tabela istnieje...');
    
    const { error } = await supabase.from('notes').insert({
      id: 'test-note',
      content: 'Test creation - This is a test note to check if the table exists'
    });
    
    if (error) {
      if (error.code === '42P01') { // Kod błędu dla "relation does not exist"
        console.error('Tabela notes nie istnieje. Potrzebne jest utworzenie tabeli przez administratora Supabase.');
        console.log('Instrukcja SQL do utworzenia tabeli:');
        console.log(`
          CREATE TABLE public.notes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
          );
          
          -- Opcjonalnie możesz dodać indeks dla szybszego wyszukiwania
          CREATE INDEX idx_notes_created_at ON public.notes (created_at DESC);
          
          -- Ustaw uprawnienia dostępu (jeśli korzystasz z Row Level Security)
          ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
        `);
        return false;
      }
      
      console.error('Wystąpił inny błąd podczas testowania tabeli notes:', error);
      return false;
    }
    
    console.log('Notatka testowa została dodana. Tabela notes istnieje i działa poprawnie.');
    return true;
  } catch (err) {
    console.error('Wystąpił nieoczekiwany błąd:', err);
    return false;
  }

}

async function checkNotesTable() {
  console.log('Sprawdzanie tabeli notes...');
  
  // Sprawdź czy tabela istnieje
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Tabela notes nie istnieje lub wystąpił inny błąd:', error);
    return false;
  }
  
  console.log('Tabela notes istnieje.');
  return true;
}

async function main() {
  try {
    // Najpierw sprawdź czy tabela już istnieje
    const tableExists = await checkNotesTable();
    
    if (!tableExists) {
      // Jeśli tabela nie istnieje, utwórz ją
      const created = await createNotesTable();
      
      if (created) {
        console.log('Tabela notes została pomyślnie skonfigurowana.');
      } else {
        console.error('Nie udało się skonfigurować tabeli notes.');
      }
    } else {
      console.log('Tabela notes już istnieje. Nie są wymagane żadne działania.');
    }
  } catch (error) {
    console.error('Wystąpił nieoczekiwany błąd:', error);
  }
}

// Uruchom główną funkcję
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Błąd:', err);
    process.exit(1);
  });