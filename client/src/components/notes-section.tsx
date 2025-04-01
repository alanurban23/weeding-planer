import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Plus, Edit } from "@/components/icons";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import AddNote from "./AddNote.tsx";
import { getNotes, Note, deleteNote, updateNote } from "@/lib/api.ts";

interface NotesSectionProps {
  onCreateFromNote: (content: string, category: string | number) => void;
  category?: string | number; 
  id_category?: string | number;
  onlyWithoutCategory?: boolean;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ 
  onCreateFromNote, 
  category,
  id_category,
  onlyWithoutCategory = false
}) => {
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Priorytetowo używamy id_category, jeśli jest dostępne
  const categoryParam = id_category !== undefined ? id_category : category;

  const { data: notes = [], isLoading, refetch } = useQuery<Note[]>({
    queryKey: ["/api/notes", categoryParam, onlyWithoutCategory], 
    queryFn: async () => {
      // Jeśli podano kategorię, pobierz notatki dla tej kategorii
      if (categoryParam !== undefined) {
        // Używamy id_category w URL, jeśli jest dostępne
        const paramName = id_category !== undefined ? 'id_category' : 'category';
        return apiRequest(`/api/notes?${paramName}=${encodeURIComponent(categoryParam.toString())}`);
      }
      // Jeśli chcemy tylko notatki bez kategorii
      else if (onlyWithoutCategory) {
        return getNotes(true);
      }
      // W przeciwnym razie pobierz wszystkie notatki
      return getNotes();
    },
    staleTime: 0, // Always fetch fresh data
  });

  useEffect(() => {
    refetch();
  }, [category, id_category, onlyWithoutCategory, refetch]);

  const filteredNotes = notes.filter((note: Note) => note.content && note.content.trim() !== '');

  // Usuwanie notatki
  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      if (categoryParam) {
        queryClient.invalidateQueries({ queryKey: ["/api/notes", categoryParam] });
      }
      toast({
        title: "Sukces",
        description: "Notatka została usunięta",
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error("Błąd usuwania notatki:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć notatki",
        variant: "destructive",
        duration: 3000,
      });
    }
  });

  // Edytowanie notatki
  const updateNoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => 
      updateNote(id, { content, category: editingNote?.category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      if (categoryParam) {
        queryClient.invalidateQueries({ queryKey: ["/api/notes", categoryParam] });
      }
      setEditingNote(null);
      toast({
        title: "Sukces",
        description: "Notatka została zaktualizowana",
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error("Błąd aktualizacji notatki:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaktualizować notatki",
        variant: "destructive",
        duration: 3000,
      });
    }
  });

  const handleDeleteNote = (id: string) => {
    deleteNoteMutation.mutate(id);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setEditedContent(note.content);
  };

  const handleUpdateNote = () => {
    if (!editingNote) return;
    updateNoteMutation.mutate({ id: editingNote.id, content: editedContent });
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditedContent("");
  };

  const handleCreateTask = (content: string, noteCategory?: string | number | null) => {
    // Użyj kategorii notatki, jeśli istnieje, w przeciwnym razie użyj bieżącej kategorii lub domyślnej
    const taskCategory = noteCategory !== undefined && noteCategory !== null 
      ? noteCategory 
      : categoryParam || "I. Ustalenia Ogólne";
    
    // Konwertuj kategorię na string, jeśli to liczba
    const categoryToUse = typeof taskCategory === 'number' 
      ? taskCategory.toString() 
      : taskCategory;
    
    onCreateFromNote(content, categoryToUse);
  };

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-medium">
          {categoryParam ? `Notatki w kategorii: ${categoryParam}` : onlyWithoutCategory ? "Notatki bez kategorii" : "Notatki"}
        </h2>
        <Button 
          variant="ghost" 
          onClick={() => setShowAddNoteForm(true)}
          className="flex items-center text-primary hover:text-primary-600 hover:bg-primary-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          Dodaj notatkę
        </Button>
      </div>

      {showAddNoteForm && (
        <div className="p-4 border-b">
          <AddNote 
            id_category={id_category} 
            category={categoryParam} 
            onlyWithoutCategory={onlyWithoutCategory} 
          />
          <Button
            variant="outline"
            onClick={() => setShowAddNoteForm(false)}
            className="mt-2"
          >
            Anuluj
          </Button>
        </div>
      )}

      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Ładowanie notatek...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {categoryParam ? `Brak notatek w kategorii ${categoryParam}` : onlyWithoutCategory ? "Brak notatek bez kategorii" : "Brak notatek"}
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredNotes.map((note) => (
              <li
                key={note.id}
                className="flex justify-between items-start p-3 bg-gray-50 rounded-md group"
              >
                {editingNote?.id === note.id ? (
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleUpdateNote} disabled={updateNoteMutation.isPending}>
                        {updateNoteMutation.isPending ? "Zapisywanie..." : "Zapisz"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        Anuluj
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      {note.content}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditNote(note)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity"
                        title="Edytuj notatkę"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCreateTask(note.content, note.category || undefined)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary flex items-center transition-opacity"
                        title="Przekształć na zadanie"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-xs ml-1">Przekształć na zadanie</span>
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                        title="Usuń notatkę"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}