import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Plus, Edit } from "@/components/icons";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import AddNote from "./AddNote.tsx";
import { getNotes, Note, deleteNote, updateNote } from "@/lib/api.ts";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
  const [swipeStates, setSwipeStates] = useState<Record<string, { 
    touchStart: number;
    transform: number;
    direction: 'left'|'right'|null 
  }>>({});
  const isMobile = useIsMobile();
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note);
    setEditedContent(note.content);
  }, []);


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

  const handleDeleteNote = useCallback((id: string) => {
    deleteNoteMutation.mutate(id);
  }, [deleteNoteMutation]);

  const handleUpdateNote = () => {
    if (!editingNote) return;
    updateNoteMutation.mutate({ id: editingNote.id, content: editedContent });
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditedContent("");
  };

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, noteId: string) => {
    setSwipeStates(prev => ({
      ...prev,
      [noteId]: {
        touchStart: e.touches[0].clientX,
        transform: 0,
        direction: null
      }
    }));
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent, noteId: string) => {
    if (!isMobile || !swipeStates[noteId]) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStates[noteId].touchStart;
    
    if (Math.abs(deltaX) > 20) {
      setSwipeStates(prev => ({
        ...prev,
        [noteId]: {
          ...prev[noteId],
          transform: deltaX,
          direction: deltaX > 0 ? 'right' : 'left'
        }
      }));
    }
  }, [isMobile, swipeStates]);

  const handleTouchEnd = useCallback((note: Note) => {
    if (!isMobile || !swipeStates[note.id]) return;

    const { transform, direction } = swipeStates[note.id];
    const threshold = 60;
    
    if (Math.abs(transform) > threshold) {
      if (direction === 'right') {
        handleEditNote(note);
      } else {
        handleDeleteNote(note.id);
      }
    }
    
    setSwipeStates(prev => ({
      ...prev,
      [note.id]: {
        touchStart: 0,
        transform: 0,
        direction: null
      }
    }));
    }, [isMobile, swipeStates, handleEditNote, handleDeleteNote]); // Ensure handleEditNote is defined before this useEffect

  // Priorytetowo używamy id_category, jeśli jest dostępne
  const categoryParam = id_category !== undefined ? id_category : category;

  const { data: notes = [], isLoading, refetch } = useQuery<Note[]>({
    queryKey: ["/api/notes", categoryParam, onlyWithoutCategory], 
    queryFn: async () => {
      if (categoryParam !== undefined) {
        const paramName = id_category !== undefined ? 'id_category' : 'category';
        return apiRequest(`/api/notes?${paramName}=${encodeURIComponent(categoryParam.toString())}`);
      } else if (onlyWithoutCategory) {
        return getNotes(true);
      }
      return getNotes();
    },
    staleTime: 0,
  });

  useEffect(() => {
    refetch();
  }, [category, id_category, onlyWithoutCategory, refetch]);

  const filteredNotes = notes.filter((note: Note) => note.content && note.content.trim() !== '');

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

  const handleCreateTask = (content: string, noteCategory?: string | number | null, noteId?: string) => {
    const taskCategory = noteCategory !== undefined && noteCategory !== null 
      ? noteCategory 
      : categoryParam || "I. Ustalenia Ogólne";
    
    const categoryToUse = typeof taskCategory === 'number' 
      ? taskCategory.toString() 
      : taskCategory;
    
    onCreateFromNote(content, categoryToUse);
    
    if (noteId) {
      deleteNoteMutation.mutate(noteId);
    }
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
                className="relative overflow-hidden bg-white shadow rounded-md mb-3 list-none group"
              >
                <div className="absolute inset-0 flex">
                  <div className={cn(
                    'w-1/2 flex items-center justify-end pr-4 transition-colors',
                    swipeStates[note.id]?.direction === 'right' ? 'bg-blue-500' : 'bg-blue-500/50'
                  )}>
                    <Edit className="h-6 w-6 text-white" />
                  </div>
                  <div className={cn(
                    'w-1/2 flex items-center justify-start pl-4 transition-colors',
                    swipeStates[note.id]?.direction === 'left' ? 'bg-red-500' : 'bg-red-500/50'
                  )}>
                    <X className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div 
                  className="flex justify-between items-start p-3 bg-gray-50 rounded-md transition-transform"
                  style={{ transform: `translateX(${swipeStates[note.id]?.transform || 0}px)` }}
                  onTouchStart={(e) => handleTouchStart(e, note.id)}
                  onTouchMove={(e) => handleTouchMove(e, note.id)}
                  onTouchEnd={() => handleTouchEnd(note)}
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
                          onClick={() => handleCreateTask(note.content, note.category || undefined, note.id)}
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
