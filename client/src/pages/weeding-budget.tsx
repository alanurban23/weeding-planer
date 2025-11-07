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
  const paidDate = cost.paid_date ? new Date(cost.paid_date) : null;
  const totalAmount = cost.total_amount || cost.value;
  const paidAmount = paidDate ? cost.value : 0;
  const isPartiallyPaid = totalAmount > paidAmount && paidAmount > 0;

  if (paidDate) {
    if (isPartiallyPaid) {
      return { label: 'Częściowo zapłacone', variant: 'secondary' as const };
    }
    return { label: 'Zapłacone', variant: 'default' as const };
  }

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
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Daty</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((cost) => {
                    const status = getPaymentStatus(cost);
                    const totalAmount = cost.total_amount || cost.value;
                    const isPartial = cost.total_amount && cost.total_amount > cost.value;

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
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {cost.value.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                            </p>
                            {isPartial && (
                              <p className="text-xs text-muted-foreground">
                                z {totalAmount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                              </p>
                            )}
                          </div>
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
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingCost(cost)}
                              title="Edytuj koszt"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingCostId(cost.id)}
                              title="Usuń koszt"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
