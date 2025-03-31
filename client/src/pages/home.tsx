import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import { Task } from '@shared/schema';
import TaskList from '@/components/task-list';
import TaskForm, { EditingTask } from '@/components/task-form';
import TaskFilter from '@/components/task-filter';
import MobileNavigation from '@/components/mobile-navigation';
import MobileFilter from '@/components/mobile-filter';
import { NotesSection } from '@/components/notes-section';
import { sortCategoriesByRomanNumeral, generateId } from '@/lib/utils';
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
  const uniqueCategories = React.useMemo(() => {
    // Pobieramy unikalne kategorie z zadań
    return Array.from(new Set(tasks.map(task => task.category).filter(Boolean)));
  }, [tasks]);

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
  const handleCreateFromNote = (note: string, category: string) => {
    const newTask: EditingTask = {
      id: generateId(),
      title: note,
      category: category,
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
            <NotesSection onCreateFromNote={handleCreateFromNote} />
            
            {/* Lista kategorii */}
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">Kategorie zadań</h2>
              <CategoryList 
                categories={uniqueCategories}
                isLoading={isLoading}
                onManageCategories={() => setShowCategoryManager(true)}
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
        show={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        existingCategories={uniqueCategories}
      />

      {/* Mobile bottom navigation */}
      <MobileNavigation onAddTask={handleAddTask} />
    </div>
  );
}
