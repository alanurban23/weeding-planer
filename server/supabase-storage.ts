import { InsertTask, Task, UpdateTask } from '@shared/schema';
import * as supabaseApi from './supabase';
import { IStorage } from './storage';

// Implementacja klasy SupabaseStorage do interakcji z bazą danych Supabase
export class SupabaseStorage implements IStorage {
  // Implementacja dla użytkowników (obecnie nieużywana)
  async getUser(id: number): Promise<any | undefined> {
    // W przyszłości zaimplementować pobieranie użytkownika z Supabase
    return undefined;
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    // W przyszłości zaimplementować pobieranie użytkownika z Supabase 
    return undefined;
  }

  async createUser(user: any): Promise<any> {
    // W przyszłości zaimplementować tworzenie użytkownika w Supabase
    return undefined;
  }
  
  // Implementacja metod do zarządzania zadaniami
  async getTasks(): Promise<Task[]> {
    return supabaseApi.fetchTasks();
  }
  
  async addTask(task: InsertTask): Promise<Task> {
    return supabaseApi.addTask(task);
  }

  async updateTask(id: string, updates: UpdateTask): Promise<Task | undefined> {
    return supabaseApi.updateTask(id, updates);
  }

  async deleteTask(id: string): Promise<boolean> {
    return supabaseApi.deleteTask(id);
  }

  async completeTask(id: string): Promise<Task | undefined> {
    return supabaseApi.toggleTaskCompletion(id);
  }
}

// Eksportujemy instancję SupabaseStorage do użycia w aplikacji
export const supabaseStorage = new SupabaseStorage();