import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Task } from '@shared/schema';
import TaskList from '@/components/task-list';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from 'wouter';
import TaskForm, { EditingTask } from '@/components/task-form';
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

export default function CategoryPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/kategoria/:categoryName');
  const categoryName = params?.categoryName ? decodeURIComponent(params.categoryName) : '';
  const { toast } = useToast();
  const [showAddTaskModal, setShowAddTaskModal] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [taskToDelete, setTaskToDelete] = React.useState<string | null>(null);

  // Pobieranie zadań
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Pobieranie kategorii
  const { data: categories = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/categories'],
  });

  // Dodawanie zadania
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

  // Aktualizacja zadania
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

  // Usuwanie zadania
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

  // Filtrowanie zadań dla wybranej kategorii
  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => task.category === categoryName);
  }, [tasks, categoryName]);

  // Grupowanie zadań według kategorii
  const groupedTasks = React.useMemo(() => {
    return { [categoryName]: filteredTasks };
  }, [filteredTasks, categoryName]);

  // Obsługa przełączania statusu zadania
  const handleToggleTaskCompletion = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      updateTaskMutation.mutate({
        id,
        data: { completed: !task.completed }
      });
    }
  };

  // Obsługa edycji zadania
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowAddTaskModal(true);
  };

  // Obsługa usuwania zadania
  const handleDeleteTask = (id: string) => {
    setTaskToDelete(id);
    setShowDeleteDialog(true);
  };

  // Potwierdzenie usunięcia zadania
  const confirmDeleteTask = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete);
      setTaskToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  // Obsługa dodawania zadania
  const handleAddTask = () => {
    setEditingTask(null);
    setShowAddTaskModal(true);
  };

  // Obsługa zapisywania zadania
  const handleSaveTask = (taskData: EditingTask) => {
    if (editingTask) {
      updateTaskMutation.mutate({
        id: editingTask.id,
        data: taskData
      });
    } else {
      // Ustaw kategorię zadania na bieżącą kategorię
      addTaskMutation.mutate({
        ...taskData,
        category: categoryName
      });
    }
  };

  // Obsługa tworzenia zadania z notatki
  const handleCreateFromNote = (note: string, category: string) => {
    const newTask: EditingTask = {
      id: '', // To pole zostanie nadpisane przez serwer
      title: note.length > 50 ? note.substring(0, 47) + '...' : note,
      notes: [note],
      dueDate: null,
      category: category || categoryName,
      completed: false
    };
    
    addTaskMutation.mutate(newTask);
  };

  if (!categoryName) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Nie znaleziono kategorii</h1>
          <Button onClick={() => setLocation('/')}>Wróć do strony głównej</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <Button variant="outline" onClick={() => setLocation('/')}>
              &larr; Wróć
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              Kategoria: {categoryName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredTasks.length} zadań w tej kategorii
            </p>
          </div>
          <Button onClick={handleAddTask}>
            Dodaj zadanie
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <TaskList 
            groupedTasks={groupedTasks}
            isLoading={isLoading}
            onToggleTaskCompletion={handleToggleTaskCompletion}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
            onCreateFromNote={handleCreateFromNote}
          />
        </div>
      </main>

      {/* Task Form Modal */}
      <TaskForm
        show={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSave={handleSaveTask}
        task={editingTask}
        categories={categories.map(c => c.name)}
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
    </div>
  );
}
