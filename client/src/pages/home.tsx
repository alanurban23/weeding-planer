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
import { sortCategoriesByRomanNumeral } from '@/lib/utils';

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

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: (task: EditingTask) => 
      apiRequest('POST', '/api/tasks', task),
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
      apiRequest('PATCH', `/api/tasks/${id}`, data),
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
      apiRequest('DELETE', `/api/tasks/${id}`),
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
      apiRequest('PATCH', `/api/tasks/${id}/toggle`),
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

  // Get unique categories from tasks
  const categories = React.useMemo(() => {
    const uniqueCategories = Array.from(new Set(tasks.map(task => task.category)));
    // Sort by Roman numerals
    return uniqueCategories.filter(Boolean).sort(sortCategoriesByRomanNumeral);
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
    if (window.confirm('Czy na pewno chcesz usunąć to zadanie?')) {
      deleteTaskMutation.mutate(id);
    }
  };

  // Save task (add or update)
  const handleSaveTask = (task: EditingTask) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: task.id, data: task });
    } else {
      addTaskMutation.mutate(task);
    }
  };

  // Toggle task completion status
  const handleToggleTaskCompletion = (id: string) => {
    toggleTaskMutation.mutate(id);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Filter and sort tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
      // Filter by status
      if (filters.status === 'active' && task.completed) return false;
      if (filters.status === 'completed' && !task.completed) return false;
      
      // Filter by category
      if (filters.category && task.category !== filters.category) return false;
      
      // Filter by search query
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(query);
        const notesMatch = task.notes.some(note => 
          note.toLowerCase().includes(query)
        );
        const categoryMatch = task.category.toLowerCase().includes(query);
        
        if (!titleMatch && !notesMatch && !categoryMatch) return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort tasks
      if (filters.sort === 'title') {
        return a.title.localeCompare(b.title, 'pl');
      } else if (filters.sort === 'dueDate') {
        // If no due dates, put them at the end
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (filters.sort === 'category') {
        return a.category.localeCompare(b.category, 'pl');
      }
      
      return 0;
    });
  }, [tasks, filters]);

  // Group tasks by category
  const groupedTasks = React.useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    filteredTasks.forEach(task => {
      if (!grouped[task.category]) {
        grouped[task.category] = [];
      }
      grouped[task.category].push(task);
    });
    
    return grouped;
  }, [filteredTasks]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Planowanie Wesela</h1>
          <div className="flex space-x-2">
            <button 
              onClick={handleAddTask} 
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Dodaj
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar with filters on desktop */}
          <TaskFilter 
            className="hidden lg:block lg:col-span-3"
            filters={filters}
            categories={categories}
            onFilterChange={handleFilterChange}
          />

          {/* Mobile filter dialog */}
          <MobileFilter
            show={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            filters={filters}
            categories={categories}
            onFilterChange={handleFilterChange}
          />

          {/* Task List */}
          <div className="mt-6 lg:mt-0 lg:col-span-9">
            {/* Mobile controls */}
            <div className="lg:hidden flex justify-between items-center mb-4">
              <div>
                <span className="text-sm font-medium text-gray-500">
                  {filteredTasks.length} zadań
                </span>
              </div>
              <button 
                onClick={() => setShowFilterModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filtry
              </button>
            </div>

            <TaskList 
              groupedTasks={groupedTasks}
              isLoading={isLoading}
              onToggleTaskCompletion={handleToggleTaskCompletion}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onAddTask={handleAddTask}
            />
          </div>
        </div>
      </main>

      {/* Task Form Modal */}
      <TaskForm
        show={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSave={handleSaveTask}
        task={editingTask}
        categories={categories}
      />

      {/* Mobile bottom navigation */}
      <MobileNavigation onAddTask={handleAddTask} />
    </div>
  );
}
