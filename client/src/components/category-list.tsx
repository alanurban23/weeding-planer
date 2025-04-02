import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Task } from '@shared/schema'; // Assuming Task type is correctly defined
import { Progress } from '@/components/ui/progress';
import { Loader2, FolderX, Trash2, ChevronRight } from 'lucide-react'; // Import icons

// Define Category interface (consider moving to shared if used elsewhere)
interface Category {
  id: number; // Expecting ID to be a number
  name: string;
}

interface CategoryListProps {
  categories: Array<Category | any>; // Allow 'any' temporarily due to potential incoming inconsistencies handled by filtering
  tasks: Task[];
  isLoading: boolean;
  onManageCategories: () => void; // Callback to open category management
}

// Helper type for category statistics
interface CategoryStats {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  tasks,
  isLoading,
  onManageCategories,
}) => {
  const navigate = useNavigate();

  // 1. Memoize and sanitize the categories array
  //    - Filter out invalid entries
  //    - **Crucially, DO NOT generate random IDs.** Filter out items with invalid IDs instead.
  const validCategories = useMemo(() => {
    if (!Array.isArray(categories)) {
      console.warn('CategoryList: Received non-array for categories:', categories);
      return [];
    }
    // Filter for valid Category objects and use a type predicate
    return categories.filter(
      (cat): cat is Category => // Type predicate ensures the output array is Category[]
        cat != null &&
        typeof cat === 'object' &&
        typeof cat.name === 'string' && cat.name.trim() !== '' && // Check for non-empty name
        typeof cat.id === 'number' && // Enforce ID must be a number
        !isNaN(cat.id) // Check if it's a valid number (not NaN)
    );
  }, [categories]); // Dependency: only recalculate if categories prop changes

  // 2. Memoize the calculation of statistics for all categories
  const categoryStatsMap = useMemo(() => {
    const statsMap = new Map<number, CategoryStats>(); // Use category ID as key

    // Add safety check for tasks prop
    if (!Array.isArray(tasks)) {
      console.warn('CategoryList: Received non-array for tasks:', tasks);
      return statsMap; // Return empty map if tasks are invalid
    }

    validCategories.forEach((category) => {
      // Find tasks matching by category NAME (as in original code)
      // Consider if matching by category ID would be more robust if tasks have categoryId
      const categoryTasks = tasks.filter((task) => task.category === category.name);
      const totalTasks = categoryTasks.length;
      const completedTasks = categoryTasks.filter((task) => task.completed).length;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0; // Round percentage here

      statsMap.set(category.id, { // Store stats using the category ID
        totalTasks,
        completedTasks,
        completionPercentage,
      });
    });
    return statsMap;
  }, [validCategories, tasks]); // Dependencies: recalculate if validCategories or tasks change

  // --- Render Logic ---

  // Loading State
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto" />
        <p className="mt-4 text-gray-600">Ładowanie kategorii...</p>
      </div>
    );
  }

  // Empty State (No valid categories found)
  if (validCategories.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <FolderX className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Brak kategorii</h3>
        <p className="mt-1 text-sm text-gray-500">
          Nie znaleziono żadnych kategorii lub istniejące kategorie mają nieprawidłowe dane.
        </p>
        <div className="mt-6">
          {/* Button to trigger adding/managing categories */}
          <Button onClick={onManageCategories}>Zarządzaj kategoriami</Button>
        </div>
      </div>
    );
  }

  // Default State: Display List of Categories
  return (
    <div className="space-y-4">
      {validCategories.map((category) => {
        // Retrieve pre-calculated stats using category ID
        const stats = categoryStatsMap.get(category.id) ?? {
          totalTasks: 0,
          completedTasks: 0,
          completionPercentage: 0,
        }; // Provide default if somehow missing

        return (
          <div
            key={category.id} // Use the validated, stable category ID
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 hover:border-primary hover:shadow-md transition-all cursor-pointer group" // Added group for potential hover effects on children
            onClick={() => navigate(`/category/${category.id}`)} // Navigate using the stable ID
            role="link" // Improve semantics
            aria-label={`Przejdź do kategorii ${category.name}`}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-gray-800 truncate pr-2"> {/* Added truncate */}
                {category.name}
              </h2>
              <div className="flex items-center space-x-1 flex-shrink-0">
                 {/* Placeholder for Delete - consider moving logic to manage categories view */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 h-8 w-8" // Use destructive color
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent navigation
                    console.log('TODO: Implement delete for category ID:', category.id);
                    // Example: deleteCategoryMutation.mutate(category.id);
                  }}
                  title={`Usuń kategorię ${category.name}`} // Accessibility
                  aria-label={`Usuń kategorię ${category.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <ChevronRight
                  className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors"
                  aria-hidden="true" // Decorative icon
                 />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>
                  {stats.completedTasks} z {stats.totalTasks} ukończonych
                </span>
                <span>{stats.completionPercentage}%</span>
              </div>
              <Progress value={stats.completionPercentage} className="h-2" />
            </div>
          </div>
        );
      })}
       {/* Optional: Button to manage categories always visible at the bottom */}
       <div className="pt-4 text-center">
           <Button variant="outline" onClick={onManageCategories}>
               Zarządzaj kategoriami
           </Button>
       </div>
    </div>
  );
};

export default CategoryList;