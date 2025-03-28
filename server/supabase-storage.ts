import { InsertTask, Task, UpdateTask, InsertNote, Note, UpdateNote } from '@shared/schema';
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
  
  // Implementacja metod do zarządzania notatkami
  async getNotes(): Promise<Note[]> {
    // Implementacja pobierania notatek z Supabase
    const { data, error } = await supabaseApi.supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Błąd podczas pobierania notatek:', error);
      return [];
    }
    
    return data.map((note: any) => ({
      id: note.id,
      content: note.content,
      createdAt: new Date(note.created_at),
    }));
  }
  
  async addNote(note: InsertNote): Promise<Note> {
    // Implementacja dodawania notatki do Supabase
    const { data, error } = await supabaseApi.supabase
      .from('notes')
      .insert({
        id: note.id,
        content: note.content,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Błąd podczas dodawania notatki:', error);
      throw new Error('Nie udało się dodać notatki');
    }
    
    return {
      id: data.id,
      content: data.content,
      createdAt: new Date(data.created_at),
    };
  }
  
  async updateNote(id: string, updates: UpdateNote): Promise<Note | undefined> {
    // Implementacja aktualizacji notatki w Supabase
    const { data, error } = await supabaseApi.supabase
      .from('notes')
      .update({
        content: updates.content,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Błąd podczas aktualizacji notatki:', error);
      return undefined;
    }
    
    return {
      id: data.id,
      content: data.content,
      createdAt: new Date(data.created_at),
    };
  }
  
  async deleteNote(id: string): Promise<boolean> {
    // Implementacja usuwania notatki z Supabase
    const { error } = await supabaseApi.supabase
      .from('notes')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Błąd podczas usuwania notatki:', error);
      return false;
    }
    
    return true;
  }
}

// Eksportujemy instancję SupabaseStorage do użycia w aplikacji
export const supabaseStorage = new SupabaseStorage();