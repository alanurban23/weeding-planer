import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BudgetTracker from '@/components/budget-tracker';
import EditCostDialog from '@/components/edit-cost-dialog';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, Trash2, Calendar, CalendarCheck } from 'lucide-react';

interface Cost {
  id: number;
  name: string;
  value: number;
  created_at: string;
  category_id: number | null;
  category_name?: string | null;
  total_amount?: number | null;
  due_date?: string | null;
  paid_date?: string | null;
  notes?: string | null;
  amount_paid?: number;
  payment_status?: 'unpaid' | 'partial' | 'paid';
}

interface Category {
  id: number;
  name: string;
}

// Helper function to get payment status
const getPaymentStatus = (cost: Cost) => {
  const now = new Date();
  const dueDate = cost.due_date ? new Date(cost.due_date) : null;
  const totalAmount = cost.total_amount || cost.value;
  const paidAmount = cost.amount_paid || 0;
  const remaining = totalAmount - paidAmount;

  // Check if fully paid
  if (remaining <= 0 && paidAmount > 0) {
    return { label: 'Opłacone', variant: 'default' as const };
  }

  // Check if partially paid
  if (paidAmount > 0 && remaining > 0) {
    return { label: 'Częściowo zapłacone', variant: 'secondary' as const };
  }

  // Not paid - check due date
  if (dueDate) {
    const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      return { label: 'Przeterminowane', variant: 'destructive' as const };
    } else if (daysDiff <= 7) {
      return { label: `Do zapłaty za ${daysDiff} dni`, variant: 'destructive' as const };
    } else if (daysDiff <= 14) {
      return { label: `Do zapłaty za ${daysDiff} dni`, variant: 'secondary' as const };
    } else {
      return { label: `Do zapłaty za ${daysDiff} dni`, variant: 'outline' as const };
    }
  }

  return { label: 'Oczekuje', variant: 'outline' as const };
};

const WeedingBudgetPage: React.FC = () => {
  const { toast } = useToast();
  const [editingCost, setEditingCost] = useState<Cost | null>(null);
  const [deletingCostId, setDeletingCostId] = useState<number | null>(null);

  const { data: costs = [], isLoading: isLoadingCosts } = useQuery<Cost[]>({
    queryKey: ['/api/costs'],
    queryFn: () => apiRequest('/api/costs'),
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories'),
  });

  const deleteCostMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/costs/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/costs'] });
      toast({
        title: 'Koszt usunięty',
        description: 'Koszt został pomyślnie usunięty.',
      });
      setDeletingCostId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Błąd',
        description: `Nie udało się usunąć kosztu: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  const groupedCosts = useMemo(() => {
    const byCategory = new Map<string, { name: string; categoryId: number | null; items: Cost[]; total: number }>();
    costs.forEach((cost) => {
      const categoryId = cost.category_id ?? null;
      const key = categoryId === null ? 'uncategorized' : String(categoryId);
      const name = cost.category_name ?? (categoryId !== null ? categoryMap.get(categoryId) ?? `Kategoria #${categoryId}` : 'Bez kategorii');
      const entry = byCategory.get(key) ?? { name: name ?? 'Bez kategorii', categoryId, items: [], total: 0 };
      entry.items.push(cost);
      entry.total += cost.value;
      byCategory.set(key, entry);
    });
    return Array.from(byCategory.values()).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [costs, categoryMap]);

  const isLoading = isLoadingCosts || isLoadingCategories;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <BudgetTracker />
      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {!isLoading && groupedCosts.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Wydatki</CardTitle>
              <CardDescription>Dodaj pierwszy koszt, aby zobaczyć szczegóły budżetu.</CardDescription>
            </CardHeader>
          </Card>
        )}
        {groupedCosts.map((group) => (
          <Card key={group.categoryId ?? 'uncategorized'}>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
              <CardDescription>
                Łącznie: {group.total.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Kwota</TableHead>
                    <TableHead className="hidden lg:table-cell">Zapłacone</TableHead>
                    <TableHead className="hidden lg:table-cell">Pozostało</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Daty</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((cost) => {
                    const status = getPaymentStatus(cost);
                    const totalAmount = cost.total_amount || cost.value;
                    const amountPaid = cost.amount_paid || 0;
                    const remaining = totalAmount - amountPaid;

                    return (
                      <TableRow key={cost.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{cost.name}</p>
                            {cost.notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {cost.notes}
                              </p>
                            )}
                            {/* Show payment info on mobile */}
                            <div className="lg:hidden mt-2 space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Zapłacone:</span>
                                <span className="font-medium text-green-600">
                                  {amountPaid.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Pozostało:</span>
                                <span className={`font-medium ${remaining > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                  {remaining.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">
                            {totalAmount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                          </p>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="font-medium text-green-600">
                            {amountPaid.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                          </p>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className={`font-medium ${remaining > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            {remaining.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1 text-xs">
                            {cost.paid_date && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <CalendarCheck className="h-3 w-3" />
                                <span>Zapłacono: {new Date(cost.paid_date).toLocaleDateString('pl-PL')}</span>
                              </div>
                            )}
                            {cost.due_date && !cost.paid_date && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>Termin: {new Date(cost.due_date).toLocaleDateString('pl-PL')}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingCost(cost)}
                              title="Edytuj koszt"
                              className="h-8 w-8"
                            >
                              <Pencil className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingCostId(cost.id)}
                              title="Usuń koszt"
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <EditCostDialog
        cost={editingCost}
        open={!!editingCost}
        onOpenChange={(open) => !open && setEditingCost(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCostId} onOpenChange={(open) => !open && setDeletingCostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten koszt?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Koszt zostanie trwale usunięty z bazy danych.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCostId && deleteCostMutation.mutate(deletingCostId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WeedingBudgetPage;
