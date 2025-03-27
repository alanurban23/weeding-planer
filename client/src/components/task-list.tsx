import React from 'react';
import { Task } from '@shared/schema';
import TaskItem from './task-item';
import { Plus } from './icons';
import { sortCategoriesByRomanNumeral } from '@/lib/utils';

interface TaskListProps {
  groupedTasks: Record<string, Task[]>;
  isLoading: boolean;
  onToggleTaskCompletion: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: () => void;
}

const TaskList: React.FC<TaskListProps> = ({
  groupedTasks,
  isLoading,
  onToggleTaskCompletion,
  onEditTask,
  onDeleteTask,
  onAddTask,
}) => {
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

  // If no tasks, show empty state
  if (Object.keys(groupedTasks).length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Brak zadań</h3>
        <p className="mt-1 text-sm text-gray-500">Zacznij dodawać zadania do swojego planu weselnego.</p>
        <div className="mt-6">
          <button
            onClick={onAddTask}
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Dodaj zadanie
          </button>
        </div>
      </div>
    );
  }

  // Import is already declared at the top of the file

  // Display tasks grouped by category
  return (
    <div className="space-y-8">
      {Object.entries(groupedTasks)
        // Sort categories by Roman numerals
        .sort(([categoryA], [categoryB]) => sortCategoriesByRomanNumeral(categoryA, categoryB))
        .map(([category, tasks]) => (
          <div key={category}>
            <h2 className="text-lg font-medium text-gray-900 mb-4">{category}</h2>
            <ul className="space-y-3">
              {tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleCompletion={onToggleTaskCompletion}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
};

export default TaskList;
