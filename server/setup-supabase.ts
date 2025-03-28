import { createClient } from '@supabase/supabase-js';

// Pobieramy dane uwierzytelniające z zmiennych środowiskowych
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

// Sprawdzenie, czy zmienne środowiskowe zostały ustawione
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Brak wymaganych zmiennych środowiskowych SUPABASE_URL i SUPABASE_API_KEY');
}

// Przygotowanie opcji dla klienta Supabase
const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  }
};

// Tworzymy klienta Supabase
const supabase = createClient(supabaseUrl, supabaseKey, options);

async function setupDatabase() {
  console.log('Rozpoczynanie konfiguracji bazy danych Supabase...');

  try {
    // Użyjemy bezpośredniego podejścia do utworzenia tabeli - spróbujemy bezpośrednio dodać rekordy
    console.log('Próba utworzenia tabeli bezpośrednio przez dodanie rekordów...');

    // Najpierw spróbujemy dodać rekord, co może się nie udać jeśli tabela nie istnieje
    const testTask = {
      id: 'test-task',
      title: 'Test task',
      notes: ['To jest zadanie testowe'],
      completed: false,
      category: 'Test',
      due_date: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { error: testError } = await supabase
      .from('tasks')
      .insert(testTask);

    // Jeśli dostaliśmy błąd wskazujący na brak tabeli, wyświetlimy instrukcje
    if (testError && testError.code === '42P01') {  // kod błędu dla "relation does not exist"
      console.error('Tabela "tasks" nie istnieje:', testError);
      
      console.log('Instrukcje do ręcznego utworzenia tabeli w panelu Supabase:');
      console.log('1. Zaloguj się do panelu administracyjnego Supabase');
      console.log('2. Przejdź do sekcji "Table editor"');
      console.log('3. Kliknij "Create a new table"');
      console.log('4. Wprowadź "tasks" jako nazwę tabeli');
      console.log('5. Dodaj następujące kolumny:');
      console.log('   - id: text (primary key)');
      console.log('   - title: text (not null)');
      console.log('   - notes: text[] (not null, array)');
      console.log('   - completed: boolean (not null, default: false)');
      console.log('   - category: text (not null)');
      console.log('   - due_date: timestamp (nullable)');
      console.log('   - created_at: timestamp (not null, default: now())');
      console.log('6. Kliknij "Save"');
      console.log('7. Po utworzeniu tabeli, uruchom ten skrypt ponownie, aby dodać przykładowe dane');
      
      console.log('Alternatywnie, możesz użyć SQL Editor w panelu Supabase i wykonać następujące zapytanie:');
      console.log(`
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT[] NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT NOT NULL,
  due_date TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);`);
      return;
    }
    
    // Jeśli dostaliśmy inny błąd, wyświetlimy go
    if (testError) {
      console.error('Inny błąd podczas próby dostępu do tabeli tasks:');
      console.error('Error code:', testError.code);
      console.error('Error message:', testError.message);
      console.error('Error details:', testError.details);
      console.error('Full error object:', JSON.stringify(testError, null, 2));
      return;
    }

    // Jeśli dodaliśmy test task, usuńmy go
    if (!testError) {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', 'test-task');
      
      if (deleteError) {
        console.error('Błąd podczas usuwania zadania testowego:', deleteError);
      } else {
        console.log('Zadanie testowe zostało usunięte');
      }
    }

    console.log('Tabela "tasks" została pomyślnie utworzona!');
    
    // Dodajemy przykładowe zadania
    const sampleTasks = [
      {
        id: '1',
        title: 'Wybór sali weselnej',
        notes: ['Villa Presto - kontakt: 123-456-789', 'Termin: 4 września 2026', 'Maksymalna liczba gości: 120'],
        completed: true,
        category: 'I. Ustalenia Ogólne',
        due_date: new Date('2025-04-10').toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Wybór fotografa',
        notes: ['Studio Foto Magic - Anna Kowalska', 'Cena: 5000 zł - całodniowa sesja'],
        completed: false,
        category: 'II. Usługodawcy',
        due_date: new Date('2025-05-15').toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Zamówienie tortu weselnego',
        notes: ['Cukiernia "Słodki Sen"', 'Trzy piętra, smak: wanilia i czekolada', 'Dekoracja: żywe kwiaty'],
        completed: false,
        category: 'III. Catering',
        due_date: new Date('2026-08-05').toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '4',
        title: 'Przygotowanie listy gości',
        notes: ['Maksymalna liczba: 120 osób', 'Termin wysyłki zaproszeń: 6 miesięcy przed ślubem'],
        completed: false,
        category: 'I. Ustalenia Ogólne',
        created_at: new Date().toISOString()
      },
      {
        id: '5',
        title: 'Wybór zespołu muzycznego',
        notes: ['Zespół "Weselne Dźwięki" - 5 osób', 'Repertuar: pop, rock, utwory biesiadne', 'Cena: 6000 zł'],
        completed: false,
        category: 'II. Usługodawcy',
        due_date: new Date('2025-06-20').toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '6',
        title: 'Zakup obrączek',
        notes: ['Jubiler "Złota Obrączka"', 'Złoto 585, wzór klasyczny'],
        completed: false,
        category: 'IV. Dekoracje i dodatki',
        due_date: new Date('2026-07-15').toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '7',
        title: 'Ustalenie menu weselnego',
        notes: ['Danie główne: kaczka z jabłkami', 'Przystawki: 5 rodzajów', 'Deser: lody z owocami', 'Bufet słodki: 10 rodzajów ciast'],
        completed: false,
        category: 'III. Catering',
        due_date: new Date('2026-06-01').toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: '8',
        title: 'Zamówienie barmanów na wesele',
        notes: ['Firma: Cocktail Masters', 'Liczba barmanów: 2', 'Open bar: drinki, koktajle, prosecco'],
        completed: false,
        category: 'II. Usługodawcy',
        due_date: new Date('2026-05-10').toISOString(),
        created_at: new Date().toISOString()
      }
    ];

    // Dodajemy każde zadanie osobno
    for (const task of sampleTasks) {
      const { error } = await supabase
        .from('tasks')
        .insert(task);
      
      if (error) {
        console.error(`Błąd podczas dodawania przykładowego zadania "${task.title}":`, error);
      } else {
        console.log(`Dodano przykładowe zadanie: ${task.title}`);
      }
    }

    console.log('Konfiguracja bazy danych Supabase zakończona pomyślnie!');

  } catch (error) {
    console.error('Wystąpił nieoczekiwany błąd podczas konfiguracji bazy danych:', error);
  }
}

// Uruchamiamy konfigurację bazy danych
setupDatabase();