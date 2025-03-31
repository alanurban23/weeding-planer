import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "@/components/icons";
import { generateId } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface Note {
  id: string;
  content: string;
  createdAt: Date;
}

interface NotesSectionProps {
  onCreateFromNote: (content: string, category: string) => void;
}

export const NotesSection: React.FC<NotesSectionProps> = ({ onCreateFromNote }) => {
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const queryClient = useQueryClient();

  // Pobieranie notatek
  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    queryFn: () => apiRequest("/api/notes")
  });

  // Dodawanie notatki
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const newNote = {
        id: generateId(),
        content,
      };
      return apiRequest("/api/notes", "POST", newNote);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNewNoteContent("");
      setShowAddNoteForm(false);
    },
    onError: (error) => {
      console.error("Błąd dodawania notatki:", error);
    }
  });

  // Usuwanie notatki
  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => {
      return apiRequest("/api/notes/" + id, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const handleAddNote = () => {
    if (newNoteContent.trim()) {
      addNoteMutation.mutate(newNoteContent);
    }
  };

  const handleDeleteNote = (id: string) => {
    deleteNoteMutation.mutate(id);
  };

  const handleCreateTask = (content: string, category: string = "I. Ustalenia Ogólne") => {
    onCreateFromNote(content, category);
    // Możemy usunąć notatkę po przekształceniu jej w zadanie
    // deleteNoteMutation.mutate(id);
  };

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-medium">Notatki</h2>
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
          <div className="flex space-x-2">
            <Input
              type="text"
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Wpisz treść notatki..."
              className="flex-1"
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNoteContent.trim() || addNoteMutation.isPending}
            >
              Dodaj
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddNoteForm(false);
                setNewNoteContent("");
              }}
            >
              Anuluj
            </Button>
          </div>
        </div>
      )}

      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Ładowanie notatek...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-4 text-gray-500">Brak notatek</div>
        ) : (
          <ul className="space-y-2">
            {notes
              .filter(note => note.content && note.content.trim() !== '') 
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
                      onClick={() => handleCreateTask(note.content)}
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
};