import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Pie, PieChart } from 'recharts';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface Cost {
  id: number;
  name: string;
  value: number;
  created_at: string;
  category_id?: number | null;
  category_name?: string | null;
}

const TOTAL_BUDGET = 80000;

const BudgetWidget: React.FC = () => {
  const navigate = useNavigate();

  const { data: costs = [] } = useQuery<Cost[]>({
    queryKey: ['/api/costs'],
    queryFn: () => apiRequest('/api/costs'),
  });

  const totalSpent = useMemo(() => costs.reduce((sum, c) => sum + c.value, 0), [costs]);
  const remaining = TOTAL_BUDGET - totalSpent;
  const recentCosts = useMemo(() => costs.slice(0, 5), [costs]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, { name: string; total: number }>();
    costs.forEach((cost) => {
      const key = cost.category_id != null ? String(cost.category_id) : 'uncategorized';
      const name = cost.category_name ?? (cost.category_id != null ? `Kategoria #${cost.category_id}` : 'Bez kategorii');
      const current = totals.get(key) ?? { name, total: 0 };
      current.total += cost.value;
      totals.set(key, current);
    });
    return Array.from(totals.values());
  }, [costs]);

  const generateColor = (index: number, total: number): string => {
    const hue = (index * (360 / Math.max(total, 1))) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const chartData = useMemo(() => {
    const slices = categoryTotals.map((category, index) => ({
      name: category.name,
      value: category.total,
      fill: generateColor(index, categoryTotals.length + 1),
    }));
    slices.push({
      name: 'Pozostało',
      value: Math.max(0, remaining),
      fill: 'hsl(var(--muted))',
    });
    return slices;
  }, [categoryTotals, remaining]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    categoryTotals.forEach((category, index) => {
      config[category.name] = {
        label: category.name,
        color: generateColor(index, categoryTotals.length + 1),
      };
    });
    config.Pozostało = {
      label: 'Pozostało',
      color: 'hsl(var(--muted))',
    };
    return config;
  }, [categoryTotals]);

  return (
    <Card className="transition-shadow">
      <CardHeader>
        <CardTitle>Budżet Weselny</CardTitle>
        <CardDescription>
          Całkowity budżet: {TOTAL_BUDGET.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[180px]">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    indicator="dot"
                    formatter={(value, _name, item) => {
                      const numericValue = typeof value === 'number' ? value : Number(value) || 0;
                      const percentage = TOTAL_BUDGET > 0 ? ((numericValue / TOTAL_BUDGET) * 100).toFixed(1) : '0';
                      const displayName = item?.payload?.name || _name;
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {displayName}: {numericValue.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                          </span>
                          <span className="text-xs text-muted-foreground">({percentage}% całości)</span>
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
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                strokeWidth={0}
              />
            </PieChart>
          </ChartContainer>
          <div className="text-center">
            <p className="text-lg font-medium">
              Wydano: {totalSpent.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
            </p>
            <p className="text-sm text-muted-foreground">
              Pozostało: {remaining.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Ostatnie wydatki
          </h3>
          {recentCosts.length > 0 ? (
            <ul className="space-y-3">
              {recentCosts.map((cost) => (
                <li
                  key={cost.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{cost.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(cost.created_at).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {cost.value.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Brak zapisanych wydatków.</p>
          )}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => navigate('/weeding-budget')}>Więcej</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetWidget;
