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

async function addSampleTasks() {
  try {
    console.log('Sprawdzanie, czy tabela tasks istnieje w Supabase...');
    
    // Sprawdzamy, czy tabela istnieje, próbując pobrać rekordy
    const { error: checkError } = await supabase
      .from('tasks')
      .select('id')
      .limit(1);
    
    if (checkError) {
      if (checkError.code === '42P01') { // relation does not exist
        console.error('Tabela tasks nie istnieje w Supabase.');
        console.log('\nMusisz najpierw utworzyć tabelę tasks w panelu Supabase SQL Editor.');
        console.log('Instrukcje:');
        console.log('1. Zaloguj się do panelu administracyjnego Supabase');
        console.log('2. Przejdź do sekcji "SQL"');
        console.log('3. Kliknij "New query"');
        console.log('4. Wklej zawartość pliku supabase-setup.sql');
        console.log('5. Kliknij "Run"');
        console.log('\nPo utworzeniu tabeli uruchom ten skrypt ponownie, aby dodać przykładowe dane.');
        return;
      } else {
        console.error('Wystąpił błąd podczas sprawdzania tabeli tasks:', checkError);
        return;
      }
    }
    
    console.log('Tabela tasks istnieje. Dodaję przykładowe zadania...');
    
    // Przygotowujemy przykładowe zadania
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
    
    console.log('Usuwanie istniejących zadań...');
    
    // Usuwamy wszystkie istniejące zadania (opcjonalne)
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .gte('id', '0'); // Usuwamy wszystkie zadania
    
    if (deleteError) {
      console.error('Błąd podczas usuwania istniejących zadań:', deleteError);
    } else {
      console.log('Istniejące zadania zostały usunięte.');
    }
    
    console.log('Dodawanie nowych przykładowych zadań...');
    
    // Dodajemy wszystkie zadania na raz
    const { error: insertError } = await supabase
      .from('tasks')
      .insert(sampleTasks);
    
    if (insertError) {
      console.error('Błąd podczas dodawania zadań:', insertError);
      
      // Spróbujmy dodać zadania pojedynczo
      console.log('\nSpróbuję dodać zadania pojedynczo...');
      
      let successCount = 0;
      for (const task of sampleTasks) {
        const { error } = await supabase
          .from('tasks')
          .insert(task);
        
        if (error) {
          console.error(`Błąd podczas dodawania zadania "${task.title}":`, error);
        } else {
          console.log(`Dodano zadanie: ${task.title}`);
          successCount++;
        }
      }
      
      console.log(`\nPomyślnie dodano ${successCount} z ${sampleTasks.length} zadań.`);
      
    } else {
      console.log('Wszystkie zadania zostały pomyślnie dodane!');
    }
    
    // Pobieramy wszystkie zadania, aby sprawdzić, czy zostały prawidłowo dodane
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Błąd podczas pobierania zadań:', error);
    } else {
      console.log(`\nZnaleziono ${data.length} zadań w bazie danych:`);
      for (const task of data) {
        console.log(`- ${task.title} (${task.category})`);
      }
    }
    
    console.log('\nOperacja zakończona. Możesz teraz uruchomić aplikację, która będzie korzystać z bazy danych Supabase.');
    
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

addSampleTasks();