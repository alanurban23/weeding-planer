import React from 'react';
import { useLocation } from 'wouter';
import { sortCategoriesByRomanNumeral } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Task } from '@shared/schema';
import { Progress } from '@/components/ui/progress';

interface CategoryListProps {
  categories: string[];
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
  const [, setLocation] = useLocation();

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

  // Jeśli ładowanie, pokaż szkielet ładowania
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  // Jeśli brak kategorii, pokaż pusty stan
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Brak kategorii</h3>
        <p className="mt-1 text-sm text-gray-500">Zacznij dodawać kategorie, aby uporządkować swoje zadania.</p>
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
      {categories
        .sort(sortCategoriesByRomanNumeral)
        .map((category) => {
          const { totalTasks, completedTasks, completionPercentage } = getCategoryStats(category);
          
          return (
            <div 
              key={category}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:border-primary hover:shadow-md transition-all cursor-pointer"
              onClick={() => setLocation(`/kategoria/${encodeURIComponent(category)}`)}
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-gray-900">{category}</h2>
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
              
              <div className="mt-2">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Postęp: {completedTasks} z {totalTasks} zadań ukończonych</span>
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
