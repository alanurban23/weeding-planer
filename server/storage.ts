import { Task, InsertTask, UpdateTask } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, any>;
  private tasks: Map<string, Task>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.currentId = 1;
    
    // Add sample tasks for initial data
    this.initializeSampleTasks();
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
      createdAt: new Date(),
    };
    
    this.tasks.set(task.id, newTask);
    return newTask;
  }

  async updateTask(id: string, updates: UpdateTask): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask: Task = {
      ...task,
      ...updates,
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

  private initializeSampleTasks() {
    const sampleTasks: Task[] = [
      {
        id: '1',
        title: 'Ustalenie daty ślubu i rezerwacja miejsca',
        notes: [
          '4 września 2026',
          'Villa Presto',
          'Brzóza Królewska sala nr 2',
          'Zaliczka 3500 zł do 31 Marca 2025',
          'Płatność 50% kaucji do 20 sierpnia 2026',
          'Druga płatność 50% - 4 dni po 8 września',
        ],
        completed: false,
        dueDate: new Date('2026-09-04'),
        category: 'Ustalenia Ogólne',
        createdAt: new Date(),
      },
      {
        id: '5',
        title: 'Określenie budżetu i listy gości',
        notes: [
          'Cena za talerzyk: 315 zł',
          'Orientacyjna liczba gości: ok 115 os',
          'Lista Gości: [Lista Gości]',
        ],
        completed: false,
        category: 'Ustalenia Ogólne',
        createdAt: new Date(),
      },
      {
        id: '7',
        title: 'Wybór fotografa, kamerzysty',
        notes: [
          'Podpisana umowa',
          'Cena: 12300 zł po weselu (Każda dodatkowa godzina to 500 złotych)',
          'Firma: Cozawesele',
        ],
        completed: true,
        category: 'Wybór Podwykonawców',
        createdAt: new Date(),
      },
      {
        id: '22',
        title: 'Zarezerwowanie terminu w kościele',
        notes: ['Jutro.'],
        completed: false,
        dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        category: 'Przygotowania do Ceremonii',
        createdAt: new Date(),
      },
      {
        id: '23',
        title: 'Nauki przedmałżeńskie',
        notes: [
          'Rozpoczęcie przygotowań do nauk przedmałżeńskich (jeśli ślub kościelny).',
          '25-27 Kurs weekendowy w Rakszawie nauki przedmałżeńskie o 18:00.',
        ],
        completed: false,
        dueDate: new Date('2025-01-25'),
        category: 'Przygotowania do Ceremonii',
        createdAt: new Date(),
      },
      {
        id: '33',
        title: 'Wybór sukni ślubnej',
        notes: [],
        completed: false,
        category: 'Wygląd Młodej Pary',
        createdAt: new Date(),
      },
      {
        id: '45',
        title: 'Przemyślenie atrakcji weselnych',
        notes: [
          'Kupić Instax.',
          'Ogarnąć zimne ognie i fajerwerki.',
        ],
        completed: false,
        category: 'Dodatkowe Elementy',
        createdAt: new Date(),
      }
    ];

    sampleTasks.forEach(task => {
      this.tasks.set(task.id, task);
    });
  }
}

export const storage = new MemStorage();
