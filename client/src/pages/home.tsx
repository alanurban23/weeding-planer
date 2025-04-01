import React, { useState } from 'react';
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

  // Pobieranie kategorii bezpośrednio z API
  const { data: categoriesData = [], isLoading: isLoadingCategories } = useQuery<{id: string, name: string}[]>({
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

  // Wyodrębnianie unikalnych kategorii z zadań
  const uniqueCategories = React.useMemo<Array<{ id: number; name: string }>>(() => {
    // Debugowanie
    console.log('Dane kategorii:', categoriesData);
    
    try {
      // Jeśli mamy kategorie z API, używamy ich bezpośrednio
      if (categoriesData && Array.isArray(categoriesData) && categoriesData.length > 0) {
        console.log('Używam kategorii z API:', categoriesData);
        // Zwracamy pełne obiekty kategorii z id i name, upewniając się, że id jest liczbą
        return categoriesData
          .filter(category => category.id !== undefined)
          .map(category => {
            // Upewniamy się, że id jest liczbą
            const numericId = typeof category.id === 'string' 
              ? parseInt(category.id, 10) 
              : (typeof category.id === 'number' ? category.id : NaN);
            
            // Jeśli nie mogliśmy przekonwertować id na liczbę, generujemy losowe id
            const id = isNaN(numericId) ? Math.floor(Math.random() * 10000) : numericId;
            
            return {
              id,
              name: category.name
            };
          });
      }
      
      // Jako fallback, pobieramy unikalne kategorie z zadań
      const taskCategories = Array.from(new Set(tasks
        .map(task => task.id_category !== undefined ? task.id_category : task.category)
        .filter(category => category !== undefined && category !== null)
      ));
      console.log('Kategorie z zadań:', taskCategories);
      
      // Konwertujemy nazwy kategorii na obiekty z id i name
      return taskCategories.map(category => {
        // Upewniamy się, że id jest liczbą
        let id: number;
        
        if (typeof category === 'number') {
          id = category;
        } else {
          // Próbujemy przekonwertować string na liczbę
          const parsedId = parseInt(String(category), 10);
          // Jeśli konwersja się nie powiedzie, generujemy losowe id
          id = isNaN(parsedId) ? Math.floor(Math.random() * 10000) : parsedId;
        }
        
        return {
          id,
          name: String(category)
        };
      });
    } catch (error) {
      console.error('Błąd podczas przetwarzania kategorii:', error);
      return [];
    }
  }, [tasks, categoriesData]);

  // Filtrowanie zadań nadchodzących (w ciągu najbliższych 7 dni) i po terminie
  const upcomingAndOverdueTasks = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const filteredTasks = tasks.filter(task => {
      if (!task.dueDate || task.completed) return false;
      
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      // Zadania po terminie lub w ciągu najbliższych 7 dni
      return dueDate <= nextWeek;
    }).sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    
    return filteredTasks;
  }, [tasks]);

  // Grupowanie zadań nadchodzących i po terminie
  const groupedUpcomingTasks = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdue: Task[] = [];
    const today_tasks: Task[] = [];
    const upcoming: Task[] = [];
    
    for (const task of upcomingAndOverdueTasks) {
      if (!task.dueDate) continue; // Pomijamy zadania bez daty
      
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
    
    // Po kliknięciu w notatkę wewnątrz edycji zadania czy NotesSection, tworzymy z niej nowe zadanie
    // i otwieramy formularz z wypełnionymi danymi
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
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            CodeNinja - Planer Weselny
          </h1>
          <Button onClick={() => setShowCategoryManager(true)}>
            Zarządzaj kategoriami
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6">
            {/* Sekcja notatek */}
            <NotesSection onCreateFromNote={handleCreateFromNote} onlyWithoutCategory={true} />
            
            {/* Zadania nadchodzące i po terminie */}
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
            
            {/* Lista kategorii */}
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">Kategorie zadań</h2>
              <CategoryList 
                categories={uniqueCategories} 
                tasks={tasks} 
                isLoading={isLoading || isLoadingCategories}
                onManageCategories={handleOpenCategoryManager} 
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
        categories={uniqueCategories}
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
        existingCategories={uniqueCategories}
        onCategoryAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        }}
      />

      {/* Mobile bottom navigation */}
      <MobileNavigation onAddTask={handleAddTask} />
    </div>
  );
}
