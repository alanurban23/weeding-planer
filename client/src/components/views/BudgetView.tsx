import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Plus, DollarSign, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  amount_paid?: number;
  payment_status?: 'unpaid' | 'partial' | 'paid';
}

interface Category {
  id: number;
  name: string;
}

const TOTAL_BUDGET = 80000;

const BudgetView: React.FC = () => {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch costs
  const { data: costs = [], isLoading: isLoadingCosts } = useQuery<Cost[]>({
    queryKey: ['/api/costs'],
    queryFn: () => apiRequest('/api/costs'),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories'),
  });

  // Calculate budget stats
  const budgetStats = useMemo(() => {
    const totalSpent = costs.reduce((sum, cost) => sum + (cost.amount_paid || cost.value), 0);
    const remaining = TOTAL_BUDGET - totalSpent;
    const percentage = Math.round((totalSpent / TOTAL_BUDGET) * 100);
    return { totalSpent, remaining, percentage };
  }, [costs]);

  // Data for donut chart
  const chartData = useMemo(() => {
    return [
      { name: 'Wydano', value: budgetStats.totalSpent, color: '#6366f1' },
      { name: 'Pozostało', value: budgetStats.remaining, color: '#e7e5e4' },
    ];
  }, [budgetStats]);

  // Get recent costs
  const recentCosts = useMemo(() => {
    return [...costs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [costs]);

  // Group costs by category
  const costsByCategory = useMemo(() => {
    const grouped = new Map<string, { name: string; total: number; items: Cost[] }>();

    costs.forEach((cost) => {
      const categoryName = cost.category_name || 'Bez kategorii';
      const existing = grouped.get(categoryName) || { name: categoryName, total: 0, items: [] };
      existing.total += cost.amount_paid || cost.value;
      existing.items.push(cost);
      grouped.set(categoryName, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [costs]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pl-PL');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <motion.div
      className="px-6 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="mb-6" variants={itemVariants}>
        <h2 className="font-serif text-3xl text-stone-900 mb-1">Budżet Weselny</h2>
        <p className="text-sm text-stone-500">Zarządzaj wydatkami i kontroluj koszty.</p>
      </motion.div>

      {/* Main Budget Card */}
      <motion.div
        variants={itemVariants}
        className="premium-card p-6 mb-6"
      >
        <span className="section-header">Całkowity budżet</span>
        <p className="font-serif text-4xl text-stone-900 mb-4">
          {formatCurrency(TOTAL_BUDGET)} zł
        </p>

        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs uppercase tracking-wider text-stone-400">Wydano</span>
            <p className="font-serif text-xl text-rose-500">
              {formatCurrency(budgetStats.totalSpent)} zł
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase tracking-wider text-stone-400">Pozostało</span>
            <p className="font-serif text-xl text-emerald-600">
              {formatCurrency(budgetStats.remaining)} zł
            </p>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="donut-container h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="font-serif text-3xl text-stone-900">{budgetStats.percentage}%</p>
              <p className="text-xs text-stone-400">wydano</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Costs Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-stone-800">Ostatnie wydatki</h3>
          <button className="text-sm font-medium text-gold-600 uppercase tracking-wide">
            Zobacz wszystkie
          </button>
        </div>

        {isLoadingCosts ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl animate-pulse">
                <div className="w-10 h-10 bg-stone-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-stone-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-stone-100 rounded w-1/3" />
                </div>
                <div className="h-5 bg-stone-200 rounded w-20" />
              </div>
            ))}
          </div>
        ) : recentCosts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-stone-400 mb-4">Brak wydatków</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {recentCosts.map((cost, index) => (
                <motion.div
                  key={cost.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-soft border border-stone-100"
                >
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-stone-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 truncate">{cost.name}</p>
                    <p className="text-xs text-stone-400">{formatDate(cost.created_at)}</p>
                  </div>
                  <p className="font-semibold text-stone-900">
                    -{formatCurrency(cost.amount_paid || cost.value)} zł
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Add Cost Button */}
      <motion.div variants={itemVariants} className="mt-6">
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full btn-premium flex items-center justify-center gap-2"
        >
          Dodaj nowy wydatek
        </button>
      </motion.div>
    </motion.div>
  );
};

export default BudgetView;
