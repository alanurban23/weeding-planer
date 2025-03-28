import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from "./shared/schema";

// Sprawdzamy, czy zmienna środowiskowa jest ustawiona
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Brak wymaganej zmiennej środowiskowej DATABASE_URL');
}

console.log('Łączenie z bazą danych PostgreSQL...');

async function performMigration() {
  try {
    // Tworzymy klienta połączenia
    const sql = postgres(databaseUrl as string, { max: 1 });
    const db = drizzle(sql, { schema });

    console.log('Generowanie i wykonywanie migracji...');
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('Dodawanie przykładowych danych...');
    
    // Dodajemy przykładowe zadania z użyciem nazw pól zgodnych ze schematem drizzle (snake_case)
    const sampleTasks = [
      {
        id: '1',
        title: 'Wybór sali weselnej',
        notes: ['Villa Presto - kontakt: 123-456-789', 'Termin: 4 września 2026', 'Maksymalna liczba gości: 120'],
        completed: true,
        category: 'I. Ustalenia Ogólne',
        due_date: new Date('2025-04-10'),
        created_at: new Date()
      },
      {
        id: '2',
        title: 'Wybór fotografa',
        notes: ['Studio Foto Magic - Anna Kowalska', 'Cena: 5000 zł - całodniowa sesja'],
        completed: false,
        category: 'II. Usługodawcy',
        due_date: new Date('2025-05-15'),
        created_at: new Date()
      },
      {
        id: '3',
        title: 'Zamówienie tortu weselnego',
        notes: ['Cukiernia "Słodki Sen"', 'Trzy piętra, smak: wanilia i czekolada', 'Dekoracja: żywe kwiaty'],
        completed: false,
        category: 'III. Catering',
        due_date: new Date('2026-08-05'),
        created_at: new Date()
      },
      {
        id: '4',
        title: 'Przygotowanie listy gości',
        notes: ['Maksymalna liczba: 120 osób', 'Termin wysyłki zaproszeń: 6 miesięcy przed ślubem'],
        completed: false,
        category: 'I. Ustalenia Ogólne',
        due_date: null,
        created_at: new Date()
      },
      {
        id: '5',
        title: 'Wybór zespołu muzycznego',
        notes: ['Zespół "Weselne Dźwięki" - 5 osób', 'Repertuar: pop, rock, utwory biesiadne', 'Cena: 6000 zł'],
        completed: false,
        category: 'II. Usługodawcy',
        due_date: new Date('2025-06-20'),
        created_at: new Date()
      },
      {
        id: '6',
        title: 'Zakup obrączek',
        notes: ['Jubiler "Złota Obrączka"', 'Złoto 585, wzór klasyczny'],
        completed: false,
        category: 'IV. Dekoracje i dodatki',
        due_date: new Date('2026-07-15'),
        created_at: new Date()
      },
      {
        id: '7',
        title: 'Ustalenie menu weselnego',
        notes: ['Danie główne: kaczka z jabłkami', 'Przystawki: 5 rodzajów', 'Deser: lody z owocami', 'Bufet słodki: 10 rodzajów ciast'],
        completed: false,
        category: 'III. Catering',
        due_date: new Date('2026-06-01'),
        created_at: new Date()
      },
      {
        id: '8',
        title: 'Zamówienie barmanów na wesele',
        notes: ['Firma: Cocktail Masters', 'Liczba barmanów: 2', 'Open bar: drinki, koktajle, prosecco'],
        completed: false,
        category: 'II. Usługodawcy',
        due_date: new Date('2026-05-10'),
        created_at: new Date()
      }
    ];

    try {
      // Dodajemy każde zadanie osobno
      for (const task of sampleTasks) {
        await db.insert(schema.tasks).values(task).execute();
        console.log(`Dodano przykładowe zadanie: ${task.title}`);
      }
    } catch (insertError) {
      console.error('Błąd podczas dodawania przykładowych zadań:', insertError);
      console.log('Prawdopodobnie dane już istnieją, kontynuuję...');
    }
    
    console.log('Migracja zakończona sukcesem!');
  } catch (error) {
    console.error('Błąd podczas migracji:', error);
  }
}

performMigration();