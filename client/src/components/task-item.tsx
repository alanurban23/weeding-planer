import React from 'react';
import { Task } from '@shared/schema';
import { Edit, Trash2, CheckCircle } from './icons';
import { cn } from '@/lib/utils';
import { formatDate, isDateOverdue, isDateToday } from '@/lib/date-utils';

interface TaskItemProps {
  task: Task;
  onToggleCompletion: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleCompletion,
  onEdit,
  onDelete,
}) => {
  // Determine if task is overdue
  const isOverdue = task.dueDate ? isDateOverdue(new Date(task.dueDate)) : false;
  
  // Determine border color based on task status
  const getBorderColor = () => {
    if (task.completed) return 'border-green-500';
    if (isOverdue) return 'border-red-500';
    return 'border-primary';
  };

  // Determine date text color based on task status
  const getDateColor = () => {
    if (task.completed) return 'text-gray-500';
    if (isOverdue) return 'text-red-500';
    return 'text-gray-600';
  };

  return (
    <li className="bg-white shadow overflow-hidden rounded-md">
      <div 
        className={cn(
          'border-l-4 px-4 py-4 sm:px-6',
          getBorderColor()
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <div className="flex-shrink-0 pt-1">
              <button 
                onClick={() => onToggleCompletion(task.id)}
                className={cn(
                  'h-5 w-5 transition-colors duration-150',
                  task.completed ? 'text-green-500' : 'text-gray-300 hover:text-primary'
                )}
              >
                <CheckCircle />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p 
                  className={cn(
                    'text-sm font-medium truncate',
                    task.completed ? 'line-through text-gray-500' : 'text-primary'
                  )}
                >
                  {task.title}
                </p>
                <div className="ml-2 flex-shrink-0 flex">
                  {task.dueDate && (
                    <p className={cn('text-sm', getDateColor())}>
                      {formatDate(new Date(task.dueDate))}
                    </p>
                  )}
                </div>
              </div>
              {task.notes && task.notes.length > 0 && (
                <div className="mt-2">
                  <div 
                    className={cn(
                      'text-sm line-clamp-2',
                      task.completed ? 'text-gray-500' : 'text-gray-700'
                    )}
                  >
                    {task.notes.length === 1 ? (
                      <span>{task.notes[0]}</span>
                    ) : (
                      <span>
                        {task.notes[0]}
                        <span className="text-gray-500 text-xs ml-1">
                          {`+ ${task.notes.length - 1} więcej`}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex space-x-2">
            <button 
              onClick={() => onEdit(task)}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Edytuj zadanie"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="text-gray-400 hover:text-red-500"
              aria-label="Usuń zadanie"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};

export default TaskItem;
