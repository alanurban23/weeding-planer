import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Plus, Edit } from "@/components/icons";
import { apiRequest } from "@/lib/queryClient"; // Assuming this handles errors/parsing
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import AddNote from "./AddNote.tsx";
import { getNotes, Note, deleteNote, updateNote } from "@/lib/api.ts";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface NotesSectionProps {
  onCreateFromNote: (content: string, category: string) => void; // Simplify category to always be string for the callback
  category?: string | number;
  id_category?: string | number;
  onlyWithoutCategory?: boolean;
}

// Helper to generate the query key consistently
const getNotesQueryKey = (
  categoryParam: string | number | undefined,
  onlyWithoutCategory: boolean
) => {
  // Use a stable identifier for the "no category" or "all notes" case
  const baseKey = ["/api/notes"];
  if (categoryParam !== undefined) {
    return [...baseKey, { category: categoryParam }];
  }
  if (onlyWithoutCategory) {
    return [...baseKey, { withoutCategory: true }];
  }
  return baseKey; // Query key for all notes
};

export const NotesSection: React.FC<NotesSectionProps> = ({
  onCreateFromNote,
  category,
  id_category,
  onlyWithoutCategory = false,
}) => {
  // State for swipe interaction per note
  const [swipeStates, setSwipeStates] = useState<Record<string, {
    touchStart: number;
    transform: number;
    direction: 'left' | 'right' | null;
  }>>({});

  const isMobile = useIsMobile();
  const [showAddNoteForm, setShowAddNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Determine the category parameter to use for filtering, prioritizing id_category
  // Ensure it's undefined if neither is provided and not onlyWithoutCategory
  const categoryParam = id_category ?? category;

  // Generate the query key based on current filter props
  const notesQueryKey = useMemo(
    () => getNotesQueryKey(categoryParam, onlyWithoutCategory),
    [categoryParam, onlyWithoutCategory]
  );

  // Fetch notes using React Query
  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: notesQueryKey,
    queryFn: async () => {
      // Construct query parameters based on the state
      const params = new URLSearchParams();
      if (categoryParam !== undefined) {
        // Determine the correct parameter name based on which prop was provided
        const paramName = id_category !== undefined ? 'id_category' : 'category';
        params.set(paramName, categoryParam.toString());
        return apiRequest(`/api/notes?${params.toString()}`);
      } else if (onlyWithoutCategory) {
        // Assuming getNotes(true) maps to a specific API query or handles filtering
        return getNotes(true); // Or apiRequest('/api/notes?withoutCategory=true');
      }
      // Fetch all notes if no specific category or filter is applied
      return getNotes(); // Or apiRequest('/api/notes');
    },
    // staleTime: 0, // Keep if immediate freshness is required, otherwise consider a small value (e.g., 60000 for 1 min)
    enabled: !showAddNoteForm, // Optional: Disable query while add form is open if desired
  });

  // Memoize the filtered notes to avoid re-filtering on every render
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => note.content?.trim()); // simplified check for non-empty content
  }, [notes]);

  // --- Mutations ---

  // Common success handler for mutations affecting the notes list
  const onMutationSuccess = useCallback((successMessage: string) => {
    // Invalidate the specific query key currently being used
    queryClient.invalidateQueries({ queryKey: notesQueryKey });
    // Optionally invalidate the general key if needed elsewhere, but specific is often enough
    // queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
    toast({
      title: "Sukces",
      description: successMessage,
      duration: 3000,
    });
  }, [queryClient, notesQueryKey, toast]); // Include notesQueryKey dependency

  // Common error handler
  const onMutationError = useCallback((errorMessage: string, error: unknown) => {
    console.error(errorMessage, error);
    toast({
      title: "Błąd",
      description: errorMessage,
      variant: "destructive",
      duration: 3000,
    });
  }, [toast]);

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      onMutationSuccess("Notatka została usunięta");
      // Clean up swipe state for the deleted note
      setSwipeStates(prev => {
          const newState = {...prev};
          // It's necessary to know the id *before* calling mutate,
          // but onSuccess doesn't receive it directly from mutationFn args.
          // We rely on handleDeleteNote passing the id.
          // A more robust way might involve context or passing id back from API if needed.
          // For now, assume we don't need to cleanup state here immediately,
          // as the item will disappear from the list anyway.
          // delete newState[id]; // Example if id was available
          return newState;
      });
    },
    onError: (error) => onMutationError("Nie udało się usunąć notatki", error),
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      // Ensure category is included if it exists on the note being edited
      updateNote(id, { content, category: editingNote?.category }),
    onSuccess: () => {
      onMutationSuccess("Notatka została zaktualizowana");
      setEditingNote(null); // Close editor on success
    },
    onError: (error) => onMutationError("Nie udało się zaktualizować notatki", error),
  });

  // --- Event Handlers ---

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note);
    setEditedContent(note.content);
    // Reset swipe state for the note being edited
    setSwipeStates(prev => ({
      ...prev,
      [note.id]: { touchStart: 0, transform: 0, direction: null }
    }));
  }, []); // No external dependencies needed

  const handleDeleteNote = useCallback((id: string) => {
    // Optimistically reset swipe state before mutation if desired
     setSwipeStates(prev => ({
      ...prev,
      [id]: { touchStart: 0, transform: 0, direction: null }
    }));
    deleteNoteMutation.mutate(id);
  }, [deleteNoteMutation]);

  const handleUpdateNote = useCallback(() => {
    if (!editingNote || !editedContent.trim()) return; // Prevent saving empty notes
    updateNoteMutation.mutate({ id: editingNote.id, content: editedContent });
  }, [editingNote, editedContent, updateNoteMutation]); // Added editedContent dependency

  const handleCancelEdit = useCallback(() => {
    setEditingNote(null);
    setEditedContent(""); // Clear edited content
  }, []); // No external dependencies needed


  const handleCreateTask = useCallback((content: string, noteCategory?: string | number | null, noteId?: string) => {
    // Determine the category for the new task
    const taskCategorySource = noteCategory ?? categoryParam ?? "I. Ustalenia Ogólne";
    const categoryToUse = typeof taskCategorySource === 'number'
      ? taskCategorySource.toString()
      : taskCategorySource;

    onCreateFromNote(content, categoryToUse); // Pass string category

    // Delete the original note after creating the task
    if (noteId) {
      handleDeleteNote(noteId); // Use the existing delete handler
    }
  }, [onCreateFromNote, categoryParam, handleDeleteNote]); // Added handleDeleteNote dependency

  // --- Touch Handlers ---
  // Wrapped in useCallback as they depend on state/props and are used in the render loop

  const handleTouchStart = useCallback((e: React.TouchEvent, noteId: string) => {
    // Prevent swipe actions if a note is being edited
    if (editingNote) return;
    // Reset state for other notes to prevent multiple swipes visually
    setSwipeStates(prev => ({
        // Reset others if needed: Object.keys(prev).reduce((acc, key) => ({...acc, [key]: {...prev[key], transform: 0}}), {}),
        [noteId]: {
            touchStart: e.touches[0].clientX,
            transform: 0,
            direction: null,
        }
    }));
  }, [editingNote]); // Added editingNote dependency

  const handleTouchMove = useCallback((e: React.TouchEvent, noteId: string) => {
    if (!isMobile || editingNote) return; // Prevent swipe if editing
    const currentSwipeState = swipeStates[noteId];
    if (!currentSwipeState) return; // No touch start recorded

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const deltaX = currentX - currentSwipeState.touchStart;

    // Determine direction only once threshold is passed slightly
    let direction = currentSwipeState.direction;
     if (Math.abs(deltaX) > 10 && !direction) { // Small threshold to determine initial direction
        direction = deltaX > 0 ? 'right' : 'left';
     }

    // Limit swipe distance (optional, for visual appeal)
    const limitedDeltaX = Math.max(-100, Math.min(100, deltaX)); // Example limit

    setSwipeStates(prev => ({
      ...prev,
      [noteId]: {
        ...prev[noteId],
        transform: limitedDeltaX, // Use limited delta for visual transform
        direction: direction // Update direction
      }
    }));
  }, [isMobile, swipeStates, editingNote]); // Added editingNote dependency

  const handleTouchEnd = useCallback((note: Note) => {
    if (!isMobile || editingNote) return; // Prevent swipe if editing
    const currentSwipeState = swipeStates[note.id];
    if (!currentSwipeState) return;

    const { transform, direction } = currentSwipeState;
    const threshold = 60; // Action threshold

    let finalTransform = 0; // Default: snap back

    if (Math.abs(transform) > threshold && direction) {
      if (direction === 'right') {
        handleEditNote(note);
        // Keep transform 0 as edit mode takes over
      } else { // direction === 'left'
        handleDeleteNote(note.id);
        // Keep transform 0 as item will be removed
      }
    } else {
        // Snap back if threshold not met
         finalTransform = 0;
    }

     // Update state to reflect snap back or action taken
    setSwipeStates(prev => ({
      ...prev,
      [note.id]: {
        touchStart: 0,
        transform: finalTransform, // Set final transform (usually 0)
        direction: null
      }
    }));
  }, [isMobile, swipeStates, handleEditNote, handleDeleteNote, editingNote]); // Added editingNote dependency

  // --- Render ---

  const getTitle = () => {
      if (categoryParam !== undefined) return `Notatki w kategorii: ${categoryParam}`;
      if (onlyWithoutCategory) return "Notatki bez kategorii";
      return "Wszystkie Notatki";
  }

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-medium">
          {getTitle()}
        </h2>
        <Button
          variant="ghost"
          onClick={() => setShowAddNoteForm(true)}
          className="flex items-center text-primary hover:text-primary-600 hover:bg-primary-50 disabled:opacity-50"
          disabled={showAddNoteForm} // Disable button while form is open
        >
          <Plus className="w-4 h-4 mr-1" />
          Dodaj notatkę
        </Button>
      </div>

      {showAddNoteForm && (
        <div className="p-4 border-b">
          <AddNote
             // Pass relevant props to AddNote
            id_category={typeof id_category === 'number' || typeof id_category === 'string' ? id_category : undefined}
            category={typeof category === 'number' || typeof category === 'string' ? category : undefined}
            onlyWithoutCategory={onlyWithoutCategory}
            // Pass callback to close form on success/cancel if AddNote handles it
            onNoteAdded={() => {
                setShowAddNoteForm(false);
                // Query will refetch automatically due to invalidation if AddNote uses mutation
            }}
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
             Brak notatek {categoryParam ? `w kategorii ${categoryParam}` : onlyWithoutCategory ? 'bez kategorii' : ''}.
          </div>
        ) : (
          <ul className="space-y-2 list-none p-0 m-0"> {/* Reset list styles */}
            {filteredNotes.map((note) => (
              <li
                key={note.id}
                className="relative overflow-hidden bg-gray-50 shadow rounded-md group list-none" // Added bg-gray-50 to base item
              >
                {/* Background swipe actions (only visible during swipe) */}
                {isMobile && (
                    <div className="absolute inset-0 flex z-0">
                        <div className={cn(
                            'w-1/2 flex items-center justify-end pr-4 transition-colors duration-200 ease-in-out',
                            // Show solid color only when swiping actively in that direction
                            swipeStates[note.id]?.direction === 'right' ? 'bg-blue-500' : 'bg-blue-500/30'
                        )}>
                            <Edit className="h-5 w-5 text-white" />
                        </div>
                        <div className={cn(
                            'w-1/2 flex items-center justify-start pl-4 transition-colors duration-200 ease-in-out',
                            swipeStates[note.id]?.direction === 'left' ? 'bg-red-500' : 'bg-red-500/30'
                        )}>
                            <X className="h-5 w-5 text-white" />
                        </div>
                    </div>
                )}
                {/* Foreground Note Content */}
                <div
                  className="relative flex justify-between items-start p-3 bg-white rounded-md transition-transform duration-200 ease-in-out z-10" // Note content has white background
                  style={{ transform: `translateX(${swipeStates[note.id]?.transform || 0}px)` }}
                  // Add touch handlers only on mobile
                  {...(isMobile ? {
                    onTouchStart: (e) => handleTouchStart(e, note.id),
                    onTouchMove: (e) => handleTouchMove(e, note.id),
                    onTouchEnd: () => handleTouchEnd(note),
                  } : {})}
                >
                  {editingNote?.id === note.id ? (
                    // Edit Mode
                    <div className="flex-1 space-y-2">
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="w-full text-sm" // Consistent text size
                        rows={3} // Example: Set initial rows
                        autoFocus // Focus on textarea when edit starts
                      />
                      <div className="flex space-x-2 justify-end">
                        <Button size="sm" onClick={handleUpdateNote} disabled={updateNoteMutation.isPending || !editedContent.trim()}>
                          {updateNoteMutation.isPending ? "Zapisywanie..." : "Zapisz"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex-1 break-words mr-2 text-sm pt-1"> {/* Added pt-1 for alignment */}
                        {note.content}
                      </div>
                      {/* Action Buttons (visible on hover/focus on desktop) */}
                      <div className={cn(
                          "flex items-center space-x-2 flex-shrink-0",
                          isMobile ? "hidden" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" // Desktop hover/focus reveal
                      )}>
                        <Button
                           variant="ghost" size="icon"
                          onClick={() => handleEditNote(note)}
                          className="text-gray-400 hover:text-blue-500 h-7 w-7" // Smaller buttons
                          title="Edytuj notatkę"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                           variant="ghost" size="icon"
                           onClick={() => handleCreateTask(note.content, note.category || undefined, note.id)}
                           className="text-gray-400 hover:text-primary h-7 w-7" // Smaller buttons
                           title="Przekształć na zadanie"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                           variant="ghost" size="icon"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-500 h-7 w-7" // Smaller buttons
                          title="Usuń notatkę"
                        >
                          <X className="h-4 w-4" />
                        </Button>
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