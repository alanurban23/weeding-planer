import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Cost {
  id: number;
  name: string;
  value: number;
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

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate('/weeding-budget')}
    >
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
      </CardContent>
    </Card>
  );
};

export default BudgetWidget;
