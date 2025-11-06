import React, { useState, useMemo } from 'react'; // Corrected import
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import { Task } from '@shared/schema';
import TaskList from '@/components/task-list';
import TaskForm, { EditingTask } from '@/components/task-form';
import MobileNavigation from '@/components/mobile-navigation';
import { NotesSection } from '@/components/notes-section';
import { generateId } from '@/lib/utils';
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
import CategoryManager from '@/components/category-manager';
import CategoryList from '@/components/category-list';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalFab } from '@/components/global-fab';
import BudgetTracker from '@/components/budget-tracker';
import { Link } from 'react-router-dom';
import BudgetWidget from '@/components/budget-widget';

export default function Home() {
  const { toast } = useToast();
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    category: '',
    search: '',
    sort: 'dueDate',
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAddNoteFormHome, setShowAddNoteFormHome] = useState(false); // Added state

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    queryFn: async () => {
      try {
        const data = await apiRequest('/api/tasks');
        return data || [];
      } catch (error) {
        throw error;
      }
    }
  });

  // Define Category interface matching the API response (including parent_id)
  interface Category {
    id: number; // Expecting numeric ID from API now
    name: string;
    parent_id: number | null;
    created_at?: string; // Optional fields if they exist
  }

  // Pobieranie kategorii bezpośrednio z API, using the correct type
  const { data: categoriesData = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories')
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: (task: EditingTask) =>
      apiRequest('/api/tasks', 'POST', task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setShowAddTaskModal(false);
      toast({
        title: "Zadanie dodane",
        description: "Zadanie zostało pomyślnie dodane."
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: `Nie udało się dodać zadania: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EditingTask> }) =>
      apiRequest(`/api/tasks/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setEditingTask(null);
      setShowAddTaskModal(false);
      toast({
        title: "Zadanie zaktualizowane",
        description: "Zadanie zostało pomyślnie zaktualizowane."
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: `Nie udało się zaktualizować zadania: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/tasks/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Zadanie usunięte",
        description: "Zadanie zostało pomyślnie usunięte."
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: `Nie udało się usunąć zadania: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  // Toggle task completion mutation
  const toggleTaskMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/tasks/${id}/toggle`, 'PATCH'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: `Nie udało się zmienić statusu zadania: ${error.message}`,
        variant: "destructive"
      });
    },
  });

  // Process categories fetched from the API, ensuring correct types and structure
  const processedCategories = useMemo<Category[]>(() => {
    if (!categoriesData || !Array.isArray(categoriesData)) {
      return [];
    }
    // Filter out any potentially invalid category data and ensure IDs are numbers
    return categoriesData
      .filter(cat => cat && typeof cat.id === 'number' && !isNaN(cat.id) && typeof cat.name === 'string')
      .map(cat => ({
        ...cat,
        // Ensure parent_id is number or null
        parent_id: typeof cat.parent_id === 'number' ? cat.parent_id : null,
      }));
  }, [categoriesData]);

  // Function to invalidate categories query
  const handleCategoryUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
    // Optionally invalidate tasks if category changes affect them (e.g., if task display shows category name)
    // queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
  };

  // Filtrowanie zadań nadchodzących (w ciągu najbliższych 7 dni) i po terminie
  const upcomingAndOverdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const filteredTasks = tasks.filter(task => {
      if (!task.dueDate || task.completed) return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate <= nextWeek;
    }).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    return filteredTasks;
  }, [tasks]);

  // Grupowanie zadań nadchodzących i po terminie
  const groupedUpcomingTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue: Task[] = [];
    const today_tasks: Task[] = [];
    const upcoming: Task[] = [];
    for (const task of upcomingAndOverdueTasks) {
      if (!task.dueDate) continue;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        overdue.push(task);
      } else if (dueDate.getTime() === today.getTime()) {
        today_tasks.push(task);
      } else {
        upcoming.push(task);
      }
    }
    return { overdue, today: today_tasks, upcoming };
  }, [upcomingAndOverdueTasks]);

  // Open add task modal
  const handleAddTask = () => {
    setEditingTask(null);
    setShowAddTaskModal(true);
  };

  // Open edit task modal
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowAddTaskModal(true);
  };

  // Delete task with confirmation
  const handleDeleteTask = (id: string) => {
    setTaskToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete);
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    }
  };

  // Save task (add or update)
  const handleSaveTask = (task: EditingTask) => {
    if (editingTask) {
      // Zamiast używać updateTaskMutation, która powoduje błąd 404,
      // używamy addTaskMutation, która działa poprawnie
      addTaskMutation.mutate(task);
    } else {
      addTaskMutation.mutate(task);
    }
  };

  // Create task from note
  const handleCreateFromNote = (note: string, category: string | number) => {
    const newTask: EditingTask = {
      id: generateId(),
      title: note,
      category: typeof category === 'number' ? category.toString() : category,
      notes: [],
      completed: false,
      dueDate: null,
    };
    setEditingTask(newTask as unknown as Task);
    setShowAddTaskModal(true);
  };

  // Toggle task completion status
  const handleToggleTaskCompletion = (id: string) => {
    toggleTaskMutation.mutate(id);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Open category manager
  const handleOpenCategoryManager = () => {
    setShowCategoryManager(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          {/* Mobile header layout */}
          <div className="md:hidden">
            <h1 className="text-xl font-bold text-gray-900 mb-4">
              CodeNinja - Planer Weselny
            </h1>
            <Button
              onClick={() => setShowCategoryManager(true)}
              className="w-full mb-2"
            >
              Zarządzaj kategoriami
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/guest-list">Lista gości</Link>
            </Button>
          </div>

          {/* Desktop header layout - unchanged */}
          <div className="hidden md:flex md:justify-between md:items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              CodeNinja - Planer Weselny
            </h1>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline">
                <Link to="/guest-list">Lista gości</Link>
              </Button>
              <Button onClick={() => setShowCategoryManager(true)}>
                Zarządzaj kategoriami
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Apply grid layout for medium screens and up */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item 1: Sekcja notatek (Top-Left) */}
            <NotesSection
              onCreateFromNote={handleCreateFromNote}
              onlyWithoutCategory={true}
              showAddNoteForm={showAddNoteFormHome} // Pass state
              setShowAddNoteForm={setShowAddNoteFormHome} // Pass setter
            />

            {/* Item 2: Zadania nadchodzące i po terminie (Top-Right) */}
            <Card className="border-t-4 border-t-primary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Aktualne zadania
                </CardTitle>
                <CardDescription>
                  Zadania, które wymagają Twojej uwagi w najbliższym czasie
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingAndOverdueTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Brak aktualnych zadań</h3>
                    <p className="mt-1 text-sm text-gray-500">Nie masz żadnych zadań z terminem w ciągu najbliższych 7 dni.</p>
                    <div className="mt-6">
                      <Button onClick={handleAddTask}>
                        Dodaj nowe zadanie
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {groupedUpcomingTasks.overdue.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-red-500 mb-2">Po terminie:</h3>
                        <div className="space-y-2">
                          {groupedUpcomingTasks.overdue.map(task => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => handleToggleTaskCompletion(task.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div onClick={() => handleEditTask(task)} className="cursor-pointer">
                                  <h4 className="font-medium">{task.title}</h4>
                                  <p className="text-xs text-gray-500">{task.category}</p>
                                </div>
                              </div>
                              <div className="text-sm font-medium text-red-500">
                                {task.dueDate && new Date(task.dueDate).toLocaleDateString('pl-PL')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {groupedUpcomingTasks.today.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-blue-500 mb-2">Na dzisiaj:</h3>
                        <div className="space-y-2">
                          {groupedUpcomingTasks.today.map(task => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => handleToggleTaskCompletion(task.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div onClick={() => handleEditTask(task)} className="cursor-pointer">
                                  <h4 className="font-medium">{task.title}</h4>
                                  <p className="text-xs text-gray-500">{task.category}</p>
                                </div>
                              </div>
                              <div className="text-sm font-medium text-blue-500">
                                Dzisiaj
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {groupedUpcomingTasks.upcoming.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-amber-500 mb-2">Nadchodzące:</h3>
                        <div className="space-y-2">
                          {groupedUpcomingTasks.upcoming.map(task => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => handleToggleTaskCompletion(task.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div onClick={() => handleEditTask(task)} className="cursor-pointer">
                                  <h4 className="font-medium">{task.title}</h4>
                                  <p className="text-xs text-gray-500">{task.category}</p>
                                </div>
                              </div>
                              <div className="text-sm font-medium text-amber-500">
                                {task.dueDate && new Date(task.dueDate).toLocaleDateString('pl-PL')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Item 3: Sekcja Budżetu (Bottom-Left) */}
            <BudgetWidget />

            {/* Item 4: Lista kategorii (Bottom-Right) */}
            <div className="mt-6 md:mt-0"> {/* Remove top margin on desktop */}
              <h2 className="text-xl font-semibold mb-4">Kategorie zadań</h2>
              <CategoryList
                categories={processedCategories} // Pass processed categories with parent_id
                tasks={tasks} // Pass all tasks
                isLoading={isLoadingCategories} // Use only category loading state here
                onManageCategories={handleOpenCategoryManager}
                onCategoryUpdate={handleCategoryUpdate} // Pass the handler function
              />
            </div>
          </div>
        </div>
      </main>

      {/* Task Form Modal */}
      <TaskForm
        show={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSave={handleSaveTask}
        task={editingTask}
        categories={processedCategories} // Pass processed categories to form as well
        onCreateFromNote={handleCreateFromNote}
      />

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdzenie usunięcia</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć to zadanie? Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Manager Dialog */}
      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        // Removed existingCategories prop
        onCategoryAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        }}
      />

      {/* Mobile bottom navigation */}
      {/* <MobileNavigation onAddTask={handleAddTask} /> */} {/* Replaced by GlobalFab */}

      {/* Use GlobalFab component */}
      <GlobalFab
        onAddTask={handleAddTask}
        onAddNote={() => setShowAddNoteFormHome(true)} // Use state from home page
        onManageCategories={handleOpenCategoryManager}
        // No onDeleteCategory needed on home page
        showDeleteCategory={false} // Hide delete option on home page
      />
    </div>
  );
}
