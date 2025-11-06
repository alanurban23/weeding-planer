import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Cost {
  id: number;
  name: string;
  value: number;
  created_at: string;
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

  return (
    <Card className="transition-shadow">
      <CardHeader>
        <CardTitle>Budżet Weselny</CardTitle>
        <CardDescription>
          Całkowity budżet: {TOTAL_BUDGET.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-medium">
          Wydano: {totalSpent.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
        </p>
        <p className="text-sm text-muted-foreground">
          Pozostało: {remaining.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
        </p>
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
