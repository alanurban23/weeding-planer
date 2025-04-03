import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash, Loader2, Edit, Check, X } from 'lucide-react'; // Keep Edit, Check, X for inline edit
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SwipeableItem from '@/components/ui/swipeable-item'; // Import custom swipe component
import { updateCategory } from '@/lib/api'; // Keep updateCategory for inline edit

// Interfaces remain the same
interface Category {
  id: string | number;
  name: string;
  parent_id?: string | number | null;
}

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryAdded?: () => void;
}

const categoriesQueryKey = ['/api/categories'];
const tasksQueryKey = ['/api/tasks'];

const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  onCategoryAdded,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);
  const [categoryToDeleteId, setCategoryToDeleteId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null); // Keep editing state
  const [editedName, setEditedName] = useState(''); // Keep editing state

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: categoriesQueryKey,
    queryFn: () => apiRequest(categoriesQueryKey[0]),
    enabled: isOpen,
  });

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(cat => {
      map.set(cat.id.toString(), cat.name);
    });
    return map;
  }, [categories]);

  const addCategoryMutation = useMutation({
    mutationFn: (data: { name: string; parent_id?: string | number | null }) =>
      apiRequest('/api/categories', 'POST', data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
        queryClient.invalidateQueries({ queryKey: tasksQueryKey });
        setNewCategoryName('');
        setSelectedParentId(undefined);
        toast({
          title: "Kategoria dodana",
          description: `Nowa kategoria została pomyślnie dodana.`,
        });
        onCategoryAdded?.();
      },
      onError: (error: unknown) => {
        console.error("Błąd dodawania kategorii:", error);
        const message = error instanceof Error ? error.message : "Nieznany błąd";
        toast({
          title: "Błąd dodawania",
          description: `Nie udało się dodać kategorii: ${message}`,
          variant: "destructive",
        });
      },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/categories/${id}`, 'DELETE'),
    onSuccess: (_, deletedId) => {
        queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
        queryClient.invalidateQueries({ queryKey: tasksQueryKey });
        toast({
          title: "Kategoria usunięta",
          description: "Kategoria została pomyślnie usunięta."
        });
        setCategoryToDeleteId(null);
      },
      onError: (error: unknown, deletedId) => {
        console.error(`Błąd usuwania kategorii (ID: ${deletedId}):`, error);
        const message = error instanceof Error ? error.message : "Nieznany błąd";
        toast({
          title: "Błąd usuwania",
          description: `Nie udało się usunąć kategorii: ${message}`,
          variant: "destructive",
        });
        setCategoryToDeleteId(null);
      },
  });

  // Keep update category mutation for inline edit
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      setEditingCategoryId(null);
      setEditedName('');
      toast({
        title: "Kategoria zaktualizowana",
        description: "Nazwa kategorii została pomyślnie zmieniona.",
      });
    },
    onError: (error: unknown, variables) => {
      console.error(`Błąd aktualizacji kategorii (ID: ${variables.id}):`, error);
      const message = error instanceof Error ? error.message : "Nieznany błąd";
      toast({
        title: "Błąd aktualizacji",
        description: `Nie udało się zaktualizować kategorii: ${message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      toast({ title: "Błąd", description: "Nazwa kategorii nie może być pusta", variant: "destructive" });
      return;
    }
    const categoryExists = categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase());
    if (categoryExists) {
      toast({ title: "Błąd", description: "Kategoria o tej nazwie już istnieje", variant: "destructive" });
      return;
    }
    const categoryData: { name: string; parent_id?: string | number | null } = {
      name: trimmedName,
      parent_id: (selectedParentId && selectedParentId !== "none") ? selectedParentId : null,
    };
    addCategoryMutation.mutate(categoryData);
  };

  const handleDeleteCategory = (id: string | number) => {
    setCategoryToDeleteId(id.toString());
  };

  const confirmDeleteCategory = () => {
    if (categoryToDeleteId) {
      deleteCategoryMutation.mutate(categoryToDeleteId);
    }
  };

  const cancelDeleteCategory = () => {
    setCategoryToDeleteId(null);
  };

  const handleCloseDialog = () => {
    if (!addCategoryMutation.isPending && !deleteCategoryMutation.isPending && !updateCategoryMutation.isPending) { // Keep update mutation check
      onClose();
    }
  }

  // Keep edit handlers
  const handleEditClick = (category: Category) => {
    setEditingCategoryId(category.id.toString());
    setEditedName(category.name);
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditedName('');
  };

  const handleSaveEdit = (categoryId: string) => {
    if (!editedName.trim()) {
      toast({ title: "Błąd", description: "Nazwa kategorii nie może być pusta", variant: "destructive" });
      return;
    }
    updateCategoryMutation.mutate({ id: categoryId, name: editedName.trim() });
  };

  const isMutating = addCategoryMutation.isPending || deleteCategoryMutation.isPending || updateCategoryMutation.isPending; // Keep update mutation check

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zarządzanie kategoriami</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCategory} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="new-category" className="text-sm font-medium">
                Nowa kategoria
              </Label>
              <Input
                id="new-category"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nazwa nowej kategorii"
                className="mt-1"
                autoFocus
                disabled={isMutating}
              />
            </div>
            <div>
              <Label htmlFor="parent-category" className="text-sm font-medium">
                Kategoria nadrzędna (opcjonalnie)
              </Label>
              <Select
                value={selectedParentId ?? "none"}
                onValueChange={(value) => setSelectedParentId(value === "none" ? undefined : value)}
                disabled={isMutating || isLoadingCategories}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Wybierz kategorię nadrzędną..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak (kategoria główna)</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id.toString()} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isMutating || !newCategoryName.trim()}>
                {addCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {addCategoryMutation.isPending ? 'Dodawanie...' : 'Dodaj kategorię'}
              </Button>
            </div>
          </form>

          <div className="pt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Istniejące kategorie</h3>
            {isLoadingCategories ? (
               <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Ładowanie...</span>
               </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Brak zdefiniowanych kategorii.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2"> {/* Use simple div for list container */}
                {categories.map((category) => {
                  const categoryIdStr = category.id.toString();
                  const isEditing = editingCategoryId === categoryIdStr;

                  // Define right actions for swipe
                  const rightActions = (
                    <div className="flex h-full">
                         {/* Edit Action Button - Icon Only */}
                         <Button
                            variant="default"
                            size="icon"
                            className="bg-blue-500 text-white rounded-none h-full w-16 flex items-center justify-center hover:bg-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0" // w-16, ensure centering
                            onClick={() => handleEditClick(category)}
                            aria-label={`Edytuj kategorię ${category.name}`}
                            title="Edytuj"
                         >
                            <Edit className="h-5 w-5" />
                         </Button>
                         {/* Delete Action Button - Icon Only */}
                         <Button
                            variant="destructive"
                            size="icon"
                            className="text-white rounded-none h-full w-16 flex items-center justify-center hover:bg-red-600 focus-visible:ring-0 focus-visible:ring-offset-0" // w-16, ensure centering
                            onClick={() => handleDeleteCategory(category.id)}
                            aria-label={`Usuń kategorię ${category.name}`}
                            title="Usuń"
                         >
                            <Trash className="h-5 w-5" />
                         </Button>
                    </div>
                  );

                  return (
                    <SwipeableItem // Wrap with custom component
                      key={categoryIdStr}
                      rightActions={rightActions}
                      actionWidth={128} // Width for two w-16 (64px) buttons remains the same
                      threshold={0.3}
                      className="rounded overflow-hidden" // Apply rounding/overflow to wrapper
                      blockSwipe={isEditing || isMutating} // Block swipe when editing or mutating
                    >
                      {/* Original Item Content */}
                      <div
                        className={`flex items-center justify-between p-2 w-full bg-background ${isEditing ? 'bg-muted/60' : ''}`} // Use theme background, remove hover
                      >
                        {isEditing ? (
                          // Keep editing UI
                          <div className="flex-grow flex items-center space-x-2 mr-2">
                            <Input
                              type="text"
                              value={editedName}
                              onChange={(e) => setEditedName(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(categoryIdStr);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:bg-green-100 h-7 w-7"
                              onClick={() => handleSaveEdit(categoryIdStr)}
                              disabled={updateCategoryMutation.isPending}
                            >
                              {updateCategoryMutation.isPending && updateCategoryMutation.variables?.id === categoryIdStr
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-gray-500 hover:bg-gray-100 h-7 w-7"
                              onClick={handleCancelEdit}
                              disabled={updateCategoryMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          // Keep display UI
                          <>
                            <div className="flex flex-col text-sm flex-grow mr-2 truncate">
                              <span>{category.name}</span>
                              {category.parent_id && (
                                <span className="text-xs text-muted-foreground truncate">
                                  Nadrzędna: {categoryMap.get(category.parent_id.toString()) || 'Nieznana'}
                                </span>
                              )}
                            </div>
                            {/* Keep desktop buttons */}
                            <div className="hidden sm:flex items-center space-x-1 flex-shrink-0">
                               <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-blue-600 hover:bg-blue-100 h-8 w-8"
                                  onClick={() => handleEditClick(category)}
                                  disabled={isMutating}
                                  title={`Edytuj kategorię ${category.name}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:bg-destructive/10 h-8 w-8"
                                  onClick={() => handleDeleteCategory(category.id)}
                                  disabled={isMutating}
                                  title={`Usuń kategorię ${category.name}`}
                                >
                                  {deleteCategoryMutation.isPending && deleteCategoryMutation.variables === categoryIdStr
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <Trash className="h-4 w-4" />
                                  }
                                </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </SwipeableItem>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={handleCloseDialog} disabled={isMutating}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!categoryToDeleteId} onOpenChange={(open) => !open && cancelDeleteCategory()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź usunięcie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć kategorię "{categoryMap.get(categoryToDeleteId ?? '') ?? 'Wybrana'}"?
              Zadania i notatki przypisane do tej kategorii stracą to przypisanie. Tej akcji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteCategory}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              disabled={deleteCategoryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
               {deleteCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CategoryManager;
