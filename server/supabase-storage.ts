import { InsertTask, Task, UpdateTask, InsertNote, Note, UpdateNote } from '@shared/schema';
import * as supabaseApi from './supabase';
import * as supabaseNotesApi from './supabase-notes';
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
  
  // Implementacja metod do zarządzania notatkami
  async getNotes(): Promise<Note[]> {
    try {
      return await supabaseNotesApi.fetchNotes();
    } catch (error) {
      console.error('Błąd podczas pobierania notatek:', error);
      return [];
    }
  }
  
  async addNote(note: InsertNote): Promise<Note> {
    try {
      return await supabaseNotesApi.addNote(note);
    } catch (error) {
      console.error('Błąd podczas dodawania notatki:', error);
      throw new Error('Nie udało się dodać notatki');
    }
  }
  
  async updateNote(id: string, updates: UpdateNote): Promise<Note | undefined> {
    try {
      return await supabaseNotesApi.updateNote(id, updates);
    } catch (error) {
      console.error('Błąd podczas aktualizacji notatki:', error);
      return undefined;
    }
  }
  
  async deleteNote(id: string): Promise<boolean> {
    try {
      return await supabaseNotesApi.deleteNote(id);
    } catch (error) {
      console.error('Błąd podczas usuwania notatki:', error);
      return false;
    }
  }
}

// Eksportujemy instancję SupabaseStorage do użycia w aplikacji
export const supabaseStorage = new SupabaseStorage();