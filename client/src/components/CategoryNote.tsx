import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNote, NoteInput } from '../lib/api.ts';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CategoryNoteProps {
  categoryName: string;
  onCreateFromNote?: (content: string, category: string) => void;
}

const CategoryNote: React.FC<CategoryNoteProps> = ({ categoryName, onCreateFromNote }) => {
  const [note, setNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [createAsTask, setCreateAsTask] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (noteData: NoteInput) => addNote(noteData),
    onSuccess: (data) => {
      // Odświeżenie list notatek po dodaniu nowej
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notes', categoryName] });
      
      // Jeśli użytkownik chce utworzyć zadanie z notatki i przekazano funkcję do tworzenia zadania
      if (createAsTask && onCreateFromNote) {
        onCreateFromNote(note, categoryName);
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
    
    // Dodaj notatkę
    if (!createAsTask) {
      // Zawsze dodajemy kategorię do notatki
      mutation.mutate({ 
        content: note,
        category: categoryName 
      });
    } else {
      // Jeśli użytkownik chce utworzyć zadanie, wywołaj tylko funkcję onCreateFromNote
      if (onCreateFromNote) {
        onCreateFromNote(note, categoryName);
        setNote('');
        setIsExpanded(false);
        setCreateAsTask(false);
        toast({
          title: 'Sukces',
          description: 'Zadanie zostało dodane pomyślnie.',
          duration: 3000,
        });
      }
    }
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
          variant="outline" 
          className="w-full flex items-center justify-center text-gray-500 hover:text-primary"
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
