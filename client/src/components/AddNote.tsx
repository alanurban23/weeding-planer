import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNote, NoteInput } from '../lib/api.ts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AddNoteProps {
    category?: string;
    onlyWithoutCategory?: boolean;
}

const AddNote: React.FC<AddNoteProps> = ({ category, onlyWithoutCategory = false }) => {
    const [note, setNote] = useState('');
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const mutation = useMutation({
        mutationFn: (noteData: NoteInput) => addNote(noteData),
        onSuccess: () => {
            // Odświeżenie listy notatek po dodaniu nowej
            queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
            
            // Jeśli podano kategorię, odśwież również listę notatek dla tej kategorii
            if (category) {
                queryClient.invalidateQueries({ queryKey: ['/api/notes', category] });
            }
            
            // Jeśli pokazujemy tylko notatki bez kategorii, odśwież tę listę
            if (onlyWithoutCategory) {
                queryClient.invalidateQueries({ queryKey: ['/api/notes', null, true] });
            }
            
            // Resetowanie formularza
            setNote('');
            toast({
                title: 'Sukces',
                description: 'Notatka została dodana pomyślnie.',
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
            console.log("Nie można dodać pustej notatki");
            return;
        }
        
        // Przygotuj dane notatki
        const noteData: NoteInput = { 
            content: note
        };
        
        // Dodaj kategorię do notatki tylko jeśli została podana i nie jesteśmy w trybie "tylko bez kategorii"
        if (category && !onlyWithoutCategory) {
            noteData.category = category;
        }
        
        mutation.mutate(noteData);
    };

    return (
        <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Wpisz treść notatki..."
                className="flex-1"
                required
            />
            <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Dodawanie...' : 'Dodaj'}
            </Button>
        </form>
    );
};

export default AddNote;
