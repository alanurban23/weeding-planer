import React, { useState, useMemo, useCallback } from 'react'; // Import useMemo, useCallback
import { useQuery, useMutation } from '@tanstack/react-query'; // Import useMutation
import { Task } from '@shared/schema';
import TaskItem from './task-item';
import TaskDetailView from './task-detail-view';
import { Plus, Folder, Edit, Trash2, Check, X } from './icons'; // Remove ChevronRight from here
import { ChevronRight } from 'lucide-react'; // Import ChevronRight from lucide-react
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input
import { Progress } from '@/components/ui/progress'; // Import Progress
import SwipeableItem from '@/components/ui/swipeable-item'; // Import SwipeableItem
import { apiRequest, queryClient } from '@/lib/queryClient'; // Import queryClient
import { useToast } from '@/components/ui/use-toast'; // Import useToast
import { updateCategory, deleteCategory } from '@/lib/api'; // Import category API functions

// Ensure Category interface matches the one used elsewhere
interface Category {
  id: number; // Use number consistently
  name: string;
  parent_id: number | null;
}

interface CategoryStats {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
}


interface TaskListProps {
  groupedTasks: Record<string, Task[]>;
  isLoading: boolean;
  subcategories?: Category[];
  allTasks: Task[]; // Add prop for all tasks
  onToggleTaskCompletion: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
  onCreateFromNote?: (note: string, category: string | number) => void;
  onSubcategoryUpdate: () => void; // Callback after subcategory update/delete
}

