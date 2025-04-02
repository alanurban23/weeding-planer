import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Task } from '@shared/schema';
import TaskList from '@/components/task-list';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import TaskForm, { EditingTask } from '@/components/task-form';
import { NotesSection } from '@/components/notes-section';
import CategoryManager from '@/components/category-manager';
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

// Definicja typu dla kategorii
interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

export default function CategoryPage() {
  const navigate = useNavigate();
  const { categoryId: categoryIdParam } = useParams<{ categoryId: string }>();
  
  // Konwersja ID kategorii na liczbę lub string
  const categoryId = useMemo(() => {
    if (!categoryIdParam) return null;
    
    try {
      const parsedId = parseInt(categoryIdParam, 10);
      if (!isNaN(parsedId)) {
        console.log(`Przekonwertowano ID kategorii "${categoryIdParam}" na liczbę: ${parsedId}`);
        return parsedId;
      }
    } catch (e) {
      console.error("Błąd podczas konwersji ID kategorii:", e);
    }
    
    // Jeśli ID nie jest liczbą, nie przekierowujemy od razu, spróbujemy znaleźć kategorię po nazwie
    console.warn(`ID kategorii "${categoryIdParam}" nie jest liczbą, ale spróbujemy znaleźć kategorię`);
    return categoryIdParam;
  }, [categoryIdParam]) as number | null; // Wymuszamy typ number | null

  const [categoryName, setCategoryName] = useState<string>('');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const { toast } = useToast();

  // Pobieranie kategorii
  const { data: category, isLoading: isLoadingCategory, error: categoryError } = useQuery<Category>({
    queryKey: ['/api/categories', categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/categories/${categoryId}`);
        return response;
      } catch (error) {
        console.error('Błąd pobierania kategorii:', error);
        throw error;
      }
    }
  });

  // Ustawienie nazwy kategorii po pobraniu danych
  useEffect(() => {
    if (category && category.name) {
      setCategoryName(category.name);
    }
  }, [category]);

  // Obsługa błędu pobierania kategorii
  useEffect(() => {
    if (isLoadingCategory === false && categoryError) {
      navigate('/');
    }
  }, [isLoadingCategory, categoryError, navigate]);

  // Pobieranie podkategorii dla bieżącej kategorii
  const { data: subcategories = [], isLoading: isLoadingSubcategories, refetch: refetchSubcategories } = useQuery<Category[]>({
    queryKey: ['/api/categories/subcategories', categoryId],
    enabled: !!categoryId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale to force refetch
    queryFn: async () => {
      try {
        // Pobierz wszystkie kategorie
        const allCategories = await apiRequest('/api/categories');
        // Filtruj tylko te, które mają parent_id równy bieżącemu categoryId
        return allCategories.filter((cat: Category) => 
          cat.parent_id !== null && 
          String(cat.parent_id) === String(categoryId)
        );
      } catch (error) {
        console.error('Błąd pobierania podkategorii:', error);
        return [];
      }
    }
  });

  // Pobieranie zadań dla wybranej kategorii
  const {
    data: tasks = [],
    isLoading: isLoadingTasks,
    refetch: refetchTasks
  } = useQuery<Task[]>({
    queryKey: ['/api/tasks', categoryId],
    queryFn: () => {
      if (categoryId === null) return Promise.resolve([]);
      // Pobieramy wszystkie zadania, a potem filtrujemy je po stronie klienta
      return apiRequest(`/api/tasks`, 'GET');
    },
    enabled: categoryId !== null,
  });

  // Mutacja do usuwania zadania
  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => apiRequest(`/api/tasks/${taskId}`, 'DELETE'),
    onSuccess: () => {
      refetchTasks();
      toast({
        title: 'Sukces',
        description: 'Zadanie zostało usunięte',
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      console.error('Błąd usuwania zadania:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć zadania',
        variant: 'destructive',
        duration: 3000,
      });
    }
  });

  // Obsługa usuwania zadania
  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setShowDeleteDialog(true);
  };

  // Potwierdzenie usuwania zadania
  const confirmDeleteTask = () => {
    if (taskToDelete) {
      deleteMutation.mutate(taskToDelete);
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    }
  };

  // Anulowanie usuwania zadania
  const cancelDeleteTask = () => {
    setShowDeleteDialog(false);
    setTaskToDelete(null);
  };

  // Obsługa edycji zadania
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowAddTaskModal(true);
  };

  // Obsługa dodawania zadania
  const handleAddTask = () => {
    setEditingTask(null);
    setShowAddTaskModal(true);
  };

  // Obsługa zamykania modalu dodawania/edycji zadania
  const handleCloseModal = () => {
    setShowAddTaskModal(false);
    setEditingTask(null);
  };

  // Obsługa usuwania kategorii
  const deleteCategoryMutation = useMutation({
    mutationFn: () => {
      if (categoryId === null) return Promise.resolve(null);
      return apiRequest(`/api/categories?id=${categoryId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Kategoria została usunięta',
        duration: 3000,
      });
      navigate('/');
    },
    onError: (error: Error) => {
      console.error('Błąd usuwania kategorii:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć kategorii. Upewnij się, że nie ma przypisanych zadań lub notatek.',
        variant: 'destructive',
        duration: 5000,
      });
    }
  });

  // Obsługa usuwania kategorii
  const handleDeleteCategory = () => {
    if (window.confirm(`Czy na pewno chcesz usunąć kategorię "${categoryName}"?`)) {
      deleteCategoryMutation.mutate();
    }
  };

  // Jeśli nie ma kategorii, wyświetl komunikat
  if (!categoryId) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Nie znaleziono kategorii</h1>
          <Button onClick={() => navigate('/')}>Wróć do strony głównej</Button>
        </div>
      </div>
    );
  }

  // Grupowanie zadań według kategorii
  const groupedTasks = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return {};
    
    console.log('Wszystkie zadania:', tasks);
    console.log('Kategoria ID z URL:', categoryId, typeof categoryId);
    console.log('Nazwa kategorii:', categoryName);
    
    // Filtrujemy zadania, aby pokazać tylko te z bieżącej kategorii
    const filteredTasks = tasks.filter(task => {
      // Jeśli nie mamy ID kategorii, nie możemy filtrować
      if (categoryId === null) return false;
      
      // Konwertujemy id_category zadania na liczbę, jeśli to string
      const taskCategoryId = typeof task.id_category === 'string' 
        ? parseInt(task.id_category, 10) 
        : (typeof task.id_category === 'number' ? task.id_category : null);
      
      // Sprawdzamy, czy ID kategorii zadania jest równe ID kategorii z URL
      if (taskCategoryId !== null && taskCategoryId === categoryId) {
        return true;
      }
      
      // Sprawdzamy, czy nazwa kategorii zadania jest równa nazwie kategorii
      if (task.category && categoryName && task.category === categoryName) {
        return true;
      }
      
      // Sprawdzamy, czy id_category zadania jako string jest równe categoryId jako string
      if (task.id_category !== undefined && 
          task.id_category.toString() === categoryId.toString()) {
        return true;
      }
      
      return false;
    });
    
    console.log('Przefiltrowane zadania:', filteredTasks);
    
    // W widoku kategorii wszystkie zadania są w jednej grupie (nazwa kategorii)
    return {
      [categoryName || `Kategoria #${categoryId}`]: filteredTasks
    };
  }, [tasks, categoryName, categoryId]);

  // Mutacja do dodawania zadania
  const addTaskMutation = useMutation({
    mutationFn: (task: EditingTask) => {
      // Upewnij się, że id_category jest liczbą
      const taskToAdd = {
        ...task,
        id_category: categoryId
      };
      return apiRequest('/api/tasks', 'POST', taskToAdd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', categoryId] });
      setShowAddTaskModal(false);
      toast({
        title: 'Sukces',
        description: 'Zadanie zostało dodane',
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      console.error('Błąd dodawania zadania:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać zadania',
        variant: 'destructive',
        duration: 3000,
      });
    }
  });

  // Mutacja do aktualizacji zadania
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<EditingTask> }) => {
      // Upewnij się, że id_category jest liczbą, jeśli jest przekazywane
      const taskUpdate = { ...data };
      if (taskUpdate.id_category !== undefined) {
        if (typeof taskUpdate.id_category === 'string') {
          const numericId = parseInt(taskUpdate.id_category, 10);
          if (!isNaN(numericId)) {
            taskUpdate.id_category = numericId;
          } else {
            taskUpdate.id_category = undefined;
          }
        }
      }
      
      return apiRequest(`/api/tasks/${id}`, 'PUT', taskUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', categoryId] });
      setShowAddTaskModal(false);
      toast({
        title: 'Sukces',
        description: 'Zadanie zostało zaktualizowane',
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      console.error('Błąd aktualizacji zadania:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować zadania',
        variant: 'destructive',
        duration: 3000,
      });
    }
  });

  const handleToggleTaskCompletion = (id: string) => {
    const task = tasks.find((t: Task) => t.id === id);
    if (task) {
      updateTaskMutation.mutate({
        id,
        data: { completed: !task.completed }
      });
    }
  };

  const handleSaveTask = (taskData: EditingTask) => {
    if (editingTask) {
      updateTaskMutation.mutate({
        id: editingTask.id,
        data: taskData
      });
    } else {
      addTaskMutation.mutate({
        ...taskData,
        id_category: categoryId
      });
    }
  };

  const handleCreateFromNote = (note: string, category: string | number) => {
    const newTask: EditingTask = {
      id: '', 
      title: note.length > 50 ? note.substring(0, 47) + '...' : note,
      notes: [note],
      dueDate: null,
      id_category: categoryId,
      completed: false
    };
    
    addTaskMutation.mutate(newTask);
  };

  return (
    <div className="min-h-screen bg-gray-100">
<header className="bg-white shadow">
  <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
    {/* Mobile header layout - completely stacked for clean mobile experience */}
    <div className="md:hidden flex flex-col">
      <Button 
        variant="outline" 
        onClick={() => navigate('/')} 
        className="self-start mb-4 px-4 py-2"
      >
        &larr; Wróć
      </Button>
      
      <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">
        {categoryName || `Kategoria #${categoryId}`}
      </h1>
      
      <div className="flex flex-col gap-3 mb-2">
        <Button 
          onClick={handleAddTask} 
          className="w-full py-3"
        >
          Dodaj zadanie
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleDeleteCategory} 
          className="w-full py-3"
        >
          Usuń kategorię
        </Button>
      </div>
    </div>
    
    {/* Desktop header layout - unchanged */}
    <div className="hidden md:flex md:justify-between md:items-center">
      <div>
        <Button variant="outline" onClick={() => navigate('/')}>
          &larr; Wróć
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {categoryName || `Kategoria #${categoryId}`}
        </h1>
      </div>
      <div className="flex space-x-2">
        <Button onClick={handleAddTask}>Dodaj zadanie</Button>
        <Button variant="destructive" onClick={handleDeleteCategory}>Usuń kategorię</Button>
      </div>
    </div>
  </div>
