import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus } from 'lucide-react';

interface CategoryInput {
  name: string;
}

const categoriesQueryKey = ['/api/categories'];

const AddCategory: React.FC = () => {
  const [categoryName, setCategoryName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- Check the actual signature of your apiRequest function ---
  // Based on your *original* AddCategory code, it seemed like
  // apiRequest might take (url, method, body) as arguments.
  // Let's revert to that structure unless you confirm the options object is correct.

  const mutation = useMutation({
    mutationFn: (categoryData: CategoryInput) =>
      // REMOVED <any> and potentially reverting to original argument structure
      // Adjust this line based on how your apiRequest is actually defined!
      apiRequest('/api/categories', 'POST', categoryData), // Option 1: If it takes url, method, body
      // apiRequest('/api/categories', { method: 'POST', body: JSON.stringify(categoryData), headers: { 'Content-Type': 'application/json' } }), // Option 2: If it takes options object

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey });
      setCategoryName('');
      setIsExpanded(false);
      toast({
        title: 'Sukces',
        description: 'Kategoria została dodana pomyślnie.',
        duration: 3000,
      });
    },
    onError: (error: unknown) => {
      console.error('Błąd dodawania kategorii:', error);
      const description = error instanceof Error ? error.message : 'Nie udało się dodać kategorii. Spróbuj ponownie.';
      toast({
        title: 'Błąd',
        description: description,
        variant: 'destructive',
        duration: 3000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      toast({
        title: 'Błąd',
        description: 'Nazwa kategorii nie może być pusta',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }
    const categoryData: CategoryInput = { name: trimmedName };
    mutation.mutate(categoryData);
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
        setCategoryName('');
    }
  };

  const handleCancel = () => {
    setCategoryName('');
    setIsExpanded(false);
  };

  // --- Render logic remains the same as the previously optimized version ---
  if (!isExpanded) {
    return (
      <div className="mb-6">
        <Button
          variant="outline"
          className="flex items-center w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={handleToggleExpand}
          aria-expanded={isExpanded}
        >
          <Plus className="h-4 w-4 mr-2" />
          Dodaj kategorię
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border">
      <h3 className="text-lg font-medium mb-3">Dodaj nową kategorię</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="Nazwa kategorii..."
          className="w-full"
          autoFocus
          disabled={mutation.isPending}
        />
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={mutation.isPending}
          >
            Anuluj
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || !categoryName.trim()}
          >
            {mutation.isPending ? 'Dodawanie...' : 'Zapisz kategorię'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddCategory;