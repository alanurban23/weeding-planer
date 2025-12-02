import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Cost {
  id: number;
  name: string;
  value: number; // Kwota zapłacona lub do zapłaty
  created_at: string;
  category_id: number | null;
  category_name?: string | null;
  total_amount?: number | null; // Całkowita kwota (jeśli value to tylko część)
  due_date?: string | null; // Termin płatności
  paid_date?: string | null; // Data zapłaty
  notes?: string | null; // Notatki
  amount_paid?: number; // Suma płatności z historii
  payment_status?: 'unpaid' | 'partial' | 'paid'; // Status płatności
}

interface Category {
  id: number;
  name: string;
}

// Define a fixed total budget (can be made dynamic later)
const TOTAL_BUDGET = 80000; // Updated budget

const BudgetTracker: React.FC = () => {
  const { toast } = useToast();
  const [costName, setCostName] = useState('');
  const [costValue, setCostValue] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('none');
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch costs
  const { data: costs = [], isLoading: isLoadingCosts } = useQuery<Cost[]>({
    queryKey: ['/api/costs'],
    queryFn: () => apiRequest('/api/costs'),
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories'),
  });

  // Add cost mutation
  const addCostMutation = useMutation({
    mutationFn: (newCost: {
      name: string;
      value: number;
      category_id: number | null;
      total_amount?: number | null;
      due_date?: string | null;
      paid_date?: string | null;
      notes?: string | null;
    }) => apiRequest('/api/costs', 'POST', newCost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/costs'] });
      setCostName('');
      setCostValue('');
      setSelectedCategoryId('none');
      setTotalAmount('');
      setDueDate('');
      setPaidDate('');
      setNotes('');
      toast({
        title: "Koszt dodany",
        description: "Nowy koszt został pomyślnie dodany.",
      });
    },
    onError: (error) => {
      toast({
        title: "Błąd",
        description: `Nie udało się dodać kosztu: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = parseFloat(costValue);
    if (!costName.trim() || isNaN(numericValue) || numericValue <= 0) {
      toast({
        title: "Błąd walidacji",
        description: "Wprowadź poprawną nazwę i dodatnią wartość kosztu.",
        variant: "destructive",
      });
      return;
    }

    const numericTotalAmount = totalAmount ? parseFloat(totalAmount) : null;
    if (numericTotalAmount !== null && (isNaN(numericTotalAmount) || numericTotalAmount < numericValue)) {
      toast({
        title: "Błąd walidacji",
        description: "Całkowita kwota musi być większa lub równa kwocie zapłaconej.",
        variant: "destructive",
      });
      return;
    }

    const categoryId = selectedCategoryId && selectedCategoryId !== 'none' ? parseInt(selectedCategoryId, 10) : null;
    if (selectedCategoryId && selectedCategoryId !== 'none' && Number.isNaN(categoryId)) {
      toast({
        title: "Błąd walidacji",
        description: "Wybierz poprawną kategorię.",
        variant: "destructive",
      });
      return;
    }

    addCostMutation.mutate({
      name: costName.trim(),
      value: numericValue,
      category_id: categoryId,
      total_amount: numericTotalAmount,
      due_date: dueDate || null,
      paid_date: paidDate || null,
      notes: notes.trim() || null,
    });
  };

  // Calculate total spent
  const totalSpent = useMemo(() => {
    return costs.reduce((sum, cost) => sum + cost.value, 0);
  }, [costs]);

  const remainingBudget = TOTAL_BUDGET - totalSpent;

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, { categoryId: number | null; name: string; total: number }>();
    costs.forEach((cost) => {
      const categoryId = cost.category_id ?? null;
      const mapKey = categoryId === null ? 'uncategorized' : String(categoryId);
      const name = cost.category_name ?? (categoryId !== null ? categoryMap.get(categoryId) ?? `Kategoria #${categoryId}` : 'Bez kategorii');
      const entry = totals.get(mapKey) ?? { categoryId, name: name ?? 'Bez kategorii', total: 0 };
      entry.total += cost.value;
      totals.set(mapKey, entry);
    });
    return Array.from(totals.values()).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [costs, categoryMap]);

  // Generate distinct colors for costs (simple approach)
  const generateColor = (index: number, total: number): string => {
    const hue = (index * (360 / (total + 1))) % 360; // Distribute hues, +1 for remaining
    return `hsl(${hue}, 70%, 60%)`; // Adjust saturation/lightness as needed
  };

  // Prepare data for the pie chart - individual costs + remaining
  const chartData = useMemo(() => {
    const costSlices = categoryTotals.map((category, index) => ({
      name: category.name,
      value: category.total,
      fill: generateColor(index, categoryTotals.length),
    }));
    // Add remaining budget slice
    costSlices.push({
      name: 'Pozostało',
      value: Math.max(0, remainingBudget),
      fill: "hsl(var(--muted))", // Use a muted color for remaining
    });
    return costSlices;
  }, [categoryTotals, remainingBudget]);

  // Update chartConfig dynamically based on costs
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    categoryTotals.forEach((category, index) => {
      config[category.name] = {
        label: category.name,
        color: generateColor(index, categoryTotals.length),
      };
    });
    config.Pozostało = { // Add config for remaining
      label: "Pozostało",
      color: "hsl(var(--muted))",
    };
    return config;
  }, [categoryTotals]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Budżet Weselny</CardTitle>
        <CardDescription>
          Całkowity budżet: {TOTAL_BUDGET.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row gap-6">
        {/* Chart Section */}
        <div className="flex-1 flex flex-col items-center">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[350px] md:h-[400px]">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    indicator="dot"
                    // Updated formatter to access payload name directly
                    formatter={(value, _name, item) => {
                      const numericValue = typeof value === 'number' ? value : Number(value) || 0;
                      const percentage = TOTAL_BUDGET > 0 ? ((numericValue / TOTAL_BUDGET) * 100).toFixed(1) : 0;
                      const displayName = item?.payload?.name || _name; // Get name from payload
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {displayName}: {numericValue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({percentage}% całości)
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
                label={!isMobile ? (entry) => {
                  const percentage = TOTAL_BUDGET > 0 ? ((entry.value / TOTAL_BUDGET) * 100).toFixed(0) : 0;
                  return `${entry.name} (${percentage}%)`;
                } : false}
                labelLine={!isMobile ? {
                  stroke: 'hsl(var(--muted-foreground))',
                  strokeWidth: 1.5
                } : false}
              >
                 {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="text-center mt-2">
            <p className="text-lg font-medium">
              Wydano: {totalSpent.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
            </p>
            <p className="text-sm text-muted-foreground">
              Pozostało: {remainingBudget.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
            </p>
          </div>
          <div className="mt-4 w-full">
            <h4 className="text-sm font-semibold mb-2">Wydatki według kategorii</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {categoryTotals.map((category, index) => {
                const categoryColor = generateColor(index, categoryTotals.length);
                const percentage = TOTAL_BUDGET > 0 ? ((category.total / TOTAL_BUDGET) * 100).toFixed(1) : 0;
                return (
                  <li key={category.categoryId ?? 'uncategorized'} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: categoryColor }}
                      />
                      <span className="truncate">{category.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">({percentage}%)</span>
                    </div>
                    <span className="font-medium text-foreground flex-shrink-0">
                      {category.total.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                    </span>
                  </li>
                );
              })}
              {categoryTotals.length === 0 && !isLoadingCosts && (
                <li className="text-center text-xs text-muted-foreground">Brak wydatków do wyświetlenia.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Add Cost Form Section */}
        <div className="flex-1 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6">
          <h3 className="text-lg font-medium mb-4">Dodaj nowy koszt</h3>
          <form onSubmit={handleAddCost} className="space-y-4">
            <div>
              <Label htmlFor="costName">Nazwa kosztu *</Label>
              <Input
                id="costName"
                type="text"
                value={costName}
                onChange={(e) => setCostName(e.target.value)}
                placeholder="np. Kaucja za salę weselną"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="costValue">Kwota zapłacona/do zapłaty (PLN) *</Label>
                <Input
                  id="costValue"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={costValue}
                  onChange={(e) => setCostValue(e.target.value)}
                  placeholder="np. 3500"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Może być kaucją lub częścią płatności
                </p>
              </div>

              <div>
                <Label htmlFor="costTotal">Całkowita kwota (PLN)</Label>
                <Input
                  id="costTotal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="np. 10000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Opcjonalne - jeśli koszt to tylko część
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="costCategory">Kategoria</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={(value) => setSelectedCategoryId(value)}
                disabled={isLoadingCategories}
              >
                <SelectTrigger id="costCategory">
                  <SelectValue placeholder={isLoadingCategories ? 'Ładowanie kategorii...' : 'Wybierz kategorię (opcjonalnie)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Bez kategorii</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="costDueDate">Termin płatności</Label>
                <Input
                  id="costDueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Kiedy należy zapłacić
                </p>
              </div>

              <div>
                <Label htmlFor="costPaidDate">Data zapłaty</Label>
                <Input
                  id="costPaidDate"
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Kiedy zapłacono
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="costNotes">Notatki</Label>
              <Textarea
                id="costNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dodatkowe informacje o płatności..."
                rows={3}
              />
            </div>

            <Button type="submit" disabled={addCostMutation.isPending}>
              {addCostMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Dodaj koszt
            </Button>
          </form>
        </div>
      </CardContent>
      {/* Optional Footer for displaying list of costs or other info */}
      {/* <CardFooter>
        <p>List of costs could go here...</p>
      </CardFooter> */}
    </Card>
  );
};

export default BudgetTracker;
