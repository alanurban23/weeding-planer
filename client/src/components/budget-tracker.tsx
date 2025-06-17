import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"; // Added ChartConfig
import { PieChart, Pie, Cell, Tooltip } from "recharts"; // Import PieChart elements
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Cost {
  id: number;
  name: string;
  value: number; // API returns number now
  created_at: string;
}

// Define a fixed total budget (can be made dynamic later)
const TOTAL_BUDGET = 80000; // Updated budget

const BudgetTracker: React.FC = () => {
  const { toast } = useToast();
  const [costName, setCostName] = useState('');
  const [costValue, setCostValue] = useState('');

  // Fetch costs
  const { data: costs = [], isLoading: isLoadingCosts } = useQuery<Cost[]>({
    queryKey: ['/api/costs'],
    queryFn: () => apiRequest('/api/costs'),
  });

  // Add cost mutation
  const addCostMutation = useMutation({
    mutationFn: (newCost: { name: string; value: number }) =>
      apiRequest('/api/costs', 'POST', newCost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/costs'] });
      setCostName('');
      setCostValue('');
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
    addCostMutation.mutate({ name: costName.trim(), value: numericValue });
  };

  // Calculate total spent
  const totalSpent = useMemo(() => {
    return costs.reduce((sum, cost) => sum + cost.value, 0);
  }, [costs]);

  const remainingBudget = TOTAL_BUDGET - totalSpent;

  // Generate distinct colors for costs (simple approach)
  const generateColor = (index: number, total: number): string => {
    const hue = (index * (360 / (total + 1))) % 360; // Distribute hues, +1 for remaining
    return `hsl(${hue}, 70%, 60%)`; // Adjust saturation/lightness as needed
  };

  // Prepare data for the pie chart - individual costs + remaining
  const chartData = useMemo(() => {
    const costSlices = costs.map((cost, index) => ({
      name: cost.name, // Use individual cost name
      value: cost.value,
      fill: generateColor(index, costs.length),
    }));
    // Add remaining budget slice
    costSlices.push({
      name: 'Pozostało',
      value: Math.max(0, remainingBudget),
      fill: "hsl(var(--muted))", // Use a muted color for remaining
    });
    return costSlices;
  }, [costs, remainingBudget]);

  // Update chartConfig dynamically based on costs
   const chartConfig = useMemo(() => {
     const config: ChartConfig = {};
     costs.forEach((cost, index) => {
       config[cost.name] = { // Use cost name as key
         label: cost.name,
         color: generateColor(index, costs.length),
       };
     });
     config.Pozostało = { // Add config for remaining
       label: "Pozostało",
       color: "hsl(var(--muted))",
     };
     return config;
   }, [costs]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Budżet Weselny
          <Link to="/weeding-budget" className="text-muted-foreground hover:text-primary" aria-label="Przejdź do pełnego budżetu">
            <ExternalLink className="w-4 h-4" />
          </Link>
        </CardTitle>
        <CardDescription>
          Całkowity budżet: {TOTAL_BUDGET.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row gap-6">
        {/* Chart Section */}
        <div className="flex-1 flex flex-col items-center">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
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
        </div>

        {/* Add Cost Form Section */}
        <div className="flex-1 border-t md:border-t-0 md:border-l pt-6 md:pt-0 md:pl-6">
          <h3 className="text-lg font-medium mb-4">Dodaj nowy koszt</h3>
          <form onSubmit={handleAddCost} className="space-y-4">
            <div>
              <Label htmlFor="costName">Nazwa kosztu</Label>
              <Input
                id="costName"
                type="text"
                value={costName}
                onChange={(e) => setCostName(e.target.value)}
                placeholder="np. Sala weselna"
                required
              />
            </div>
            <div>
              <Label htmlFor="costValue">Wartość (PLN)</Label>
              <Input
                id="costValue"
                type="number"
                step="0.01"
                min="0.01"
                value={costValue}
                onChange={(e) => setCostValue(e.target.value)}
                placeholder="np. 15000"
                required
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
