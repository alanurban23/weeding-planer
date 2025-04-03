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
import { Trash, Loader2 } from 'lucide-react'; // Removed Edit, Check, X
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
// Removed swipe list imports

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
  // Removed editing state

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

  // Removed update category mutation and edit handlers

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
    if (!addCategoryMutation.isPending && !deleteCategoryMutation.isPending) { // Removed update mutation check
      onClose();
    }
  }

  const isMutating = addCategoryMutation.isPending || deleteCategoryMutation.isPending;

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
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2"> {/* Reverted to simple div */}
                {categories.map((category) => {
                  const categoryIdStr = category.id.toString();
                  // Removed isEditing check

                  return (
                    <div // Reverted to simple div
                      key={categoryIdStr}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                    >
                      <div className="flex flex-col text-sm flex-grow mr-2 truncate">
                        <span>{category.name}</span>
                        {category.parent_id && (
                          <span className="text-xs text-muted-foreground truncate">
                            Nadrzędna: {categoryMap.get(category.parent_id.toString()) || 'Nieznana'}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 h-8 w-8 flex-shrink-0" // Added flex-shrink-0
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
