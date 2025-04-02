import React from 'react';
import { Task } from '@shared/schema';
import TaskItem from './task-item';
import { Plus, Folder } from './icons';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Category {
  id: number | string;
  name: string;
  parent_id?: number | string | null;
}

interface TaskListProps {
  groupedTasks: Record<string, Task[]>;
  isLoading: boolean;
  subcategories?: Category[];
  onToggleTaskCompletion: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
  onCreateFromNote?: (note: string, category: string | number) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  groupedTasks,
  isLoading,
  subcategories = [],
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onCreateFromNote,
}) => {
  const navigate = useNavigate();

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {subcategories.map((category) => (
              <div
                key={`category-${category.id}`}
                className="bg-blue-50 border border-blue-200 rounded-md p-4 hover:bg-blue-100 transition-colors cursor-pointer flex items-center"
                onClick={() => navigate(`/category/${category.id}`)}
              >
                <div className="bg-blue-100 rounded-full p-2 mr-3">
                  <Folder className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-800">{category.name}</h4>
                  <p className="text-sm text-blue-600">Kliknij, aby przejść do tej kategorii</p>
                </div>
              </div>
            ))}
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
                    onCreateFromNote={onCreateFromNote}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
