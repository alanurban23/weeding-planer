import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator, // Import separator if needed
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, FileText, FolderPlus } from 'lucide-react';

interface GlobalFabProps {
  onAddTask: () => void;
  onAddNote: () => void;
  onManageCategories: () => void;
  onDeleteCategory?: () => void; // Make optional, as it's context-dependent
  showDeleteCategory?: boolean; // Control visibility explicitly
}

export const GlobalFab: React.FC<GlobalFabProps> = ({
  onAddTask,
  onAddNote,
  onManageCategories,
  onDeleteCategory,
  showDeleteCategory = false, // Default to false
}) => {
  return (
    <div className="fixed bottom-16 right-6 z-50 md:hidden"> {/* Show only on mobile (md:hidden) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="rounded-full w-14 h-14 shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
            aria-label="Dodaj nowy element"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          sideOffset={8}
          className="w-60 mb-2 p-2" // Adjusted width and padding
        >
          <DropdownMenuItem onSelect={onAddTask} className="cursor-pointer p-3 text-base">
            <Plus className="mr-3 h-5 w-5" />
            <span>Dodaj zadanie</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddNote} className="cursor-pointer p-3 text-base">
            <FileText className="mr-3 h-5 w-5" />
            <span>Dodaj notatkę</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onManageCategories} className="cursor-pointer p-3 text-base">
            <FolderPlus className="mr-3 h-5 w-5" />
            <span>Dodaj/Zarządzaj kategorią</span>
          </DropdownMenuItem>
          {showDeleteCategory && onDeleteCategory && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onDeleteCategory}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 p-3 text-base"
              >
                <Trash2 className="mr-3 h-5 w-5" />
                <span>Usuń bieżącą kategorię</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
