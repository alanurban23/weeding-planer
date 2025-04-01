import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface CategoryInput {
  name: string;
}

const AddCategory: React.FC = () => {
  const [categoryName, setCategoryName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (categoryData: CategoryInput) => 
      apiRequest('/api/categories', 'POST', categoryData),
    onSuccess: () => {
      // Odświeżenie listy kategorii po dodaniu nowej
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      // Resetowanie formularza
      setCategoryName('');
      setIsExpanded(false);
      
      toast({
        title: 'Sukces',
        description: 'Kategoria została dodana pomyślnie.',
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Błąd dodawania kategorii:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać kategorii. Spróbuj ponownie.',
        variant: 'destructive',
        duration: 3000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast({
        title: 'Błąd',
        description: 'Nazwa kategorii nie może być pusta',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    const categoryData: CategoryInput = { name: categoryName };
    console.log('Dane kategorii do dodania:', categoryData);
    mutation.mutate(categoryData);
  };

  const handleCancel = () => {
    setCategoryName('');
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <Button 
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Dodaj kategorię
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h3 className="text-lg font-medium mb-3">Dodaj nową kategorię</h3>
      <form onSubmit={handleSubmit}>
        <Input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="Nazwa kategorii..."
          className="w-full mb-4"
        />
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline"
            onClick={handleCancel}
          >
            Anuluj
          </Button>
          <Button 
            type="submit" 
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Dodawanie...' : 'Zapisz kategorię'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddCategory;
