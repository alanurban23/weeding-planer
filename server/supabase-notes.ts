import { Note, InsertNote, UpdateNote } from '@shared/schema';
import { supabase } from './supabase';

// Nazwa tabeli
const NOTES_TABLE = 'notes';

/**
 * Funkcja do konwersji notatki z formatu Supabase do JavaScript
 */
const convertNote = (note: any): Note => {
  return {
    id: note.id,
    content: note.content,
    createdAt: note.created_at ? new Date(note.created_at) : new Date(),
  };
};

/**
 * Pobierz wszystkie notatki z Supabase
 */
export const fetchNotes = async (): Promise<Note[]> => {
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Błąd podczas pobierania notatek:', error);
    throw new Error(`Błąd podczas pobierania notatek: ${error.message}`);
  }
  
  return (data || []).map(convertNote);
};

/**
 * Dodaj nową notatkę do Supabase
 */
export const addNote = async (note: InsertNote): Promise<Note> => {
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .insert({
      id: note.id,
      content: note.content,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('Błąd podczas dodawania notatki:', error);
    throw new Error(`Błąd podczas dodawania notatki: ${error.message}`);
  }
  
  return convertNote(data);
};

/**
 * Aktualizuj notatkę w Supabase
 */
export const updateNote = async (id: string, updates: UpdateNote): Promise<Note> => {
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .update({
      content: updates.content,
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error(`Błąd podczas aktualizacji notatki ${id}:`, error);
    throw new Error(`Błąd podczas aktualizacji notatki: ${error.message}`);
  }
  
  return convertNote(data);
};

/**
 * Usuń notatkę z Supabase
 */
export const deleteNote = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from(NOTES_TABLE)
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`Błąd podczas usuwania notatki ${id}:`, error);
    throw new Error(`Błąd podczas usuwania notatki: ${error.message}`);
  }
  
  return true;
};