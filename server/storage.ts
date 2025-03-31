import { Task, InsertTask, UpdateTask, tasks, Note, InsertNote, UpdateNote, notes } from "@shared/schema";
import { getDb } from "./db";
import { eq, desc } from "drizzle-orm";
import { supabaseStorage } from './supabase-storage';

export interface IStorage {
  getUser(id: number): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Task related methods
  getTasks(): Promise<Task[]>;
  addTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: UpdateTask): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  completeTask(id: string): Promise<Task | undefined>;
  
  // Note related methods
  getNotes(): Promise<Note[]>;
  addNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, updates: UpdateNote): Promise<Note | undefined>;
  deleteNote(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, any>;
  private tasks: Map<string, Task>;
  private notes: Map<string, Note>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.notes = new Map();
    this.currentId = 1;
    
    // Add sample tasks for initial data
    this.initializeSampleTasks();
    
    // Ensure all tasks have required fields
    this.normalizeTaskData();
  }
  
  // Helper method to make sure all tasks have required fields
  private normalizeTaskData() {
    this.tasks.forEach((task, id) => {
      // Make sure dueDate is defined (null if not set)
      if (task.dueDate === undefined) {
        task.dueDate = null;
      }
      
      // Make sure completed is defined
      if (task.completed === undefined) {
        task.completed = false;
      }
    });
  }

  async getUser(id: number): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<any> {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Task methods
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async addTask(task: InsertTask): Promise<Task> {
    const newTask: Task = {
      ...task,
      dueDate: task.dueDate || null,
      completed: task.completed || false,
      createdAt: new Date(),
    };
    
    this.tasks.set(task.id, newTask);
    return newTask;
  }

  async updateTask(id: string, updates: UpdateTask): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    // Przetwarzanie daty - zapewniamy, że dueDate będzie obiektem Date, jeśli istnieje
    const processedUpdates = { ...updates };
    if (processedUpdates.dueDate) {
      if (typeof processedUpdates.dueDate === 'string') {
        processedUpdates.dueDate = new Date(processedUpdates.dueDate);
      }
    }
    
    const updatedTask: Task = {
      ...task,
      ...processedUpdates,
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async completeTask(id: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask: Task = {
      ...task,
      completed: !task.completed,
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  // Note methods
  async getNotes(): Promise<Note[]> {
    return Array.from(this.notes.values());
  }

  async addNote(note: InsertNote): Promise<Note> {
    const newNote: Note = {
      ...note,
      createdAt: new Date(),
    };
    
    this.notes.set(note.id, newNote);
    return newNote;
  }

  async updateNote(id: string, updates: UpdateNote): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;
    
    const updatedNote: Note = {
      ...note,
      ...updates,
    };
    
    this.notes.set(id, updatedNote);
    return updatedNote;
  }

  async deleteNote(id: string): Promise<boolean> {
    return this.notes.delete(id);
  }

  private initializeSampleTasks() {
    // Helper function to ensure all tasks have required fields
    const ensureTaskFields = (task: Partial<Task>): Task => {
      if (!task.id) {
        throw new Error('Task must have an id');
      }
      
      return {
        id: task.id,
        title: task.title || '',
        notes: task.notes || [],
        completed: task.completed || false,
        dueDate: task.dueDate || null,
        category: task.category || '',
        createdAt: task.createdAt || new Date(),
      };
    };
    
    const sampleTasks: Partial<Task>[] = [
      // I. Ustalenia Ogólne
      {
        id: '1',
        title: 'Ustalenie daty ślubu i rezerwacja miejsca',
        notes: [
          'Data ślubu: 4 września 2026',
          'Miejsce ceremonii ślubnej i wesela: Villa Presto, Brzóza Królewska sala nr 2',
          'Zaliczka za salę: 3500 zł do 31 Marca 2025',
          '50% kaucji za salę: do 20 sierpnia 2026',
          'Pozostałe 50% za salę: 4 dni po 8 września',
        ],
        completed: true,
        dueDate: new Date('2026-09-04'),
        category: 'I. Ustalenia Ogólne',
        createdAt: new Date(),
      },
      {
        id: '2',
        title: 'Określenie budżetu i listy gości',
        notes: [
          'Koszt za talerzyk: 315 zł',
          'Wstępna lista gości: około 115 osób',
          'Link do listy gości: https://www.notion.so/Lista-Go-ci-1c1411b6e1a080c3aadaf6bf27d53ab5',
        ],
        completed: true,
        dueDate: null,
        category: 'I. Ustalenia Ogólne',
        createdAt: new Date(),
      },
      {
        id: '3',
        title: 'Wybór stylu i charakteru uroczystości',
        notes: [
          'Określić tematykę i kolorystykę wesela',
        ],
        completed: false,
        dueDate: null,
        category: 'I. Ustalenia Ogólne',
        createdAt: new Date(),
      },
      
      // II. Wybór Podwykonawców
      {
        id: '4',
        title: 'Wybór fotografa i kamerzysty',
        notes: [
          'Wybrana firma: Cozawesele',
          'Umowa: Podpisana',
          'Koszt: 12300 zł po weselu',
          'Dodatkowa opłata: 500 zł za każdą dodatkową godzinę',
          'Potwierdzenie rezerwacji: Potwierdzona',
          'Termin przesłania podpisanej umowy: do 7 dni',
          'Kontakt w sprawie szczegółów: Na około dwa tygodnie przed ślubem',
        ],
        completed: true,
        category: 'II. Wybór Podwykonawców',
        createdAt: new Date(),
      },
      {
        id: '5',
        title: 'Ustalenie miejsca spotkania z fotografem i kamerzystą',
        notes: [
          'Spotkanie dzień przed ślubem',
        ],
        completed: false,
        dueDate: new Date('2026-09-03'),
        category: 'II. Wybór Podwykonawców',
        createdAt: new Date(),
      },
      {
        id: '6',
        title: 'Zapłacenie opłat fotografowi i kamerzyście',
        notes: [
          'Przygotować płatność na dzień ślubu',
        ],
        completed: false,
        dueDate: new Date('2026-09-04'),
        category: 'II. Wybór Podwykonawców',
        createdAt: new Date(),
      },
      {
        id: '7',
        title: 'Wybór zespołu muzycznego',
        notes: [
          'Umowa: Podpisana',
          'Całość kosztów: 10 000 zł w dniu wesela',
          'Kaucja: 1 000 zł zapłacona',
          'Przekazanie informacji o zabawach weselnych: Tydzień przed ślubem',
          'Informacja dla zespołu: Mają zagrać pod domem',
          'Rozważyć prawa muzyczne w kościele',
          'Preferowana muzyka w kościele: Dziewczynka lub skrzypce',
          'Zapytać organistę o wynagrodzenie',
        ],
        completed: true,
        category: 'II. Wybór Podwykonawców',
        createdAt: new Date(),
      },
      {
        id: '8',
        title: 'Zapłacenie zespołowi weselemu',
        notes: [
          'Przygotować płatność na dzień ślubu',
        ],
        completed: false,
        dueDate: new Date('2026-09-04'),
        category: 'II. Wybór Podwykonawców',
        createdAt: new Date(),
      },
      {
        id: '9',
        title: 'Organizacja oprawy muzycznej w kościele',
        notes: [
          'Przedszkolanka chce, żeby to była dziewczyna lub skrzypce',
          'Zapytać, czy organista przyjdzie do pracy i ile to kosztuje',
          'Ustalić dokładny plan ceremonii z organistą i księdzem',
        ],
        completed: false,
        category: 'II. Wybór Podwykonawców',
        createdAt: new Date(),
      },
      {
        id: '10',
        title: 'Wybór i rezerwacja florysty',
        notes: [
          'Wybrana florystka',
          'Skontaktować się w sprawie dokładnych ustaleń',
          'Bukiet dla panny młodej',
        ],
        completed: false,
        category: 'II. Wybór Podwykonawców',
        createdAt: new Date(),
      },
      {
        id: '11',
        title: 'Zamówienie tortu weselnego',
        notes: [],
        completed: false,
        category: 'II. Wybór Podwykonawców',
        createdAt: new Date(),
      },
      {
        id: '12',
        title: 'Organizacja usług barmana',
        notes: [
          'Firma: Weddingcoctail.pl Marcin',
          'Umowa: Do wysłania',
          'Płatność: W dzień wesela 3350 zł (150 os)',
        ],
        completed: false,
        dueDate: new Date('2026-09-04'),
        category: 'II. Wybór Podwykonawców',
        createdAt: new Date(),
      },
      
      // III. Przygotowania do Ceremonii
      {
        id: '13',
        title: 'Zarezerwowanie terminu w kościele',
        notes: [
          'Do zrobienia jutro',
        ],
        completed: false,
        dueDate: new Date(Date.now() + 86400000), // Add 24 hours safely
        category: 'III. Przygotowania do Ceremonii',
        createdAt: new Date(),
      },
      {
        id: '14',
        title: 'Rozpoczęcie nauk przedmałżeńskich',
        notes: [
          '25-27 Kurs weekendowy w Rakszawie nauki przedmałżeńskie o 18:00',
        ],
        completed: false,
        dueDate: new Date('2025-01-25'),
        category: 'III. Przygotowania do Ceremonii',
        createdAt: new Date(),
      },
      {
        id: '15',
        title: 'Spisanie protokołu przedślubnego',
        notes: [
          'Nie wcześniej niż pół roku od ślubu',
        ],
        completed: false,
        dueDate: new Date('2026-03-04'),
        category: 'III. Przygotowania do Ceremonii',
        createdAt: new Date(),
      },
      {
        id: '16',
        title: 'Przygotowanie dokumentów na ślub',
        notes: [
          'Dowody osobiste w dniu ślubu',
          'Świadectwa z nauk religii (podstawówka, gimnazjum, liceum)',
          'Świadectwo chrztu z Żołynii od proboszcza',
          'Zaświadczenie z urzędu cywilnego (max 6 mc wcześniej)',
        ],
        completed: false,
        category: 'III. Przygotowania do Ceremonii',
        createdAt: new Date(),
      },
      {
        id: '17',
        title: 'Zgłosić się do Poradni Małżeńskiej po naukach',
        notes: [],
        completed: false,
        category: 'III. Przygotowania do Ceremonii',
        createdAt: new Date(),
      },

      // IV. Wygląd Młodej Pary
      {
        id: '18',
        title: 'Wybór sukni ślubnej',
        notes: [],
        completed: false,
        category: 'IV. Wygląd Młodej Pary',
        createdAt: new Date(),
      },
      {
        id: '19',
        title: 'Ostatnie przymiarki sukni ślubnej',
        notes: [],
        completed: false,
        category: 'IV. Wygląd Młodej Pary',
        createdAt: new Date(),
      },
      {
        id: '20',
        title: 'Wybór bielizny i butów dla Panny Młodej',
        notes: [],
        completed: false,
        category: 'IV. Wygląd Młodej Pary',
        createdAt: new Date(),
      },
      {
        id: '21',
        title: 'Wybór garnituru dla Pana Młodego',
        notes: [],
        completed: false,
        category: 'IV. Wygląd Młodej Pary',
        createdAt: new Date(),
      },
      {
        id: '22',
        title: 'Ostatnie przymiarki stroju Pana Młodego',
        notes: [],
        completed: false,
        category: 'IV. Wygląd Młodej Pary',
        createdAt: new Date(),
      },
      {
        id: '23',
        title: 'Garnitury dla świadków',
        notes: [
          'Ksawci i Natan',
        ],
        completed: false,
        category: 'IV. Wygląd Młodej Pary',
        createdAt: new Date(),
      },
      {
        id: '24',
        title: 'Zarezerwowanie próbnej fryzury i makijażu',
        notes: [
          'Czeka na Paulę - kiedyś się umówić',
          'Fryzura nie została wybrana',
          'We wrześniu umówić się na makijaż ślubny i próbny',
        ],
        completed: false,
        category: 'IV. Wygląd Młodej Pary',
        createdAt: new Date(),
      },
      {
        id: '25',
        title: 'Paznokcie',
        notes: [],
        completed: false,
        dueDate: new Date('2026-09-03'),
        category: 'IV. Wygląd Młodej Pary',
        createdAt: new Date(),
      },
      
      // V. Dodatkowe Elementy i Atrakcje
      {
        id: '26',
        title: 'Przemyślenie atrakcji weselnych',
        notes: [
          'Kupić Instax',
          'Ogarnąć zimne ognie i fajerwerki',
        ],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      {
        id: '27',
        title: 'Zarezerwowanie pokoi hotelowych dla gości',
        notes: [
          'Dowiemy się przy potwierdzeniach, czy będą chcieli mieć pokój',
        ],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      {
        id: '28',
        title: 'Zorganizowanie transportu dla gości',
        notes: [],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      {
        id: '29',
        title: 'Potwierdzenie obecności gości',
        notes: [
          'Sprawdzić w umowie',
        ],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      {
        id: '30',
        title: 'Przygotowanie prezentów dla gości',
        notes: [
          'Szyszki',
        ],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      {
        id: '31',
        title: 'Organizacja opieki dla dzieci',
        notes: [
          'Niania dla naszych dzieci',
          'Animatorka?',
        ],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      {
        id: '32',
        title: 'Przygotowanie podziękowań dla rodziców',
        notes: [],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      {
        id: '33',
        title: 'Zamówienie reszty papeterii',
        notes: [
          'Winietki',
          'Menu',
        ],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      {
        id: '34',
        title: 'Ustalenie planu wesela z obsługą sali',
        notes: [
          'Ustalenie z szefem villi presto',
        ],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      {
        id: '35',
        title: 'Wybór piosenki na pierwszy taniec',
        notes: [
          'Ewentualne ćwiczenia',
        ],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      {
        id: '36',
        title: 'Kupić alkohol',
        notes: [],
        completed: false,
        category: 'V. Dodatkowe Elementy',
        createdAt: new Date(),
      },
      
      // VI. Dzień Przed Ślubem
      {
        id: '37',
        title: 'Próba generalna',
        notes: [
          'Jeśli planowana',
        ],
        completed: false,
        dueDate: new Date('2026-09-03'),
        category: 'VI. Dzień Przed Ślubem',
        createdAt: new Date(),
      },
      {
        id: '38',
        title: 'Sprawdzenie czy wszystkie stroje są gotowe',
        notes: [],
        completed: false,
        dueDate: new Date('2026-09-03'),
        category: 'VI. Dzień Przed Ślubem',
        createdAt: new Date(),
      },
      {
        id: '39',
        title: 'Przygotowanie alkoholu i dekoracji na sali',
        notes: [],
        completed: false,
        dueDate: new Date('2026-09-03'),
        category: 'VI. Dzień Przed Ślubem',
        createdAt: new Date(),
      },
      {
        id: '40',
        title: 'Przygotowanie kosmetyczki z niezbędnymi rzeczami',
        notes: [],
        completed: false,
        dueDate: new Date('2026-09-03'),
        category: 'VI. Dzień Przed Ślubem',
        createdAt: new Date(),
      },
      
      // VII. W Dniu Ślubu
      {
        id: '41',
        title: 'Śniadanie',
        notes: [],
        completed: false,
        dueDate: new Date('2026-09-04'),
        category: 'VII. W Dniu Ślubu',
        createdAt: new Date(),
      },
      {
        id: '42',
        title: 'Makijaż i fryzura',
        notes: [],
        completed: false,
        dueDate: new Date('2026-09-04'),
        category: 'VII. W Dniu Ślubu',
        createdAt: new Date(),
      },
      {
        id: '43',
        title: 'Ubieranie się',
        notes: [],
        completed: false,
        dueDate: new Date('2026-09-04'),
        category: 'VII. W Dniu Ślubu',
        createdAt: new Date(),
      },
      {
        id: '44',
        title: 'Zebranie wszystkich ważnych rzeczy',
        notes: [
          'Obrączki',
          'Dokumenty',
          'Telefon',
        ],
        completed: false,
        dueDate: new Date('2026-09-04'),
        category: 'VII. W Dniu Ślubu',
        createdAt: new Date(),
      },
      {
        id: '45',
        title: 'Zapłacenie opłat wymaganych w dniu ślubu',
        notes: [
          'Przygotowanie kopert',
        ],
        completed: false,
        dueDate: new Date('2026-09-04'),
        category: 'VII. W Dniu Ślubu',
        createdAt: new Date(),
      },
      
      // VIII. Dzień Poprawin
      {
        id: '46',
        title: 'Ustalenie planu dnia poprawin',
        notes: [],
        completed: false,
        category: 'VIII. Dzień Poprawin',
        createdAt: new Date(),
      }
    ];

    sampleTasks.forEach(task => {
      // Convert partial task to full task with all required fields
      const completeTask = ensureTaskFields(task);
      this.tasks.set(completeTask.id, completeTask);
    });
  }
}

// Implementacja oparta na lokalnej bazie danych PostgreSQL przy użyciu Drizzle ORM
export class DatabaseStorage implements IStorage {
  constructor() {}
  
  async getUser(id: number): Promise<any | undefined> {
    // Implementacja zostanie dodana później, gdy będziemy potrzebować autentykacji
    return undefined;
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    // Implementacja zostanie dodana później, gdy będziemy potrzebować autentykacji
    return undefined;
  }

  async createUser(insertUser: any): Promise<any> {
    // Implementacja zostanie dodana później, gdy będziemy potrzebować autentykacji
    return { id: 1, ...insertUser };
  }

  async getTasks(): Promise<Task[]> {
    const db = getDb();
    const dbTasks = await db.select().from(tasks).orderBy(desc(tasks.created_at));
    
    // Konwersja z snake_case na camelCase
    return dbTasks.map((dbTask: any) => ({
      id: dbTask.id,
      title: dbTask.title,
      notes: dbTask.notes,
      completed: dbTask.completed,
      category: dbTask.category,
      dueDate: dbTask.due_date,
      createdAt: dbTask.created_at
    }));
  }

  async addTask(task: InsertTask): Promise<Task> {
    // Konwersja z camelCase na snake_case
    const dbTask = {
      id: task.id || Date.now().toString(),
      title: task.title,
      notes: task.notes || [],
      completed: task.completed || false,
      category: task.category,
      due_date: task.dueDate || null,
      created_at: new Date()
    };
    
    const db = getDb();
    const [insertedTask] = await db.insert(tasks).values(dbTask).returning();
    
    // Konwersja z powrotem na camelCase
    return {
      id: insertedTask.id,
      title: insertedTask.title,
      notes: insertedTask.notes,
      completed: insertedTask.completed,
      category: insertedTask.category,
      dueDate: insertedTask.due_date,
      createdAt: insertedTask.created_at
    };
  }

  async updateTask(id: string, updates: UpdateTask): Promise<Task | undefined> {
    // Sprawdź czy zadanie istnieje
    const db = getDb();
    const [existingTask] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existingTask) {
      return undefined;
    }

    // Konwersja z camelCase na snake_case
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    
    const [updatedTask] = await db
      .update(tasks)
      .set(dbUpdates)
      .where(eq(tasks.id, id))
      .returning();
    
    // Konwersja z powrotem na camelCase
    return {
      id: updatedTask.id,
      title: updatedTask.title,
      notes: updatedTask.notes,
      completed: updatedTask.completed,
      category: updatedTask.category,
      dueDate: updatedTask.due_date,
      createdAt: updatedTask.created_at
    };
  }

  async deleteTask(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  async completeTask(id: string): Promise<Task | undefined> {
    // Znajdź zadanie
    const db = getDb();
    const [existingTask] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existingTask) {
      return undefined;
    }

    // Przełącz status
    const [updatedTask] = await db
      .update(tasks)
      .set({ completed: !existingTask.completed })
      .where(eq(tasks.id, id))
      .returning();
    
    // Konwersja na camelCase
    return {
      id: updatedTask.id,
      title: updatedTask.title,
      notes: updatedTask.notes,
      completed: updatedTask.completed,
      category: updatedTask.category,
      dueDate: updatedTask.due_date,
      createdAt: updatedTask.created_at
    };
  }
  
  // Note methods
  async getNotes(): Promise<Note[]> {
    const db = getDb();
    const notesList = await db.select().from(notes).orderBy(desc(notes.created_at));
    
    // Konwersja z snake_case na camelCase
    return notesList.map((note: any) => ({
      id: note.id,
      content: note.content,
      createdAt: note.created_at,
    }));
  }

  async addNote(note: InsertNote): Promise<Note> {
    // Konwersja z camelCase na snake_case
    const db = getDb();
    const [insertedNote] = await db
      .insert(notes)
      .values({
        id: note.id,
        content: note.content,
        created_at: new Date(),
      })
      .returning();
    
    // Konwersja z snake_case na camelCase
    return {
      id: insertedNote.id,
      content: insertedNote.content,
      createdAt: insertedNote.created_at,
    };
  }

  async updateNote(id: string, updates: UpdateNote): Promise<Note | undefined> {
    // Sprawdź czy notatka istnieje
    const db = getDb();
    const [existingNote] = await db.select().from(notes).where(eq(notes.id, id));
    if (!existingNote) {
      return undefined;
    }
    
    // Aktualizuj notatkę
    const [updatedNote] = await db
      .update(notes)
      .set({
        content: updates.content || existingNote.content,
      })
      .where(eq(notes.id, id))
      .returning();
    
    // Konwersja z snake_case na camelCase
    return {
      id: updatedNote.id,
      content: updatedNote.content,
      createdAt: updatedNote.created_at,
    };
  }

  async deleteNote(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(notes).where(eq(notes.id, id)).returning();
    return result.length > 0;
  }
}

// Używamy implementacji PostgreSQL przez Drizzle jako głównego źródła danych
// Sprawdzimy dostępność providerów bazy danych w db-provider.ts
// Storage będzie inicjalizowane dynamicznie przez routes.ts
console.log('Inicjalizacja storage w toku... Szczegóły będą dostępne po uruchomieniu serwera.');

// Eksportujemy instancję DatabaseStorage jako domyślną
export const storage = new DatabaseStorage();

// Alternatywne implementacje (dla celów deweloperskich)
// export const memStorage = new MemStorage();
