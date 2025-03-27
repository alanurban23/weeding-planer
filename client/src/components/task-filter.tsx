import React from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
} from "@/components/ui/select";

interface TaskFilterProps {
  className?: string;
  filters: {
    status: string;
    category: string;
    search: string;
    sort: string;
  };
  categories: string[];
  onFilterChange: (filters: Partial<{
    status: string;
    category: string;
    search: string;
    sort: string;
  }>) => void;
}

const TaskFilter: React.FC<TaskFilterProps> = ({
  className,
  filters,
  categories,
  onFilterChange,
}) => {
  return (
    <aside className={className}>
      <nav className="space-y-6 sticky top-6">
        {/* Search */}
        <div>
          <label htmlFor="search" className="sr-only">Szukaj zadania</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <Input
              id="search"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              className="block w-full pl-10 text-sm"
              placeholder="Szukaj zadania"
              type="search"
            />
          </div>
        </div>

        {/* Filter by status */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Status</h3>
          <RadioGroup 
            value={filters.status} 
            onValueChange={(value) => onFilterChange({ status: value })}
            className="space-y-2"
          >
            <div className="flex items-center">
              <RadioGroupItem value="all" id="filter-all" />
              <Label htmlFor="filter-all" className="ml-3 text-sm text-gray-700">Wszystkie</Label>
            </div>
            <div className="flex items-center">
              <RadioGroupItem value="active" id="filter-active" />
              <Label htmlFor="filter-active" className="ml-3 text-sm text-gray-700">Aktywne</Label>
            </div>
            <div className="flex items-center">
              <RadioGroupItem value="completed" id="filter-completed" />
              <Label htmlFor="filter-completed" className="ml-3 text-sm text-gray-700">Zakończone</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Sort options */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Sortowanie</h3>
          <Select 
            value={filters.sort} 
            onValueChange={(value) => onFilterChange({ sort: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Wybierz sortowanie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Tytuł (A-Z)</SelectItem>
              <SelectItem value="dueDate">Termin</SelectItem>
              <SelectItem value="category">Kategoria</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Kategorie</h3>
          <RadioGroup 
            value={filters.category} 
            onValueChange={(value) => onFilterChange({ category: value })}
            className="space-y-2"
          >
            <div className="flex items-center">
              <RadioGroupItem value="" id="category-all" />
              <Label htmlFor="category-all" className="ml-3 text-sm text-gray-700">Wszystkie kategorie</Label>
            </div>
            {categories.map((category) => (
              <div key={category} className="flex items-center">
                <RadioGroupItem 
                  value={category} 
                  id={`category-${category.replace(/\s+/g, '-').toLowerCase()}`} 
                />
                <Label 
                  htmlFor={`category-${category.replace(/\s+/g, '-').toLowerCase()}`} 
                  className="ml-3 text-sm text-gray-700"
                >
                  {category}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </nav>
    </aside>
  );
};

export default TaskFilter;
