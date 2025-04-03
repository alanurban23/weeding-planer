import React, { useState, useRef, useCallback, useEffect } from 'react'; // Import useEffect
import { useIsMobile } from '@/hooks/use-mobile';
import { Task } from '@shared/schema';
import { Edit, Trash2, CheckCircle, Plus } from './icons'; // Removed ChevronDown, ChevronUp
import { cn } from '@/lib/utils';
// Make sure this import path is correct and the file exports isDateOverdue
import { formatDate, isDateOverdue } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TaskItemProps {
  task: Task;
  onToggleCompletion: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onShowDetails: (task: Task) => void; // Added prop for showing details
  onCreateFromNote?: (note: string, category: string) => void;
}

const ACTIONS_REVEAL_WIDTH = 160;

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleCompletion,
  onEdit,
  onDelete,
  onShowDetails, // Destructure new prop
  onCreateFromNote,
}) => {
  // Removed isExpanded state
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [currentX, setCurrentX] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [transform, setTransform] = useState(0);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const isMobile = useIsMobile();
  const itemRef = useRef<HTMLDivElement>(null);

  // --- MOVED CALCULATION HERE ---
  // Determine if task is overdue
  const isOverdue = task.dueDate ? isDateOverdue(new Date(task.dueDate)) : false;
  // --- END MOVED CALCULATION ---


  // --- Reset swipe state ---
  const resetSwipe = useCallback(() => {
    // ... (resetSwipe function remains the same)
    setIsSwiping(false);
    setTouchStartX(null);
    setCurrentX(null);
    setTransform(0);
    setIsActionsVisible(false);
     requestAnimationFrame(() => {
        if (itemRef.current) {
             itemRef.current.style.transition = 'transform 0.2s ease-out';
             itemRef.current.style.transform = 'translateX(0px)';
        }
     });
  }, []);

  // --- Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isActionsVisible) return;
    if (itemRef.current) itemRef.current.style.transition = 'none';
    setTouchStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
    setIsSwiping(false);
  };

  // Define handleTouchMove separately for manual listener attachment
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isMobile || task.completed || touchStartX === null || isActionsVisible) return;
    const currentTouchX = e.touches[0].clientX;
    // Use optional chaining for safety, though touchStartX check should prevent null
    const startX = touchStartX ?? currentTouchX; 
    const deltaX = currentTouchX - startX;

    if (Math.abs(deltaX) > 10) {
      setIsSwiping(true);
      // Prevent default scroll behavior
      try { e.preventDefault(); } catch (err) { console.warn("Could not prevent default touch behavior:", err); } 
      const newTransform = Math.max(-ACTIONS_REVEAL_WIDTH - 20, Math.min(80, deltaX));
      setTransform(newTransform);
      if (itemRef.current) {
           itemRef.current.style.transition = 'none'; // Ensure transition is off during move
           itemRef.current.style.transform = `translateX(${newTransform}px)`;
       }
    }
  }, [isMobile, task.completed, touchStartX, isActionsVisible, currentX]); // Added currentX dependency

  // Effect to add/remove non-passive listener
  useEffect(() => {
    const node = itemRef.current;
    if (node && isMobile) {
      // Add non-passive listener
      node.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      // Cleanup function to remove listener
      return () => {
        node.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [handleTouchMove, isMobile]); // Re-run if handler or isMobile changes

  const handleTouchEnd = () => {
     if (!isMobile || task.completed || !isSwiping) {
        if(!isActionsVisible) resetSwipe();
        return;
    }
    const swipeThreshold = 60;
    if (itemRef.current) itemRef.current.style.transition = 'transform 0.2s ease-out';
    if (transform < -swipeThreshold) {
      setIsActionsVisible(true);
      setTransform(-ACTIONS_REVEAL_WIDTH);
       if (itemRef.current) itemRef.current.style.transform = `translateX(${-ACTIONS_REVEAL_WIDTH}px)`;
    } else if (transform > swipeThreshold) {
      onEdit(task);
      resetSwipe();
    } else {
      resetSwipe();
    }
    setTouchStartX(null);
    setCurrentX(null);
    setIsSwiping(false);
  };

  // --- Action Button Click Handlers ---
  const handleActionClick = (action: () => void) => (e: React.MouseEvent) => {
    // ... (handleActionClick function remains the same)
    e.stopPropagation();
    action();
    resetSwipe();
  };

  // --- Main Content Click Handler ---
  const handleContentClick = (e: React.MouseEvent) => {
    // ... (handleContentClick function remains the same)
     if (isActionsVisible) {
      e.stopPropagation();
      resetSwipe();
    } else if (!isSwiping && transform === 0) {
        // Call onShowDetails instead of toggleExpand
        onShowDetails(task);
    }
  };

  // --- Toggle Expand --- function removed

  // --- Determine border color ---
  // Now uses the correctly defined 'isOverdue' variable
  const getBorderColor = () => {
    if (task.completed) return 'border-green-500';
    if (isOverdue) return 'border-red-500'; // Uses isOverdue
    return 'border-primary';
  };

  // --- JSX ---
  return (
    <li className="bg-gray-100 shadow overflow-hidden rounded-md mb-3 list-none relative">

      {/* Background Actions Container */}
      <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
        {/* Mark as Done Button */}
        <Button
          variant="ghost"
          className="bg-green-500 hover:bg-green-600 text-white rounded-none h-full px-4 flex flex-col items-center justify-center w-[80px]"
          onClick={handleActionClick(() => onToggleCompletion(task.id))}
          aria-label={task.completed ? "Oznacz jako nieukończone" : "Oznacz jako ukończone"}
        >
          <CheckCircle className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">{task.completed ? "Cofnij" : "Zrobione"}</span>
        </Button>
        {/* Delete Button */}
        <Button
          variant="ghost"
          className="bg-red-500 hover:bg-red-600 text-white rounded-none h-full px-4 flex flex-col items-center justify-center w-[80px]"
          onClick={handleActionClick(() => onDelete(task.id))}
          aria-label="Usuń zadanie"
        >
          <Trash2 className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">Usuń</span>
        </Button>
      </div>

      {/* Swipeable content */}
      <div
        ref={itemRef}
        className={cn(
          'border-l-4 px-4 py-4 sm:px-6 relative bg-white z-10',
          getBorderColor(),
          isMobile ? 'cursor-grab' : 'cursor-pointer'
        )}
        style={{ transform: `translateX(${transform}px)` }}
        onTouchStart={handleTouchStart}
        // onTouchMove is now handled by useEffect
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        {/* Task item content */}
        <div className="flex items-start justify-between">
          {/* Left side: Checkbox and Task Details */}
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            {/* Checkbox */}
             <div className="flex-shrink-0 pt-1">
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   if (!isActionsVisible && !isSwiping) {
                      onToggleCompletion(task.id);
                   }
                 }}
                 className={cn(
                   'h-5 w-5 transition-colors duration-150',
                   task.completed ? 'text-green-500' : 'text-gray-300 hover:text-primary'
                 )}
                 aria-label={task.completed ? "Oznacz jako nieukończone" : "Oznacz jako ukończone"}
               >
                 <CheckCircle />
               </button>
             </div>
            {/* Title, Category, Notes */}
            <div className="min-w-0 flex-1">
              {/* Title and Badges Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <p
                  className={cn(
                    'text-sm font-medium truncate pr-2',
                    task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  )}
                >
                  {task.title}
                </p>
                {/* Badges Container */}
                <div className="mt-1 sm:mt-0 sm:ml-2 flex-shrink-0 flex flex-wrap gap-1">
                  {task.category && (
                     <Badge variant="secondary" className="font-normal text-xs">
                      {task.category}
                     </Badge>
                  )}
                  {task.dueDate && (
                    <Badge
                      // Uses the correctly defined 'isOverdue' variable
                      variant={isOverdue && !task.completed ? "destructive" : "secondary"}
                      className="font-normal text-xs"
                     >
                      {formatDate(new Date(task.dueDate))}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Notes Section (Simplified) */}
              {task.notes && task.notes.length > 0 && (
                <div className="mt-2 text-sm text-gray-700">
                  {/* Always show truncated first note */}
                  <p className="truncate">{task.notes[0]}{task.notes.length > 1 ? '...' : ''}</p>
                </div>
              )}
            </div>
          </div>
          {/* Right side: Desktop Edit/Delete Icons */}
          {!isMobile && (
              <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                {/* ... (Desktop buttons remain the same) ... */}
                 <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="text-gray-400 hover:text-blue-500 h-7 w-7" aria-label="Edytuj zadanie"><Edit className="h-4 w-4" /></Button>
                 <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-gray-400 hover:text-red-500 h-7 w-7" aria-label="Usuń zadanie"><Trash2 className="h-4 w-4" /></Button>
              </div>
          )}
        </div>
      </div>
    </li>
  );
};

export default TaskItem;
