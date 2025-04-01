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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string | number;
  name: string;
  parent_id?: string | number | null;
}

interface CategoryManagerProps {
  show: boolean;
  onClose: () => void;
  existingCategories?: Array<Category>;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({
  show,
  onClose,
  existingCategories = [],
}) => {
  const { toast } = useToast();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);
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
    mutationFn: (data: { name: string; parent_id?: string | number | null }) => 
      apiRequest('/api/categories', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setNewCategoryName('');
      setSelectedParentId(undefined);
      refetch(); // Odświeżamy listę kategorii
      toast({
        title: "Kategoria dodana",
        description: "Nowa kategoria została pomyślnie dodana."
      });
      // Zamknij modal po dodaniu kategorii
      onClose();
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

  // Obsługa dodawania nowej kategorii
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
      (cat: Category) => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    
    if (categoryExists) {
      toast({
        title: "Błąd",
        description: "Kategoria o tej nazwie już istnieje",
        variant: "destructive"
      });
      return;
    }
    
    const categoryData: { name: string; parent_id?: string | number | null } = { 
      name: newCategoryName.trim() 
    };
    
    if (selectedParentId && selectedParentId !== "none") {
      categoryData.parent_id = selectedParentId;
    } else {
      categoryData.parent_id = null;
    }
    
    addCategoryMutation.mutate(categoryData);
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

  const cancelDeleteCategory = () => {
    setShowDeleteDialog(false);
    setCategoryToDelete(null);
  };

  return (
    <>
      <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zarządzanie kategoriami</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <form onSubmit={handleAddCategory} className="space-y-4 mb-6">
              <div>
                <Label htmlFor="new-category" className="text-sm font-medium text-gray-700">
                  Nowa kategoria
                </Label>
                <Input
                  id="new-category"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nazwa nowej kategorii"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="parent-category" className="text-sm font-medium text-gray-700">
                  Kategoria nadrzędna (opcjonalnie)
                </Label>
                <Select 
                  value={selectedParentId} 
                  onValueChange={(value) => setSelectedParentId(value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Wybierz kategorię nadrzędną" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Brak (kategoria główna)</SelectItem>
                    {categories.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={addCategoryMutation.isPending}>
                  {addCategoryMutation.isPending ? 'Dodawanie...' : 'Dodaj kategorię'}
                </Button>
              </div>
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
                      <div className="flex flex-col">
                        <span>{category.name}</span>
                        {category.parent_id && (
                          <span className="text-xs text-gray-500">
                            Podkategoria: {categories.find(c => c.id.toString() === category.parent_id?.toString())?.name || 'Nieznana'}
                          </span>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteCategory(category.id.toString())}
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
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tę kategorię?</AlertDialogTitle>
            <AlertDialogDescription>
              Usunięcie kategorii nie spowoduje usunięcia zadań ani notatek przypisanych do tej kategorii,
              ale stracą one przypisanie do kategorii.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteCategory}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} className="bg-red-600 hover:bg-red-700">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CategoryManager;
