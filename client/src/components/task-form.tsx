import React, { useState, useEffect } from 'react';
import { Task } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { formatDateForInput } from '@/lib/date-utils';

// Definiujemy typ dla zadania wewnątrz formularza (bez createdAt)
export type EditingTask = {
  id: string;
  title: string;
  category: string;
  notes: string[];
  completed: boolean;
  dueDate: string | Date | null;
};

interface TaskFormProps {
  show: boolean;
  onClose: () => void;
  onSave: (task: EditingTask) => void;
  task: Task | null;
  categories: string[];
  onCreateFromNote?: (note: string, category: string) => void;
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
    notes: [],
    completed: false,
    dueDate: null
  });
  
  const [currentNote, setCurrentNote] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setEditingTask({
        id: task.id,
        title: task.title,
        category: task.category,
        notes: [...task.notes],
        completed: task.completed,
        dueDate: task.dueDate 
      });
      setIsCustomCategory(false);
    } else {
      setEditingTask({
        id: generateId(),
        title: '',
        category: categories.length > 0 ? categories[0] : '',
        notes: [],
        completed: false,
        dueDate: null
      });
    }
    setCurrentNote('');
    setShowNoteForm(false);
    setNewCategory('');
  }, [task, categories, show]);

  // Generate a unique ID for new tasks
  const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Add a new note
  const handleAddNote = () => {
    if (currentNote.trim()) {
      setEditingTask(prev => ({
        ...prev,
        notes: [...prev.notes, currentNote.trim()]
      }));
      setCurrentNote('');
      setShowNoteForm(false);
    }
  };

  // Remove a note
  const handleRemoveNote = (index: number) => {
    setEditingTask(prev => ({
      ...prev,
      notes: prev.notes.filter((_, i) => i !== index)
    }));
  };

  // Handle category change
  const handleCategoryChange = (value: string) => {
    if (value === 'new') {
      setIsCustomCategory(true);
      setNewCategory('');
    } else {
      setIsCustomCategory(false);
      setEditingTask(prev => ({
        ...prev,
        category: value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use new category if selected
    const finalTask = {
      ...editingTask,
      category: isCustomCategory ? newCategory : editingTask.category,
    };
    
    // Validate required fields
    if (!finalTask.title || (!finalTask.category && !isCustomCategory) || (isCustomCategory && !newCategory)) {
      alert('Wypełnij wszystkie wymagane pola');
      return;
    }
    
    onSave(finalTask);
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? 'Edytuj zadanie' : 'Dodaj nowe zadanie'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-sm font-medium text-gray-700">
              Tytuł *
            </Label>
            <Input
              id="task-title"
              value={editingTask.title}
              onChange={(e) => setEditingTask(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Np. Zarezerwować salę weselną"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-category" className="text-sm font-medium text-gray-700">
              Kategoria *
            </Label>
            <Select
              value={isCustomCategory ? 'new' : editingTask.category}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz kategorię" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ Dodaj nową kategorię</SelectItem>
              </SelectContent>
            </Select>

            {isCustomCategory && (
              <div className="mt-2">
                <Label htmlFor="new-category" className="text-sm font-medium text-gray-700">
                  Nowa kategoria
                </Label>
                <Input
                  id="new-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nazwa nowej kategorii"
                  required={isCustomCategory}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due-date" className="text-sm font-medium text-gray-700">
              Termin
            </Label>
            <Input
              id="task-due-date"
              type="date"
              value={editingTask.dueDate ? formatDateForInput(new Date(editingTask.dueDate)) : ''}
              onChange={(e) => setEditingTask(prev => ({ 
                ...prev, 
                dueDate: e.target.value || null
              }))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-gray-700">
                Notatki
              </Label>
              {!showNoteForm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNoteForm(true)}
                >
                  <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Dodaj notatkę
                </Button>
              )}
            </div>

            {showNoteForm && (
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="Np. Zadzwonić i potwierdzić rezerwację"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!currentNote.trim()}
                >
                  Dodaj
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNoteForm(false);
                    setCurrentNote('');
                  }}
                >
                  Anuluj
                </Button>
              </div>
            )}

            <ul className="mt-2 space-y-2">
              {editingTask.notes.map((note, index) => (
                <li 
                  key={index} 
                  className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-md group"
                >
                  <span className="text-sm text-gray-700">{note}</span>
                  <div className="flex space-x-2">
                    {onCreateFromNote && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const category = isCustomCategory ? newCategory : editingTask.category;
                          onCreateFromNote(note, category);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary flex items-center"
                        title="Przekształć na zadanie"
                      >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => handleRemoveNote(index)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="task-completed" 
              checked={editingTask.completed}
              onCheckedChange={(checked) => 
                setEditingTask(prev => ({ ...prev, completed: !!checked }))
              }
            />
            <Label 
              htmlFor="task-completed" 
              className="text-sm text-gray-700"
            >
              Oznacz jako ukończone
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Anuluj
            </Button>
            <Button type="submit">
              Zapisz
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskForm;
