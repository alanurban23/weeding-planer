import React from 'react';
import { Task } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Added DialogDescription
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale'; // Polish locale for date formatting

interface Category {
  id: string | number;
  name: string;
}

interface TaskDetailViewProps {
  show: boolean;
  onClose: () => void;
  task: Task | null;
  categories: Array<Category>; // Pass categories to resolve name
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  show,
  onClose,
  task,
  categories,
}) => {
  const categoryMap = React.useMemo(() => {
    const map = new Map<string | number, string>();
    categories.forEach(category => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  const getCategoryName = (id?: string | number): string => {
    if (id === undefined || id === null) return 'Brak kategorii';
    return categoryMap.get(id) || `Kategoria ID: ${id}`;
  };

  if (!task) {
    return null; // Don't render if no task is provided
  }

  const categoryName = getCategoryName(task.id_category);
  const formattedDueDate = task.dueDate 
    ? format(new Date(task.dueDate), 'PPP', { locale: pl }) // Format like '4 września 2026'
    : 'Brak terminu';

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      {/* Added h-[95vh] sm:h-auto for mobile full height */}
      <DialogContent className="sm:max-w-md h-[100vh] sm:h-auto overflow-y-auto"> 
        <DialogHeader>
          <DialogTitle>Szczegóły zadania</DialogTitle>
          {/* Added DialogDescription for accessibility */}
          <DialogDescription>
            Szczegółowe informacje o wybranym zadaniu.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 px-4 py-6">
          {/* Title */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Tytuł</Label>
            <p className="text-lg font-semibold text-gray-900">{task.title}</p>
          </div>

          {/* Category */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Kategoria</Label>
            <p className="text-base text-gray-700">{categoryName}</p>
          </div>

          {/* Due Date */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Termin</Label>
            <p className="text-base text-gray-700">{formattedDueDate}</p>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-medium text-gray-500">Notatki</Label>
            {task.notes && task.notes.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 mt-1">
                {task.notes.map((note, index) => (
                  <li key={index} className="text-base text-gray-700 bg-gray-50 p-2 rounded">
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-gray-500 italic mt-1">Brak notatek</p>
            )}
          </div>

          {/* Status */}
           {/* Changed <p> to <div> to fix nesting warning */}
           <div>
            <Label className="text-sm font-medium text-gray-500">Status</Label>
             <div> 
                <Badge variant={task.completed ? "secondary" : "outline"}>
                    {task.completed ? 'Ukończone' : 'Do zrobienia'}
                </Badge>
             </div>
          </div>

        </div>
        
        <DialogFooter className="sm:justify-end px-4 pb-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Zamknij
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailView;
