import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNote, NoteInput } from '../lib/api'; // Assuming addNote(data: NoteInput) signature
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from 'lucide-react'; // Import icons
import { Checkbox } from "@/components/ui/checkbox"; // Assuming you use shadcn Checkbox
import { Label } from "@/components/ui/label"; // Assuming you use shadcn Label

// Helper function (should be identical/imported from shared location)
const getNotesQueryKey = (
  categoryParam: string | number | undefined,
  onlyWithoutCategory: boolean // Although not used here for adding, keep for consistency if helper is shared
) => {
  const baseKey = ["/api/notes"];
  if (categoryParam !== undefined) {
    return [...baseKey, { category: categoryParam }];
  }
  // This component adds *to* a category, so 'withoutCategory' case isn't relevant for invalidation here
  // if (onlyWithoutCategory) {
  //   return [...baseKey, { withoutCategory: true }];
  // }
  return baseKey;
};


interface CategoryNoteProps {
  categoryName: string | number; // Display name for the category context
  id_category?: string | number; // Actual ID to associate the note with (priority)
  // Callback to create a task *instead* of a note
  onCreateFromNote?: (content: string, category: string | number) => void;
}

const CategoryNote: React.FC<CategoryNoteProps> = ({
  categoryName,
  id_category,
  onCreateFromNote
}) => {
  const [noteContent, setNoteContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [createAsTask, setCreateAsTask] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Determine the category identifier to use (prioritize id_category)
  const categoryParam = id_category ?? categoryName; // Use ?? for nullish coalescing

  // Mutation to add a note
  const mutation = useMutation({
    mutationFn: (noteData: NoteInput) => addNote(noteData), // Assumes this signature is correct
    onSuccess: (/* data - created note, if returned */) => {
      // Generate the specific query key for this category
      const notesInThisCategoryKey = getNotesQueryKey(categoryParam, false);

      // Invalidate the general notes list and the list for this specific category
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] }); // Base key for all notes
      queryClient.invalidateQueries({ queryKey: notesInThisCategoryKey });

      // Reset form state
      setNoteContent('');
      setIsExpanded(false);
      setCreateAsTask(false); // Reset checkbox

      toast({
        title: 'Sukces',
        description: 'Notatka została dodana pomyślnie.', // Always a note if onSuccess runs
        duration: 3000,
      });
    },
    onError: (error: unknown) => {
      console.error('Błąd dodawania notatki:', error);
      const message = error instanceof Error ? error.message : "Nieznany błąd";
      toast({
        title: 'Błąd',
        description: `Nie udało się dodać notatki: ${message}`,
        variant: 'destructive',
        duration: 3000,
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContent = noteContent.trim();

    if (!trimmedContent) {
      toast({ title: 'Błąd', description: 'Treść nie może być pusta', variant: 'destructive' });
      return;
    }

    // --- Handle "Create as Task" scenario ---
    if (createAsTask) {
      if (onCreateFromNote) {
        // Call the provided function to handle task creation
        onCreateFromNote(trimmedContent, categoryParam);
        // Reset form and state immediately after calling the handler
        setNoteContent('');
        setIsExpanded(false);
        setCreateAsTask(false);
        // Show success toast for task creation (handled by the parent or here if desired)
        toast({
          title: 'Sukces',
          description: 'Zadanie zostało utworzone.',
          duration: 3000,
        });
      } else {
        // This case shouldn't happen if checkbox is disabled when onCreateFromNote is missing, but handle defensively
        console.warn('Attempted to create task, but onCreateFromNote callback is missing.');
        toast({ title: 'Błąd konfiguracji', description: 'Funkcja tworzenia zadania nie jest dostępna.', variant: 'destructive' });
      }
      return; // Stop execution here if creating a task
    }

    // --- Handle "Create as Note" scenario ---
    const noteData: NoteInput = { content: trimmedContent };

    // Assign id_category or category, prioritizing id_category
    // Simplified parsing logic
    if (id_category !== undefined) {
      noteData.id_category = typeof id_category === 'string' ? (parseInt(id_category, 10) || id_category) : id_category;
    } else if (categoryName !== undefined) { // Use categoryName if id_category is absent
      noteData.category = typeof categoryName === 'string' ? (parseInt(categoryName, 10) || categoryName) : categoryName;
    }
    // Ensure the structure of noteData matches the expected NoteInput for your API

    // Trigger the mutation to add the note
    mutation.mutate(noteData);
  };

  // Handle cancelling the form
  const handleCancel = () => {
    setNoteContent('');
    setIsExpanded(false);
    setCreateAsTask(false);
  };

  // Render collapsed state
  if (!isExpanded) {
    return (
       // Use a simpler container or just the button if no background/shadow needed when collapsed
      <div className="mb-6">
         <Button
          variant="outline" // Example style
          className="flex items-center w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => setIsExpanded(true)}
          aria-expanded={isExpanded} // Accessibility
        >
          <Plus className="h-4 w-4 mr-2" />
          Dodaj notatkę w kategorii "{categoryName}"
        </Button>
      </div>
    );
  }

  // Render expanded state (form)
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border">
      <h3 className="text-lg font-medium mb-3">Dodaj {createAsTask ? 'zadanie' : 'notatkę'} w kategorii: {categoryName}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder={createAsTask ? "Wpisz treść zadania..." : "Wpisz treść notatki..."}
          className="w-full min-h-[100px]"
          required
          autoFocus // Auto focus when expanded
          disabled={mutation.isPending} // Disable textarea during note submission
        />
        {/* Conditionally render checkbox only if task creation callback is provided */}
        {onCreateFromNote && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createAsTask"
                checked={createAsTask}
                onCheckedChange={(checked) => setCreateAsTask(Boolean(checked))} // Adapt based on Checkbox component API
                disabled={mutation.isPending} // Disable checkbox during note submission
              />
              <Label htmlFor="createAsTask" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Dodaj jako zadanie (zamiast notatki)
              </Label>
            </div>
        )}
        <div className="flex space-x-2 justify-end">
          <Button
            type="button" // Ensure it doesn't submit the form
            variant="outline"
            onClick={handleCancel}
            disabled={mutation.isPending} // Disable cancel during note submission
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            // Disable if note mutation is pending OR if trying to submit empty content
            disabled={mutation.isPending || !noteContent.trim()}
          >
            {/* Show loader only if adding a NOTE */}
            {mutation.isPending && !createAsTask && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mutation.isPending && !createAsTask ? 'Dodawanie...' : createAsTask ? 'Dodaj zadanie' : 'Dodaj notatkę'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CategoryNote;