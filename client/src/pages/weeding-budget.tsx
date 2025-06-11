import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface Cost {
  id: number;
  name: string;
  value: number;
  created_at: string;
}

const WeedingBudgetPage: React.FC = () => {
  const { data: costs = [] } = useQuery<Cost[]>({
    queryKey: ['/api/costs'],
    queryFn: () => apiRequest('/api/costs'),
  });

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Budżet Weselny</CardTitle>
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
              {costs.map((cost) => (
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
    </div>
  );
};

export default WeedingBudgetPage;
