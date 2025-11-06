import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BudgetTracker from '@/components/budget-tracker';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface Cost {
  id: number;
  name: string;
  value: number;
  created_at: string;
  category_id: number | null;
  category_name?: string | null;
}

interface Category {
  id: number;
  name: string;
}

const WeedingBudgetPage: React.FC = () => {
  const { data: costs = [], isLoading: isLoadingCosts } = useQuery<Cost[]>({
    queryKey: ['/api/costs'],
    queryFn: () => apiRequest('/api/costs'),
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories'),
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
                    <TableHead>Data dodania</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell>{cost.name}</TableCell>
                      <TableCell>{cost.value.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</TableCell>
                      <TableCell>{new Date(cost.created_at).toLocaleDateString('pl-PL')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WeedingBudgetPage;
