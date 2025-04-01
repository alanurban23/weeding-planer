import React, { useState } from 'react';
import { Task } from '@shared/schema';
import { Edit, Trash2, CheckCircle, ChevronDown, ChevronUp, Plus } from './icons';
import { cn } from '@/lib/utils';
import { formatDate, isDateOverdue, isDateToday } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';

interface TaskItemProps {
  task: Task;
  onToggleCompletion: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onCreateFromNote?: (note: string, category: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleCompletion,
  onEdit,
  onDelete,
  onCreateFromNote,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Determine if task is overdue
  const isOverdue = task.dueDate && task.dueDate !== '' ? isDateOverdue(new Date(task.dueDate)) : false;
  
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

  // Determine badge variant based on task status
  const getDateBadgeVariant = () => {
    if (task.completed) return 'default';
    if (isOverdue) return 'destructive';
    if (task.dueDate && task.dueDate !== '' && isDateToday(new Date(task.dueDate))) return 'secondary';
    return 'outline';
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <li className="bg-white shadow overflow-hidden rounded-md mb-3 list-none">
      <div 
        className={cn(
          'border-l-4 px-4 py-4 sm:px-6 cursor-pointer',
          getBorderColor()
        )}
        onClick={toggleExpand}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <div className="flex-shrink-0 pt-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCompletion(task.id);
                }}
                className={cn(
                  'h-5 w-5 transition-colors duration-150',
                  task.completed ? 'text-green-500' : 'text-gray-300 hover:text-primary'
                )}
              >
                <CheckCircle />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <p 
                  className={cn(
                    'text-sm font-medium',
                    task.completed ? 'line-through text-gray-500' : 'text-primary'
                  )}
                >
                  {task.title}
                </p>
                <div className="mt-1 sm:mt-0 sm:ml-2 flex-shrink-0 flex flex-wrap gap-2">
                  <Badge variant="outline" className="font-normal text-xs">
                    {task.category}
                  </Badge>
                  
                  {task.dueDate && task.dueDate !== '' && (
                    <Badge variant={getDateBadgeVariant()} className="font-normal text-xs">
                      {formatDate(new Date(task.dueDate))}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Always show notes if expanded, or first note if not expanded */}
              {task.notes && task.notes.length > 0 && (
                <div className="mt-2">
                  <div 
                    className={cn(
                      'text-sm',
                      task.completed ? 'text-gray-500' : 'text-gray-700'
                    )}
                  >
                    <div className="flex items-start">
                      <span className="mr-2 flex-grow">
                        {isExpanded ? (
                          // Show all notes when expanded
                          <ul className="space-y-2 list-disc pl-5">
                            {task.notes.map((note, index) => (
                              <li key={index} className="text-sm">
                                <div className="flex items-start justify-between group">
                                  <span className="flex-grow">{note}</span>
                                  {onCreateFromNote && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCreateFromNote(note, task.category || "");
                                      }}
                                      className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary flex items-center"
                                      title="Przekształć na zadanie"
                                    >
                                      <Plus className="h-4 w-4" />
                                      <span className="text-xs ml-1">Przekształć na zadanie</span>
                                    </button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          // Show only first note when collapsed
                          <div className="flex items-start justify-between group">
                            <span className="flex-grow">{task.notes[0]}</span>
                            {onCreateFromNote && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCreateFromNote(task.notes[0], task.category || "");
                                }}
                                className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary flex items-center"
                                title="Przekształć na zadanie"
                              >
                                <Plus className="h-4 w-4" />
                                <span className="text-xs ml-1">Przekształć na zadanie</span>
                              </button>
                            )}
                          </div>
                        )}
                      </span>
                      
                      {/* Only show expand/collapse button if there are multiple notes */}
                      {task.notes.length > 1 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand();
                          }}
                          className="ml-1 text-gray-400 hover:text-gray-600 flex items-center"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              <span className="text-xs ml-1">Zwiń</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              <span className="text-xs ml-1">{`+ ${task.notes.length - 1} więcej`}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status and date information */}
              <div className="mt-2 flex flex-wrap text-xs text-gray-500 gap-2">
                {task.completed && task.createdAt && (
                  <Badge variant="default" className="font-normal text-xs">
                    Wykonano {formatDate(new Date(task.createdAt))}
                  </Badge>
                )}
                {isOverdue && !task.completed && (
                  <Badge variant="destructive" className="font-normal text-xs">
                    Po terminie
                  </Badge>
                )}
                {task.dueDate && task.dueDate !== '' && isDateToday(new Date(task.dueDate)) && !task.completed && (
                  <Badge variant="secondary" className="font-normal text-xs">
                    Dzisiaj
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex space-x-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Edytuj zadanie"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
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
