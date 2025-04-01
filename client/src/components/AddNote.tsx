import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addNote, NoteInput } from '../lib/api.ts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AddNoteProps {
    category?: string | number;
    id_category?: string | number;
    onlyWithoutCategory?: boolean;
}

const AddNote: React.FC<AddNoteProps> = ({ category, id_category, onlyWithoutCategory = false }) => {
    const [note, setNote] = useState('');
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Priorytetowo używamy id_category, jeśli jest dostępne
    const categoryParam = id_category !== undefined ? id_category : category;
    const paramName = id_category !== undefined ? 'id_category' : 'category';

    const mutation = useMutation({
        mutationFn: (noteData: NoteInput) => addNote(noteData),
        onSuccess: () => {
            // Odświeżenie listy notatek po dodaniu nowej
            queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
            
            // Jeśli podano kategorię, odśwież również listę notatek dla tej kategorii
            if (categoryParam !== undefined) {
                queryClient.invalidateQueries({ queryKey: ['/api/notes', categoryParam] });
            }
            
            // Jeśli pokazujemy tylko notatki bez kategorii, odśwież tę listę
            if (onlyWithoutCategory) {
                queryClient.invalidateQueries({ queryKey: ['/api/notes', '', true] });
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
            toast({
                title: 'Błąd',
                description: 'Nie można dodać pustej notatki',
                variant: 'destructive',
                duration: 3000,
            });
            return;
        }

        // Przygotowanie danych notatki
        const noteData: NoteInput = { content: note };

        // Dodanie kategorii do notatki, jeśli została podana
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
        } else if (category !== undefined) {
            // Konwertuj category na liczbę, jeśli to możliwe
            if (typeof category === 'string') {
                try {
                    const parsedCategory = parseInt(category, 10);
                    if (!isNaN(parsedCategory)) {
                        noteData.category = parsedCategory;
                        console.log(`Dodawanie notatki z kategorią (przekonwertowaną na liczbę): ${parsedCategory}`);
                    } else {
                        noteData.category = category;
                        console.log(`Dodawanie notatki z kategorią (string): ${category}`);
                    }
                } catch (e) {
                    noteData.category = category;
                    console.log(`Dodawanie notatki z kategorią (błąd konwersji): ${category}`, e);
                }
            } else {
                noteData.category = category;
                console.log(`Dodawanie notatki z kategorią (liczba): ${category}`);
            }
        } else if (onlyWithoutCategory) {
            // Jeśli pokazujemy tylko notatki bez kategorii, nie dodawaj kategorii
            console.log('Dodawanie notatki bez kategorii');
        }

        console.log('Dane notatki do dodania:', noteData);
        mutation.mutate(noteData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Input
                    type="text"
                    placeholder="Wpisz treść notatki..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-2 border rounded"
                />
            </div>
            <div className="flex justify-end">
                <Button 
                    type="submit" 
                    disabled={mutation.isPending}
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
                >
                    {mutation.isPending ? 'Dodawanie...' : 'Dodaj notatkę'}
                </Button>
            </div>
        </form>
    );
};

export default AddNote;
