import React, { useState, useEffect } from 'react';
import { Task } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { formatDateForInput } from '@/lib/date-utils';

export type EditingTask = {
  id: string;
  title: string;
  category?: string | number;
  id_category?: number;
  notes: string[];
  dueDate: string | Date | null;
  completed?: boolean; // Added back as optional to prevent errors
};

interface Category {
  id: string | number;
  name: string;
}

interface TaskFormProps {
  show: boolean;
  onClose: () => void;
  onSave: (task: EditingTask) => void;
  task: Task | null;
  categories: Array<Category>;
  onCreateFromNote?: (note: string, category: string | number) => void; // Made optional
}

const TaskForm: React.FC<TaskFormProps> = ({
  show,
  onClose,
  onSave,
  task,
  categories,
  onCreateFromNote,
}) => {
  const [editingTask, setEditingTask] = useState<EditingTask>({
    id: '',
    title: '',
    category: '',
    id_category: undefined,
    notes: [],
    dueDate: null
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newNote, setNewNote] = useState('');

  const categoryMap = React.useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(category => {
      map.set(category.id.toString(), category.name);
    });
    return map;
  }, [categories]);

  const categoryNameToIdMap = React.useMemo(() => {
    const map = new Map<string, string | number>();
    categories.forEach(category => {
      map.set(category.name, category.id);
    });
    return map;
  }, [categories]);

  const getCategoryIdByName = (name: string): string | number => {
    return categoryNameToIdMap.get(name) || name;
  };

  const getCategoryNameById = (id?: string | number): string => {
    if (id === undefined) return '';
    return categoryMap.get(id.toString()) || id.toString();
  };

  useEffect(() => {
    if (task) {
      const categoryName = getCategoryNameById(task.category);
      setEditingTask({
        id: task.id,
        title: task.title,
        category: task.category || '',
        id_category: task.id_category,
        notes: task.notes || [],
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        completed: task.completed // Added back to maintain compatibility
      });
    } else {
      setEditingTask({
        id: '',
        title: '',
        category: '',
        id_category: undefined,
        notes: [],
        dueDate: null
      });
    }
    setIsCustomCategory(false);
    setNewCategory('');
  }, [task]);

  const handleCategoryChange = (value: string) => {
    if (value === 'new') {
      setIsCustomCategory(true);
      setEditingTask(prev => ({ ...prev, category: '', id_category: undefined }));
    } else {
      setIsCustomCategory(false);
      const categoryId = getCategoryIdByName(value);
      setEditingTask(prev => ({ 
        ...prev, 
        category: categoryId, 
        id_category: typeof categoryId === 'number' ? categoryId : undefined 
      }));
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      setEditingTask(prev => ({
        ...prev,
        notes: [...prev.notes, newNote.trim()]
      }));
      setNewNote('');
    }
  };

  const handleRemoveNote = (index: number) => {
    setEditingTask(prev => ({
      ...prev,
      notes: prev.notes.filter((_, i) => i !== index)
    }));
  };

  const handleCreateFromNote = (note: string) => {
    if (onCreateFromNote && note.trim()) {
      const categoryValue = editingTask.id_category !== undefined 
        ? editingTask.id_category 
        : (editingTask.category || '');
      onCreateFromNote(note.trim(), categoryValue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? newCategory : editingTask.category;
    onSave({
      ...editingTask,
      category: finalCategory
    });
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md h-[100vh] sm:h-auto overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edytuj zadanie' : 'Dodaj nowe zadanie'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-4 px-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-base font-medium text-gray-700">
              Tytuł *
            </Label>
            <Input
              id="task-title"
              value={editingTask.title}
              onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Np. Zarezerwować salę weselną"
              className="text-lg sm:text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-category" className="text-base font-medium text-gray-700">
              Kategoria *
            </Label>
            <Select
              value={isCustomCategory ? 'new' : getCategoryNameById(editingTask.category)}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="text-base py-6 sm:py-2">
                <SelectValue placeholder="Wybierz kategorię" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category, index) => (
                  <SelectItem key={index} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Dodaj nową kategorię</SelectItem>
              </SelectContent>
            </Select>

            {isCustomCategory && (
              <div className="mt-2">
                <Label htmlFor="new-category" className="text-base font-medium text-gray-700">
                  Nowa kategoria
                </Label>
                <Input
                  id="new-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nazwa nowej kategorii"
                  className="text-base"
                  required={isCustomCategory}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due-date" className="text-base font-medium text-gray-700">
              Termin
            </Label>
            <Input
              id="task-due-date"
              type="date"
              className="text-base py-2"
              value={editingTask.dueDate ? formatDateForInput(editingTask.dueDate as Date) : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                setEditingTask(prev => ({ ...prev, dueDate: date }));
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-medium text-gray-700">
              Notatki
            </Label>
            <div className="space-y-2">
              {editingTask.notes.map((note, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-1 bg-gray-50 p-2 rounded text-base">{note}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveNote(index)}
                    className="ml-2 text-lg"
                  >
                    ×
                  </Button>
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Dodaj notatkę"
                  className="text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="text-base h-11"
                >
                  Dodaj notatkę
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="text-base">
              Anuluj
            </Button>
            <Button type="submit" className="text-base">
              {task ? 'Zapisz zmiany' : 'Dodaj zadanie'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskForm;
