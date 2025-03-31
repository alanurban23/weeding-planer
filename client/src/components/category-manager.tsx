import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash } from 'lucide-react';
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

interface Category {
  id: string;
  name: string;
}

interface CategoryManagerProps {
  show: boolean;
  onClose: () => void;
  existingCategories: string[];
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  show,
  onClose,
  existingCategories,
}) => {
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Pobieranie kategorii z API
  const { data: categories = [], isLoading, refetch } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: show, // Pobierz tylko gdy dialog jest otwarty
    staleTime: 0, // Zawsze odświeżaj dane przy otwarciu dialogu
  });

  // Efekt do logowania kategorii po pobraniu
  useEffect(() => {
    if (show) {
      console.log('Pobrane kategorie:', categories);
    }
  }, [categories, show]);

  // Dodawanie nowej kategorii
  const addCategoryMutation = useMutation({
    mutationFn: (name: string) => 
      apiRequest('/api/categories', 'POST', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setNewCategoryName('');
      refetch(); // Odświeżamy listę kategorii
      toast({
        title: "Kategoria dodana",
        description: "Nowa kategoria została pomyślnie dodana."
      });
    },
    onError: (error) => {
      console.error("Błąd dodawania kategorii:", error);
      toast({
        title: "Błąd",
        description: `Nie udało się dodać kategorii: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  // Usuwanie kategorii
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/categories/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      refetch(); // Odświeżamy listę kategorii
      toast({
        title: "Kategoria usunięta",
        description: "Kategoria została pomyślnie usunięta."
      });
    },
    onError: (error) => {
      console.error("Błąd usuwania kategorii:", error);
      toast({
        title: "Błąd",
        description: `Nie udało się usunąć kategorii: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  // Dodawanie nowej kategorii
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast({
        title: "Błąd",
        description: "Nazwa kategorii nie może być pusta",
        variant: "destructive"
      });
      return;
    }
    
    // Sprawdź czy kategoria już istnieje
    const categoryExists = categories.some(
      (cat: Category) => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    ) || existingCategories.some(
      (cat: string) => cat.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    
    if (categoryExists) {
      toast({
        title: "Błąd",
        description: "Kategoria o tej nazwie już istnieje",
        variant: "destructive"
      });
      return;
    }
    
    addCategoryMutation.mutate(newCategoryName.trim());
  };

  // Usuwanie kategorii
  const handleDeleteCategory = (id: string) => {
    setCategoryToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      deleteCategoryMutation.mutate(categoryToDelete);
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <>
      <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zarządzanie kategoriami</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <form onSubmit={handleAddCategory} className="flex items-end gap-2 mb-6">
              <div className="flex-1">
                <Label htmlFor="new-category" className="text-sm font-medium text-gray-700">
                  Nowa kategoria
                </Label>
                <Input
                  id="new-category"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nazwa nowej kategorii"
                />
              </div>
              <Button type="submit" disabled={addCategoryMutation.isPending}>
                Dodaj
              </Button>
            </form>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Istniejące kategorie</h3>
              
              {isLoading ? (
                <p className="text-sm text-gray-500">Ładowanie kategorii...</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-gray-500">Brak zdefiniowanych kategorii</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categories.map((category: Category) => (
                    <div 
                      key={category.id} 
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <span>{category.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id)}
                        disabled={deleteCategoryMutation.isPending}
                      >
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog potwierdzenia usunięcia */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdzenie usunięcia</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć tę kategorię? Ta operacja może wpłynąć na zadania przypisane do tej kategorii.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CategoryManager;
