import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNote, NoteInput } from '../lib/api.ts';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CategoryNoteProps {
  categoryName: string | number;
  id_category?: string | number;
  onCreateFromNote?: (content: string, category: string | number) => void;
}

const CategoryNote: React.FC<CategoryNoteProps> = ({ categoryName, id_category, onCreateFromNote }) => {
  const [note, setNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [createAsTask, setCreateAsTask] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Priorytetowo używamy id_category, jeśli jest dostępne
  const categoryParam = id_category !== undefined ? id_category : categoryName;

  const mutation = useMutation({
    mutationFn: (noteData: NoteInput) => addNote(noteData),
    onSuccess: (data) => {
      // Odświeżenie list notatek po dodaniu nowej
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      
      // Odśwież listę notatek dla tej kategorii
      if (categoryParam) {
        queryClient.invalidateQueries({ queryKey: ['/api/notes', categoryParam] });
      }
      
      // Odśwież również listę notatek bez kategorii
      queryClient.invalidateQueries({ queryKey: ['/api/notes', '', true] });
      
      // Jeśli użytkownik chce utworzyć zadanie z notatki i przekazano funkcję do tworzenia zadania
      if (createAsTask && onCreateFromNote) {
        // Używamy id_category, jeśli jest dostępne
        onCreateFromNote(note, categoryParam);
      }
      
      // Resetowanie formularza
      setNote('');
      setIsExpanded(false);
      setCreateAsTask(false);
      
      toast({
        title: 'Sukces',
        description: createAsTask ? 'Zadanie zostało dodane pomyślnie.' : 'Notatka została dodana pomyślnie.',
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Błąd dodawania notatki:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać notatki. Spróbuj ponownie.',
        variant: 'destructive',
        duration: 3000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      toast({
        title: 'Błąd',
        description: 'Nie można dodać pustej notatki',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    // Jeśli użytkownik chce utworzyć zadanie, wywołaj tylko funkcję onCreateFromNote
    if (createAsTask && onCreateFromNote) {
      onCreateFromNote(note, categoryParam);
      setNote('');
      setIsExpanded(false);
      setCreateAsTask(false);
      return;
    }

    // Przygotowanie danych notatki
    const noteData: NoteInput = { content: note };

    // Dodanie kategorii do notatki
    if (id_category !== undefined) {
        // Konwertuj id_category na liczbę, jeśli to możliwe
        if (typeof id_category === 'string') {
            try {
                const parsedId = parseInt(id_category, 10);
                if (!isNaN(parsedId)) {
                    noteData.id_category = parsedId;
                    console.log(`Dodawanie notatki z id_category (przekonwertowaną na liczbę): ${parsedId}`);
                } else {
                    // Jeśli nie można przekonwertować, użyj oryginalnej wartości
                    noteData.id_category = id_category;
                    console.log(`Dodawanie notatki z id_category (string): ${id_category}`);
                }
            } catch (e) {
                noteData.id_category = id_category;
                console.log(`Dodawanie notatki z id_category (błąd konwersji): ${id_category}`, e);
            }
        } else {
            // Jeśli to już liczba, użyj jej bezpośrednio
            noteData.id_category = id_category;
            console.log(`Dodawanie notatki z id_category (liczba): ${id_category}`);
        }
    } else if (categoryName) {
        // Konwertuj categoryName na liczbę, jeśli to możliwe
        if (typeof categoryName === 'string') {
            try {
                const parsedCategory = parseInt(categoryName, 10);
                if (!isNaN(parsedCategory)) {
                    noteData.category = parsedCategory;
                    console.log(`Dodawanie notatki z kategorią (przekonwertowaną na liczbę): ${parsedCategory}`);
                } else {
                    noteData.category = categoryName;
                    console.log(`Dodawanie notatki z kategorią (string): ${categoryName}`);
                }
            } catch (e) {
                noteData.category = categoryName;
                console.log(`Dodawanie notatki z kategorią (błąd konwersji): ${categoryName}`, e);
            }
        } else {
            noteData.category = categoryName;
            console.log(`Dodawanie notatki z kategorią (liczba): ${categoryName}`);
        }
    }

    console.log('Dane notatki do dodania:', noteData);
    mutation.mutate(noteData);
  };

  const handleCancel = () => {
    setNote('');
    setIsExpanded(false);
    setCreateAsTask(false);
  };

  if (!isExpanded) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <Button 
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Dodaj notatkę w tej kategorii
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h3 className="text-lg font-medium mb-3">Dodaj notatkę w kategorii: {categoryName}</h3>
      <form onSubmit={handleSubmit}>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Wpisz treść notatki..."
          className="w-full mb-3 min-h-[100px]"
          required
        />
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            id="createAsTask"
            checked={createAsTask}
            onChange={(e) => setCreateAsTask(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="createAsTask" className="text-sm text-gray-600">
            Dodaj jako zadanie (zamiast notatki)
          </label>
        </div>
        <div className="flex space-x-2 justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
          >
            Anuluj
          </Button>
          <Button 
            type="submit" 
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Dodawanie...' : createAsTask ? 'Dodaj zadanie' : 'Dodaj notatkę'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CategoryNote;
