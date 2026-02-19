import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Plus, DollarSign, Trash2, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EditCostDialog from '@/components/edit-cost-dialog';

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

const TOTAL_BUDGET = 80000;

const BudgetView: React.FC = () => {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCost, setEditingCost] = useState<Cost | null>(null);
  const [showAllCosts, setShowAllCosts] = useState(false);

  // Form state for adding new cost
  const [newCost, setNewCost] = useState({
    name: '',
    value: '',
    category_id: '',
    total_amount: '',
    due_date: '',
    notes: '',
  });

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

  // Add cost mutation
  const addCostMutation = useMutation({
    mutationFn: (costData: any) => apiRequest('/api/costs', 'POST', costData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/costs'] });
      setShowAddForm(false);
      setNewCost({ name: '', value: '', category_id: '', total_amount: '', due_date: '', notes: '' });
      toast({ title: 'Koszt dodany', description: 'Nowy wydatek został zapisany.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Delete cost mutation
  const deleteCostMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/costs/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/costs'] });
      toast({ title: 'Koszt usunięty' });
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
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
      { name: 'Pozostało', value: Math.max(0, budgetStats.remaining), color: '#e7e5e4' },
    ];
  }, [budgetStats]);

  // Get costs to display
  const displayedCosts = useMemo(() => {
    const sorted = [...costs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return showAllCosts ? sorted : sorted.slice(0, 5);
  }, [costs, showAllCosts]);

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

  const handleAddCost = () => {
    const numericValue = parseFloat(newCost.value);
    if (!newCost.name.trim() || isNaN(numericValue) || numericValue <= 0) {
      toast({
        title: 'Błąd walidacji',
        description: 'Wprowadź nazwę i poprawną kwotę.',
        variant: 'destructive',
      });
      return;
    }

    const numericTotalAmount = newCost.total_amount ? parseFloat(newCost.total_amount) : null;

    addCostMutation.mutate({
      name: newCost.name.trim(),
      value: numericValue,
      category_id: newCost.category_id ? parseInt(newCost.category_id) : null,
      total_amount: numericTotalAmount,
      due_date: newCost.due_date || null,
      notes: newCost.notes.trim() || null,
    });
  };

  const getPaymentStatusBadge = (cost: Cost) => {
    const totalAmount = cost.total_amount || cost.value;
    const paidAmount = cost.amount_paid || 0;

    if (paidAmount >= totalAmount) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">
          Zapłacone
        </span>
      );
    } else if (paidAmount > 0) {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-gold-100 text-gold-700">
          Częściowo
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-stone-100 text-stone-600">
        Oczekuje
      </span>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
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
      <motion.div variants={itemVariants} className="premium-card p-6 mb-6">
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

      {/* Costs Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-stone-800">Ostatnie wydatki</h3>
          {costs.length > 5 && (
            <button
              onClick={() => setShowAllCosts(!showAllCosts)}
              className="text-sm font-medium text-gold-600 uppercase tracking-wide"
            >
              {showAllCosts ? 'Pokaż mniej' : 'Zobacz wszystkie'}
            </button>
          )}
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
        ) : displayedCosts.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-400 mb-4">Brak wydatków</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {displayedCosts.map((cost, index) => {
                const totalAmount = cost.total_amount || cost.value;
                const paidAmount = cost.amount_paid || 0;
                const remaining = totalAmount - paidAmount;

                return (
                  <motion.button
                    key={cost.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setEditingCost(cost)}
                    className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-soft border border-stone-100 text-left hover:shadow-soft-lg transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-5 h-5 text-stone-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-stone-800 truncate">{cost.name}</p>
                        {getPaymentStatusBadge(cost)}
                      </div>
                      <p className="text-xs text-stone-400">{formatDate(cost.created_at)}</p>
                      {cost.total_amount && cost.total_amount > cost.value && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-emerald-600">
                            Zapłacono: {formatCurrency(paidAmount)} zł
                          </span>
                          <span className="text-stone-300">|</span>
                          <span className="text-rose-500">
                            Pozostało: {formatCurrency(remaining)} zł
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-stone-900">
                        -{formatCurrency(totalAmount)} zł
                      </p>
                    </div>
                  </motion.button>
                );
              })}
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
          <Plus className="w-5 h-5" />
          Dodaj nowy wydatek
        </button>
      </motion.div>

      {/* Edit Cost Dialog */}
      <EditCostDialog
        cost={editingCost}
        open={!!editingCost}
        onOpenChange={(open) => !open && setEditingCost(null)}
      />

      {/* Add Cost Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-xl text-stone-900">Dodaj wydatek</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Nazwa kosztu *
                  </label>
                  <input
                    type="text"
                    value={newCost.name}
                    onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
                    placeholder="np. Kaucja za salę"
                    className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                  />
                </div>

                {/* Value and Total Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Kwota do zapłaty *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCost.value}
                      onChange={(e) => setNewCost({ ...newCost, value: e.target.value })}
                      placeholder="1000"
                      className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      Całkowita kwota
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCost.total_amount}
                      onChange={(e) => setNewCost({ ...newCost, total_amount: e.target.value })}
                      placeholder="10000"
                      className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Kategoria
                  </label>
                  <select
                    value={newCost.category_id}
                    onChange={(e) => setNewCost({ ...newCost, category_id: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                  >
                    <option value="">Bez kategorii</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Termin płatności
                  </label>
                  <input
                    type="date"
                    value={newCost.due_date}
                    onChange={(e) => setNewCost({ ...newCost, due_date: e.target.value })}
                    className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Notatki
                  </label>
                  <textarea
                    value={newCost.notes}
                    onChange={(e) => setNewCost({ ...newCost, notes: e.target.value })}
                    placeholder="Dodatkowe informacje..."
                    rows={3}
                    className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleAddCost}
                  disabled={addCostMutation.isPending}
                  className="w-full btn-premium flex items-center justify-center gap-2"
                >
                  {addCostMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  {addCostMutation.isPending ? 'Zapisywanie...' : 'Dodaj wydatek'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BudgetView;
