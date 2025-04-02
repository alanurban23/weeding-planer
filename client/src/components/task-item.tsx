import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const [touchStart, setTouchStart] = useState(0);
  const [transform, setTransform] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left'|'right'|null>(null);
  const isMobile = useIsMobile();

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || task.completed) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart;
    
    if (Math.abs(deltaX) > 20) {
      setTransform(deltaX);
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || task.completed) return;

    const threshold = 60;
    if (Math.abs(transform) > threshold) {
      if (swipeDirection === 'right') {
        onDelete(task.id);
      } else {
        onToggleCompletion(task.id);
      }
    }
    
    setTouchStart(0);
    setTransform(0);
    setSwipeDirection(null);
  };

  // Prevent scroll during swipe
  useEffect(() => {
    document.body.style.overflow = transform !== 0 ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [transform]);

  // Determine if task is overdue
  const isOverdue = task.dueDate && task.dueDate !== '' ? isDateOverdue(new Date(task.dueDate)) : false;
  
  // Determine border color based on task status
  const getBorderColor = () => {
    if (task.completed) return 'border-green-500';
    if (isOverdue) return 'border-red-500';
    return 'border-primary';
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <li className="bg-white shadow overflow-hidden rounded-md mb-3 list-none relative">
      {/* Swipe action backgrounds */}
      <div className="absolute inset-0 flex">
        <div className={cn(
          'w-1/2 flex items-center justify-end pr-4 transition-colors',
          swipeDirection === 'right' ? 'bg-red-500' : 'bg-red-500/50'
        )}>
          <Trash2 className="h-6 w-6 text-white" />
        </div>
        <div className={cn(
          'w-1/2 flex items-center justify-start pl-4 transition-colors',
          swipeDirection === 'left' ? 'bg-green-500' : 'bg-green-500/50'
        )}>
          <CheckCircle className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Swipeable content */}
      <div 
        className={cn(
          'border-l-4 px-4 py-4 sm:px-6 cursor-pointer relative bg-white transition-transform',
          getBorderColor()
        )}
        style={{ transform: `translateX(${transform}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (transform === 0) {
            toggleExpand();
          }
        }}
      >
        {/* Rest of the task item content */}
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
                    <Badge variant="outline" className="font-normal text-xs">
                      {formatDate(new Date(task.dueDate))}
                    </Badge>
                  )}
                </div>
              </div>

              {task.notes && task.notes.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm text-gray-700">
                    <div className="flex items-start">
                      <span className="mr-2 flex-grow">
                        {isExpanded ? (
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