const TaskList: React.FC<TaskListProps> = ({
  groupedTasks,
  isLoading,
  subcategories = [],
  allTasks, // Destructure new prop
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onCreateFromNote,
  onSubcategoryUpdate, // Destructure new prop
}) => {
  const navigate = useNavigate();
  const { toast } = useToast(); // Initialize toast
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<number | null>(null); // State for editing subcategory
  const [editedSubcategoryName, setEditedSubcategoryName] = useState(''); // State for edited name

  // --- Subcategory Stats Calculation ---
  const subcategoryStatsMap = useMemo(() => {
    const statsMap = new Map<number, CategoryStats>();
    if (!Array.isArray(allTasks) || !Array.isArray(subcategories)) {
      return statsMap;
    }

    subcategories.forEach((category) => {
      if (!category || typeof category.id !== 'number') return;

      const categoryTasks = allTasks.filter(task => {
        const taskIdCategoryNum = typeof task.id_category === 'string'
          ? parseInt(task.id_category, 10)
          : task.id_category;
        return taskIdCategoryNum === category.id;
      });

      const totalTasks = categoryTasks.length;
      const completedTasks = categoryTasks.filter((task) => !!task.completed).length;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      statsMap.set(category.id, {
        totalTasks,
        completedTasks,
        completionPercentage,
      });
    });
    return statsMap;
  }, [subcategories, allTasks]);

  // --- Subcategory Edit/Delete Handlers ---
  const handleEditSubcategoryClick = (e: React.MouseEvent, category: Category) => {
    e.stopPropagation(); // Prevent navigation
    setEditingSubcategoryId(category.id);
    setEditedSubcategoryName(category.name);
  };

  const handleCancelSubcategoryEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSubcategoryId(null);
    setEditedSubcategoryName('');
  };

  const handleSaveSubcategoryEdit = async (e: React.MouseEvent, categoryId: number) => {
    e.stopPropagation();
    if (!editedSubcategoryName.trim()) {
      toast({ title: "Błąd", description: "Nazwa podkategorii nie może być pusta.", variant: "destructive" });
      return;
    }
    try {
      await updateCategory(String(categoryId), editedSubcategoryName.trim());
      toast({ title: "Sukces", description: "Nazwa podkategorii została zaktualizowana." });
      setEditingSubcategoryId(null);
      setEditedSubcategoryName('');
      onSubcategoryUpdate(); // Notify parent to refetch
    } catch (error) {
      console.error("Failed to update subcategory:", error);
      toast({ title: "Błąd", description: `Nie udało się zaktualizować podkategorii: ${error instanceof Error ? error.message : 'Nieznany błąd'}`, variant: "destructive" });
    }
  };

  const handleDeleteSubcategoryClick = async (e: React.MouseEvent | null, categoryId: number, categoryName: string) => {
    e?.stopPropagation();
    if (!confirm(`Czy na pewno chcesz usunąć podkategorię "${categoryName}"? Może to wpłynąć na powiązane notatki/zadania.`)) {
        return;
    }
    try {
        await deleteCategory(String(categoryId));
        toast({ title: "Sukces", description: `Podkategoria "${categoryName}" została usunięta.` });
        onSubcategoryUpdate(); // Notify parent to refetch
    } catch (error) {
        console.error("Failed to delete subcategory:", error);
        toast({ title: "Błąd", description: `Nie udało się usunąć podkategorii: ${error instanceof Error ? error.message : 'Nieznany błąd'}`, variant: "destructive" });
    }
  };


  // Fetch all categories for the detail view (ensure type consistency)
  const { data: categoriesData = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
        const data = await apiRequest('/api/categories');
        // Ensure IDs are numbers
        return data.map((cat: any) => ({ ...cat, id: typeof cat.id === 'string' ? parseInt(cat.id, 10) : cat.id }));
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });


  const handleShowDetails = (task: Task) => {
    setSelectedTaskForDetail(task);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTaskForDetail(null);
  };

  // If loading, show skeleton loader
  if (isLoading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[1, 2].map((j) => (
                <div key={j} className="bg-white shadow overflow-hidden rounded-md p-4">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // If no tasks and no subcategories, show empty state
  if (Object.keys(groupedTasks).length === 0 && subcategories.length === 0) {
    return (
      <div className="bg-white shadow overflow-hidden rounded-md p-6 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Brak zadań</h3>
        <p className="text-gray-500 mb-4">Nie znaleziono żadnych zadań ani podkategorii w tej kategorii.</p>
        <button
          onClick={onAddTask}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Dodaj zadanie
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Display subcategories first */}
      {subcategories.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Podkategorie</h3>
          {/* Changed layout to single column for swipe */}
          <div className="space-y-4 mb-6">
            {subcategories.map((category) => {
              // Ensure category and category.id are valid before rendering
              if (!category || typeof category.id !== 'number') return null;

              const isEditing = editingSubcategoryId === category.id;
              const stats = subcategoryStatsMap.get(category.id) ?? { totalTasks: 0, completedTasks: 0, completionPercentage: 0 };

              // Define right actions for swipe
              const rightActions = (
                  <div className="flex h-full">
                       {/* Edit Action Button */}
                       <Button
                          variant="default"
                          size="icon"
                          className="bg-blue-500 text-white rounded-none h-full w-16 flex items-center justify-center hover:bg-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                          onClick={(e) => handleEditSubcategoryClick(e, category)}
                          aria-label={`Edytuj podkategorię ${category.name}`}
                          title="Edytuj"
                       >
                          <Edit className="h-5 w-5" />
                       </Button>
                       {/* Delete Action Button */}
                       <Button
                          variant="destructive"
                          size="icon"
                          className="text-white rounded-none h-full w-16 flex items-center justify-center hover:bg-red-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                          onClick={(e) => handleDeleteSubcategoryClick(e, category.id, category.name)}
                          aria-label={`Usuń podkategorię ${category.name}`}
                          title="Usuń"
                       >
                          <Trash2 className="h-5 w-5" />
                       </Button>
                  </div>
              );

              return (
                <SwipeableItem
                   key={`subcategory-${category.id}`}
                   rightActions={rightActions}
                   actionWidth={128}
                   threshold={0.3}
                   className="rounded-lg overflow-hidden"
                   blockSwipe={isEditing}
                >
                  {/* Original Item Content */}
                  <div
                    className={`bg-white border border-gray-200 p-4 transition-all group w-full ${isEditing ? 'border-primary ring-1 ring-primary' : ''}`}
                    onClick={isEditing ? undefined : () => navigate(`/category/${category.id}`)}
                    role={isEditing ? undefined : "link"}
                    aria-label={isEditing ? `Edytowanie podkategorii ${category.name}` : `Przejdź do podkategorii ${category.name}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      {isEditing ? (
                        <div className="flex-grow mr-2">
                          <Input
                            type="text"
                            value={editedSubcategoryName}
                            onChange={(e) => setEditedSubcategoryName(e.target.value)}
                            className="text-lg font-semibold h-9" // Adjusted size
                            aria-label="Nowa nazwa podkategorii"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveSubcategoryEdit(e as any, category.id);
                              if (e.key === 'Escape') handleCancelSubcategoryEdit();
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center flex-grow min-w-0 mr-2"> {/* Ensure flex container */}
                           <div className="bg-blue-100 rounded-full p-2 mr-3 flex-shrink-0">
                             <Folder className="h-5 w-5 text-blue-600" />
                           </div>
                           <h4 className="font-medium text-blue-800 truncate"> {/* Added truncate */}
                             {category.name}
                           </h4>
                        </div>
                      )}
                       {/* Desktop buttons */}
                      <div className="hidden md:flex items-center space-x-1 flex-shrink-0">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-100 h-8 w-8" onClick={(e) => handleSaveSubcategoryEdit(e, category.id)} title="Zapisz zmiany" aria-label="Zapisz zmiany nazwy podkategorii">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 h-8 w-8" onClick={handleCancelSubcategoryEdit} title="Anuluj edycję" aria-label="Anuluj edycję nazwy podkategorii">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-100 h-8 w-8" onClick={(e) => handleEditSubcategoryClick(e, category)} title={`Edytuj podkategorię ${category.name}`} aria-label={`Edytuj podkategorię ${category.name}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={(e) => handleDeleteSubcategoryClick(e, category.id, category.name)} title={`Usuń podkategorię ${category.name}`} aria-label={`Usuń podkategorię ${category.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" aria-hidden="true" />
                          </>
                        )}
                      </div>
                       {/* Mobile Chevron */}
                       {!isEditing && <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors md:hidden flex-shrink-0" aria-hidden="true" />}
                    </div>
                    {/* Task Count and Progress */}
                    {!isEditing && (
                      <div className="mt-2">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{stats.completedTasks} z {stats.totalTasks} ukończonych</span>
                          <span>{stats.completionPercentage}%</span>
                        </div>
                        <Progress value={stats.completionPercentage} className="h-2" />
                      </div>
                    )}
                  </div>
                </SwipeableItem>
              );
            })}
          </div>
        </div>
      )}

      {/* Display tasks grouped by status */}
      {Object.keys(groupedTasks).length > 0 && (
        <div>
          {Object.entries(groupedTasks).map(([status, tasks]) => (
            <div key={status} className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {status === 'completed' ? 'Zakończone' : status === 'in_progress' ? 'W trakcie' : 'Do zrobienia'}
              </h3>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleCompletion={onToggleTaskCompletion}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onShowDetails={handleShowDetails} // Pass the handler
                    onCreateFromNote={onCreateFromNote}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Render the Task Detail View Modal */}
      <TaskDetailView
        show={showDetailModal}
        onClose={handleCloseDetailModal}
        task={selectedTaskForDetail}
        categories={categoriesData}
      />
    </div>
  );
};

export default TaskList;
