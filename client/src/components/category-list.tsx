import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Task } from '@shared/schema';
import { Progress } from '@/components/ui/progress';

interface Category {
  id: number;
  name: string;
}

interface CategoryListProps {
  categories: Array<Category>;
  tasks: Task[];
  isLoading: boolean;
  onManageCategories: () => void;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  tasks,
  isLoading,
  onManageCategories
}) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log('Kategorie otrzymane w CategoryList (useEffect):', categories);
    console.log('Zadania otrzymane w CategoryList:', tasks);
  }, [categories, tasks]);
  
  // Filtrowanie kategorii, aby upewnić się, że mamy tylko obiekty Category
  const validCategories = React.useMemo(() => {
    if (!categories || !Array.isArray(categories)) {
      console.warn('Kategorie nie są tablicą:', categories);
      return [];
    }
    
    const processed = categories
      .filter(category => category !== null && typeof category === 'object' && category.name !== undefined)
      .map(category => {
        // Upewniamy się, że id jest liczbą
        let id: number;
        
        if (typeof category.id === 'number') {
          id = category.id;
        } else {
          // Próbujemy przekonwertować string na liczbę
          const parsedId = parseInt(String(category.id), 10);
          // Jeśli konwersja się nie powiedzie, generujemy losowe id
          id = isNaN(parsedId) ? Math.floor(Math.random() * 10000) : parsedId;
        }
        
        return {
          id,
          name: category.name
        };
      });
    
    console.log('Przetworzone kategorie:', processed);
    return processed;
  }, [categories]);

  // Obliczanie statystyk dla każdej kategorii
  const getCategoryStats = (categoryName: string) => {
    const categoryTasks = tasks.filter(task => task.category === categoryName);
    const totalTasks = categoryTasks.length;
    const completedTasks = categoryTasks.filter(task => task.completed).length;
    const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    return {
      totalTasks,
      completedTasks,
      completionPercentage
    };
  };

  // Wyświetlanie komunikatu o ładowaniu
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Ładowanie kategorii...</p>
      </div>
    );
  }

  // Wyświetlanie komunikatu, gdy nie ma kategorii
  if (validCategories.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Brak kategorii</h3>
        <p className="mt-1 text-sm text-gray-500">Zacznij od dodania nowej kategorii.</p>
        <div className="mt-6">
          <Button onClick={onManageCategories}>
            Zarządzaj kategoriami
          </Button>
        </div>
      </div>
    );
  }

  // Wyświetl listę kategorii
  return (
    <div className="space-y-4">
      {validCategories.map((category) => {
        const { totalTasks, completedTasks, completionPercentage } = getCategoryStats(category.name);
        
        return (
          <div 
            key={category.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-primary hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate(`/category/${category.id}`)}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
              <div className="flex items-center">
                <button
                  className="text-red-500 hover:text-red-700 p-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Tutaj możesz dodać funkcję do usuwania kategorii
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 text-gray-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </div>
            </div>
            
            <div className="mt-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{completedTasks} z {totalTasks} zadań ukończonych</span>
                <span>{Math.round(completionPercentage)}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryList;
