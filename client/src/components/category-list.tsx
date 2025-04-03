import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task } from '@shared/schema';
import { Progress } from '@/components/ui/progress';
import { Loader2, FolderX, Trash2, Edit, Check, X, ChevronRight } from 'lucide-react';
import { updateCategory, deleteCategory } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

interface Category {
  id: number;
  name: string;
}

interface CategoryListProps {
  categories: Array<Category | any>;
  tasks: Task[];
  isLoading: boolean;
  onManageCategories: () => void;
  onCategoryUpdate: () => void;
}

interface CategoryStats {
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
}

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  tasks,
  isLoading,
  onManageCategories,
  onCategoryUpdate,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editedName, setEditedName] = useState('');

  const validCategories = useMemo(() => {
    if (!Array.isArray(categories)) {
      console.warn('CategoryList: Received non-array for categories:', categories);
      return [];
    }
    return categories.filter(
      (cat): cat is Category =>
        cat != null &&
        typeof cat === 'object' &&
        typeof cat.name === 'string' && cat.name.trim() !== '' &&
        typeof cat.id === 'number' &&
        !isNaN(cat.id)
    );
  }, [categories]);

  const categoryStatsMap = useMemo(() => {
    const statsMap = new Map<number, CategoryStats>();
    if (!Array.isArray(tasks)) {
      console.warn('CategoryList: Received non-array for tasks:', tasks);
      return statsMap;
    }
    validCategories.forEach((category) => {
      const categoryTasks = tasks.filter((task) => task.category === category.name);
      const totalTasks = categoryTasks.length;
      const completedTasks = categoryTasks.filter((task) => task.completed).length;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      statsMap.set(category.id, {
        totalTasks,
        completedTasks,
        completionPercentage,
      });
    });
    return statsMap;
  }, [validCategories, tasks]);

  const handleEditClick = (e: React.MouseEvent, category: Category) => {
    e.stopPropagation();
    setEditingCategoryId(category.id);
    setEditedName(category.name);
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCategoryId(null);
    setEditedName('');
  };

  const handleSaveEdit = async (e: React.MouseEvent, categoryId: number) => {
    e.stopPropagation();
    if (!editedName.trim()) {
      toast({ title: "Błąd", description: "Nazwa kategorii nie może być pusta.", variant: "destructive" });
      return;
    }
    try {
      await updateCategory(String(categoryId), editedName.trim());
      toast({ title: "Sukces", description: "Nazwa kategorii została zaktualizowana." });
      setEditingCategoryId(null);
      setEditedName('');
      onCategoryUpdate();
    } catch (error) {
      console.error("Failed to update category:", error);
      toast({ title: "Błąd", description: `Nie udało się zaktualizować kategorii: ${error instanceof Error ? error.message : 'Nieznany błąd'}`, variant: "destructive" });
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent | null, categoryId: number, categoryName: string) => {
    e?.stopPropagation();
    if (!confirm(`Czy na pewno chcesz usunąć kategorię "${categoryName}"? Może to wpłynąć na powiązane notatki/zadania.`)) {
        return;
    }
    try {
        await deleteCategory(String(categoryId));
        toast({ title: "Sukces", description: `Kategoria "${categoryName}" została usunięta.` });
        onCategoryUpdate();
    } catch (error) {
        console.error("Failed to delete category:", error);
        toast({ title: "Błąd", description: `Nie udało się usunąć kategorii: ${error instanceof Error ? error.message : 'Nieznany błąd'}`, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto" />
        <p className="mt-4 text-gray-600">Ładowanie kategorii...</p>
      </div>
    );
  }

  if (validCategories.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <FolderX className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Brak kategorii</h3>
        <p className="mt-1 text-sm text-gray-500">Nie znaleziono żadnych kategorii.</p>
        <div className="mt-6">
          <Button onClick={onManageCategories}>Zarządzaj kategoriami</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {validCategories.map((category) => {
        const isEditing = editingCategoryId === category.id;
        const stats = categoryStatsMap.get(category.id) ?? { totalTasks: 0, completedTasks: 0, completionPercentage: 0 };

        return (
          <div
            key={category.id}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 transition-all group w-full ${isEditing ? 'border-primary ring-1 ring-primary' : 'hover:border-primary hover:shadow-md cursor-pointer'}`}
            onClick={isEditing ? undefined : () => navigate(`/category/${category.id}`)}
            role={isEditing ? undefined : "link"}
            aria-label={isEditing ? `Edytowanie kategorii ${category.name}` : `Przejdź do kategorii ${category.name}`}
          >
            <div className="flex justify-between items-start mb-2">
              {isEditing ? (
                <div className="flex-grow mr-2">
                  <Input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-xl font-semibold h-9"
                    aria-label="Nowa nazwa kategorii"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(e as any, category.id);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                </div>
              ) : (
                <h2 className="text-xl font-semibold text-gray-800 truncate pr-2 flex-grow">
                  {category.name}
                </h2>
              )}
              <div className="flex items-center space-x-1 flex-shrink-0">
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-100 h-8 w-8" onClick={(e) => handleSaveEdit(e, category.id)} title="Zapisz zmiany" aria-label="Zapisz zmiany nazwy kategorii">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 h-8 w-8" onClick={handleCancelEdit} title="Anuluj edycję" aria-label="Anuluj edycję nazwy kategorii">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-100 h-8 w-8" onClick={(e) => handleEditClick(e, category)} title={`Edytuj kategorię ${category.name}`} aria-label={`Edytuj kategorię ${category.name}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={(e) => handleDeleteClick(e, category.id, category.name)} title={`Usuń kategorię ${category.name}`} aria-label={`Usuń kategorię ${category.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" aria-hidden="true" />
                  </>
                )}
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{stats.completedTasks} z {stats.totalTasks} ukończonych</span>
                <span>{stats.completionPercentage}%</span>
              </div>
              <Progress value={stats.completionPercentage} className="h-2" />
            </div>
          </div>
        );
      })}
      <div className="pt-4 text-center">
        <Button variant="outline" onClick={onManageCategories}>
          Zarządzaj kategoriami
        </Button>
      </div>
    </div>
  );
};

export default CategoryList;
