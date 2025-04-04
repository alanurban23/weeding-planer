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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// Removed icon imports as they are now in GlobalFab
import { GlobalFab } from '@/components/global-fab'; // Import GlobalFab

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
    console.warn(`ID kategorii "${categoryIdParam}" nie jest liczbą, ale spróbujemy znaleźć kategorię`);
    return categoryIdParam;
  }, [categoryIdParam]) as number | null; // Wymuszamy typ number | null

  const [categoryName, setCategoryName] = useState<string>('');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAddNoteForm, setShowAddNoteForm] = useState(false); // Lifted state
  const { toast } = useToast();

  // Pobieranie WSZYSTKICH kategorii (dla TaskForm)
  const allCategoriesQuery = useQuery<{id: string | number, name: string}[]>({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories')
  });
  const allCategories = allCategoriesQuery.data ?? [];

  // Pobieranie bieżącej kategorii
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
        const allCategories = await apiRequest('/api/categories');
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
     // Use a consistent query key for ALL tasks, independent of the current category page
     queryKey: ['/api/tasks'], 
     queryFn: () => apiRequest(`/api/tasks`, 'GET'), // Always fetch all tasks
     // Keep enabled: false initially if categoryId is null, but the query itself fetches all
     enabled: categoryId !== null, 
    });
 
   // Handler to refetch subcategories when one is updated/deleted in TaskList
   const handleSubcategoryUpdate = () => {
     refetchSubcategories();
     // Optionally refetch all categories if needed elsewhere
     queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
   };
 
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
      // Poprawiono endpoint usuwania kategorii
      return apiRequest(`/api/categories/${categoryId}`, 'DELETE'); 
    },
    onSuccess: () => {
      toast({
        title: 'Sukces',
        description: 'Kategoria została usunięta',
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] }); // Invalidate categories list on home
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
  const groupedTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return {};
    const filteredTasks = tasks.filter(task => {
      if (categoryId === null) return false;
      const taskCategoryId = typeof task.id_category === 'string'
        ? parseInt(task.id_category, 10)
        : (typeof task.id_category === 'number' ? task.id_category : null);
      if (taskCategoryId !== null && taskCategoryId === categoryId) return true;
      if (task.category && categoryName && task.category === categoryName) return true;
      if (task.id_category !== undefined && task.id_category !== null && task.id_category.toString() === categoryId.toString()) return true;
      return false;
    });
    return { [categoryName || `Kategoria #${categoryId}`]: filteredTasks };
  }, [tasks, categoryName, categoryId]);

  // Mutacja do dodawania zadania
  const addTaskMutation = useMutation({
    mutationFn: (task: EditingTask) => {
      const taskToAdd = { ...task, id_category: categoryId };
      return apiRequest('/api/tasks', 'POST', taskToAdd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', categoryId] });
      setShowAddTaskModal(false);
      toast({ title: 'Sukces', description: 'Zadanie zostało dodane', duration: 3000 });
    },
    onError: (error: Error) => {
      console.error('Błąd dodawania zadania:', error);
      toast({ title: 'Błąd', description: 'Nie udało się dodać zadania', variant: 'destructive', duration: 3000 });
    }
  });

  // Mutacja do aktualizacji zadania
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<EditingTask> }) => {
      const taskUpdate = { ...data };
      if (taskUpdate.id_category !== undefined) {
        if (typeof taskUpdate.id_category === 'string') {
          const numericId = parseInt(taskUpdate.id_category, 10);
          taskUpdate.id_category = !isNaN(numericId) ? numericId : undefined;
        }
      }
      return apiRequest(`/api/tasks/${id}`, 'PUT', taskUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', categoryId] });
      setShowAddTaskModal(false);
      toast({ title: 'Sukces', description: 'Zadanie zostało zaktualizowane', duration: 3000 });
    },
    onError: (error: Error) => {
      console.error('Błąd aktualizacji zadania:', error);
      toast({ title: 'Błąd', description: 'Nie udało się zaktualizować zadania', variant: 'destructive', duration: 3000 });
    }
  });

  const handleToggleTaskCompletion = (id: string) => {
    const task = tasks.find((t: Task) => t.id === id);
    if (task) {
      updateTaskMutation.mutate({ id, data: { completed: !task.completed } });
    }
  };

  const handleSaveTask = (taskData: EditingTask) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: taskData });
    } else {
      addTaskMutation.mutate({ ...taskData, id_category: categoryId });
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
    // Added pb-24 to prevent content overlap with FAB
    <div className="min-h-screen bg-gray-100 pb-24">
      <header className="bg-white shadow sticky top-0 z-40"> {/* Made header sticky */}
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          {/* Mobile header layout */}
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
            {/* Removed action buttons from mobile header */}
          </div>

          {/* Desktop header layout */}
          <div className="hidden md:flex md:justify-between md:items-center">
            <div className="flex items-center gap-2"> {/* Added gap for spacing */}
              <Button variant="outline" onClick={() => navigate('/')}>
                &larr; Wróć do listy kategorii
              </Button>
              {/* Added Home Button */}
              <Button variant="outline" onClick={() => navigate('/')} title="Przejdź do strony głównej"> 
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                 </svg>
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 mt-2 ml-2"> {/* Added margin */}
                {categoryName || `Kategoria #${categoryId}`}
              </h1>
            </div>
             {/* Removed action buttons from desktop header */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6">
            <div>
              {/* Removed Add Category button from Notes header */}
              <h2 className="text-xl font-semibold mb-4">Notatki</h2>
              <NotesSection
                category={categoryName}
                id_category={categoryId}
                onCreateFromNote={handleCreateFromNote}
                showAddNoteForm={showAddNoteForm} // Pass state
                setShowAddNoteForm={setShowAddNoteForm} // Pass setter
              />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Zadania i podkategorie</h2>
              {/* Removed Add Task button from Tasks header */}
              <TaskList
                groupedTasks={groupedTasks}
                subcategories={subcategories}
                isLoading={isLoadingTasks || isLoadingSubcategories}
                onToggleTaskCompletion={handleToggleTaskCompletion}
                 onEditTask={handleEditTask}
                 onDeleteTask={handleDeleteTask}
                 onAddTask={handleAddTask}
                 onCreateFromNote={handleCreateFromNote}
                 allTasks={tasks} // Pass the full task list
                 onSubcategoryUpdate={handleSubcategoryUpdate} // Pass the callback
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
        defaultCategoryId={!editingTask ? categoryId : undefined}
        // Pass all categories to the form for selection using data from the new query
        categories={allCategories.map((c: { id: string | number; name: string }) => ({ id: c.id, name: c.name }))} 
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

      {/* Use GlobalFab component */}
      <GlobalFab
        onAddTask={handleAddTask}
        onAddNote={() => setShowAddNoteForm(true)}
        onManageCategories={() => setShowCategoryManager(true)}
        onDeleteCategory={handleDeleteCategory}
        showDeleteCategory={true} // Always show delete option on category page
      />
    </div>
  );
}