</header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Notatki</h2>
                <Button 
                  onClick={() => setShowCategoryManager(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Dodaj kategorię
                </Button>
              </div>
              <NotesSection 
                category={categoryName} 
                id_category={categoryId}
                onCreateFromNote={handleCreateFromNote}
              />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Zadania i podkategorie</h2>
              <Button onClick={handleAddTask} className="mb-4">Dodaj zadanie</Button>
              
              <TaskList 
                groupedTasks={groupedTasks}
                subcategories={subcategories}
                isLoading={isLoadingTasks || isLoadingSubcategories}
                onToggleTaskCompletion={handleToggleTaskCompletion}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTask}
                onCreateFromNote={handleCreateFromNote}
              />
            </div>
          </div>
        </div>
      </main>
      
      <TaskForm
        show={showAddTaskModal}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
        task={editingTask}
        categories={category && category.id && category.name ? [{ id: category.id, name: category.name }] : []}
        onCreateFromNote={handleCreateFromNote}
      />
      
      {showCategoryManager && (
        <CategoryManager 
          isOpen={showCategoryManager} 
          onClose={() => setShowCategoryManager(false)} 
          onCategoryAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
            queryClient.invalidateQueries({ queryKey: ['/api/categories/subcategories', categoryId] });
            refetchSubcategories();
          }}
        />
      )}
      
      <AlertDialog open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć to zadanie?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna i spowoduje trwałe usunięcie zadania.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteTask}>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask}>Usuń</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
