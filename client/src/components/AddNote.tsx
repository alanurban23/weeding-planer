// AddNote.tsx

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNote, NoteInput } from '../lib/api.ts'; // Assuming NoteInput is defined correctly
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Using Input instead of Textarea as in original AddNote
import { Textarea } from "@/components/ui/textarea"; // Or use Textarea if preferred
import { useToast } from "@/hooks/use-toast";

// Helper function (should be identical to the one in NotesSection or imported from a shared location)
const getNotesQueryKey = (
  categoryParam: string | number | undefined,
  onlyWithoutCategory: boolean
) => {
  const baseKey = ["/api/notes"];
  if (categoryParam !== undefined) {
    // Use the object structure for consistency with NotesSection query
    return [...baseKey, { category: categoryParam }];
  }
  if (onlyWithoutCategory) {
    // Use the object structure for consistency
    return [...baseKey, { withoutCategory: true }];
  }
  return baseKey; // Query key for all notes
};


// 1. Update AddNoteProps Interface
interface AddNoteProps {
    category?: string | number;
    id_category?: string | number;
    onlyWithoutCategory?: boolean;
    onNoteAdded?: () => void; // <-- Add this prop definition (optional)
}

// 2. Destructure the Prop
const AddNote: React.FC<AddNoteProps> = ({
    category,
    id_category,
    onlyWithoutCategory = false,
    onNoteAdded // <-- Destructure the new prop
}) => {
    const [noteContent, setNoteContent] = useState(''); // Renamed state variable for clarity
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const categoryParam = id_category ?? category; // Simplified category determination

    const mutation = useMutation({
        mutationFn: (noteData: NoteInput) => addNote(noteData),
        onSuccess: () => {
            // 4. Refine Query Invalidation using the helper
            const notesQueryKey = getNotesQueryKey(categoryParam, onlyWithoutCategory);
            queryClient.invalidateQueries({ queryKey: notesQueryKey });

            // It's often good practice to invalidate the base key too,
            // in case other parts of the app show all notes.
            queryClient.invalidateQueries({ queryKey: ['/api/notes'] });

            // Reset the form input
            setNoteContent('');
            toast({
                title: 'Sukces',
                description: 'Notatka została dodana pomyślnie.',
                duration: 3000,
            });

            // 3. Call the Callback function if provided
            if (onNoteAdded) {
                onNoteAdded(); // This signals the parent component (NotesSection)
            }
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
        if (!noteContent.trim()) {
            toast({
                title: 'Błąd',
                description: 'Nie można dodać pustej notatki',
                variant: 'destructive',
                duration: 3000,
            });
            return;
        }

        // Prepare note data - simplified logic
        const noteData: NoteInput = { content: noteContent.trim() };

        // Assign id_category or category, prioritizing id_category
        if (id_category !== undefined) {
            // Assuming your API expects id_category (can be string or number based on NoteInput)
             noteData.id_category = typeof id_category === 'string' ? (parseInt(id_category, 10) || id_category) : id_category;
        } else if (category !== undefined && !onlyWithoutCategory) {
            // Assign category only if id_category is not present and we are not in 'onlyWithoutCategory' mode
             noteData.category = typeof category === 'string' ? (parseInt(category, 10) || category) : category;
        }
        // If onlyWithoutCategory is true, neither id_category nor category should be explicitly set (unless id_category was passed)

        console.log('Dane notatki do dodania:', noteData);
        mutation.mutate(noteData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
             {/* Using Textarea seems more appropriate for notes */}
            <Textarea
                placeholder="Wpisz treść notatki..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3} // Give it some initial height
            />
            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={mutation.isPending || !noteContent.trim()} // Disable if pending or empty
                    className="px-4 py-2" // Use default button styling from ui/button
                >
                    {mutation.isPending ? 'Dodawanie...' : 'Dodaj notatkę'}
                </Button>
            </div>
        </form>
    );
};

export default AddNote;

// Make sure the NoteInput type in lib/api.ts aligns with the data being sent
// Example definition:
// export interface NoteInput {
//   content: string;
//   category?: string | number;
//   id_category?: string | number;
// }