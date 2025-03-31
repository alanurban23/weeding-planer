import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Plus } from "@/components/icons";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddNote from "./AddNote.tsx";
import { getNotes, Note } from "@/lib/api.ts";

interface NotesSectionProps {
  onCreateFromNote: (content: string, category: string) => void;
  category?: string; 
}

export const NotesSection: React.FC<NotesSectionProps> = ({ onCreateFromNote, category }) => {
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notes = [], isLoading, refetch } = useQuery<Note[]>({
    queryKey: ["/api/notes", category], 
    queryFn: async () => {
      if (category) {
        const response = await fetch(`/api/notes?category=${encodeURIComponent(category)}`);
        if (!response.ok) {
          throw new Error('Błąd pobierania notatek dla kategorii');
        }
        return response.json();
      }
      return getNotes();
    }
  });

  useEffect(() => {
    refetch();
  }, [category, refetch]);

  const filteredNotes = notes.filter((note: Note) => note.content && note.content.trim() !== '');

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => {
      return apiRequest("/api/notes/" + id, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      if (category) {
        queryClient.invalidateQueries({ queryKey: ["/api/notes", category] });
      }
    },
  });

  const handleDeleteNote = (id: string) => {
    deleteNoteMutation.mutate(id);
  };

  const handleCreateTask = (content: string, noteCategory: string = category || "I. Ustalenia Ogólne") => {
    onCreateFromNote(content, noteCategory);
  };

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-medium">
          {category ? `Notatki w kategorii: ${category}` : "Notatki"}
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
          <AddNote category={category} />
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
            {category ? `Brak notatek w kategorii ${category}` : "Brak notatek"}
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredNotes
              .map((note) => (
                <li
                  key={note.id}
                  className="flex justify-between items-start p-3 bg-gray-50 rounded-md group"
                >
                  <div className="flex-1">
                    {note.content}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCreateTask(note.content, note.category)}
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
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}