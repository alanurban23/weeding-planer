import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Task } from '@shared/schema';
import { motion } from 'framer-motion';
import { ArrowUpRight, AlertCircle, Heart } from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  coupleName?: string;
  weddingDate?: Date;
}

interface Cost {
  id: number;
  name: string;
  value: number;
  amount_paid?: number;
}

interface Guest {
  id: number;
  fullName: string;
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
}

interface Note {
  id: string;
  content: string;
}

const TOTAL_BUDGET = 80000;

const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  coupleName = 'Ava + Lucas',
  weddingDate = new Date('2025-04-28'),
}) => {
  // Fetch tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    queryFn: () => apiRequest('/api/tasks'),
  });

  // Fetch costs
  const { data: costs = [] } = useQuery<Cost[]>({
    queryKey: ['/api/costs'],
    queryFn: () => apiRequest('/api/costs'),
  });

  // Fetch guests
  const { data: guests = [] } = useQuery<Guest[]>({
    queryKey: ['/api/guests'],
    queryFn: () => apiRequest('/api/guests'),
  });

  // Fetch notes
  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ['/api/notes'],
    queryFn: () => apiRequest('/api/notes'),
  });

  // Calculate days until wedding
  const daysUntilWedding = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const wedding = new Date(weddingDate);
    wedding.setHours(0, 0, 0, 0);
    const diff = wedding.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [weddingDate]);

  // Calculate budget stats
  const budgetStats = useMemo(() => {
    const totalSpent = costs.reduce((sum, cost) => sum + (cost.amount_paid || cost.value), 0);
    const percentage = Math.round((totalSpent / TOTAL_BUDGET) * 100);
    return { totalSpent, percentage };
  }, [costs]);

  // Calculate overdue tasks
  const overdueTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((task) => {
      if (!task.dueDate || task.completed) return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
  }, [tasks]);

  // Get next upcoming task
  const nextTask = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = tasks
      .filter((task) => {
        if (!task.dueDate || task.completed) return false;
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today;
      })
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    return upcoming[0];
  }, [tasks]);

  // Calculate guest stats
  const guestStats = useMemo(() => {
    const confirmed = guests.filter((g) => g.rsvpStatus === 'confirmed').length;
    return { confirmed, total: guests.length };
  }, [guests]);

  // Get random note for display
  const randomNote = useMemo(() => {
    if (notes.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * notes.length);
    return notes[randomIndex];
  }, [notes]);

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

  return (
    <motion.div
      className="px-6 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Couple Name & Countdown */}
      <motion.div className="mb-8" variants={itemVariants}>
        <h2 className="font-script text-4xl text-stone-800 mb-2">{coupleName}</h2>
        <p className="text-sm uppercase tracking-widest text-stone-400 font-medium">
          {daysUntilWedding} dni do ślubu
        </p>
      </motion.div>

      {/* Widget Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Budget Widget */}
        <motion.button
          variants={itemVariants}
          onClick={() => onNavigate('budget')}
          className="widget-card text-left col-span-1"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="section-header !mb-0">Budżet</span>
            <ArrowUpRight className="w-4 h-4 text-stone-300" />
          </div>
          <p className="font-serif text-3xl text-stone-900 mb-1">
            {budgetStats.percentage}%
          </p>
          <p className="text-sm text-stone-500">
            Wydano {budgetStats.totalSpent.toLocaleString('pl-PL')} zł
          </p>
          <div className="mt-3 progress-premium">
            <div
              className="progress-premium-bar"
              style={{ width: `${Math.min(budgetStats.percentage, 100)}%` }}
            />
          </div>
        </motion.button>

        {/* Tasks Widget */}
        <motion.button
          variants={itemVariants}
          onClick={() => onNavigate('tasks')}
          className="widget-card text-left col-span-1"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="section-header !mb-0">Zadania</span>
            {overdueTasks.length > 0 && (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <p className="font-serif text-3xl text-stone-900 mb-1">
            {overdueTasks.length}
          </p>
          <p className="text-sm text-rose-500">Zaległe zadania</p>
          {nextTask && (
            <p className="text-xs text-stone-400 mt-2 truncate">
              Następne: {nextTask.title.substring(0, 20)}...
            </p>
          )}
        </motion.button>
      </div>

      {/* Guests Widget - Full Width */}
      <motion.button
        variants={itemVariants}
        onClick={() => onNavigate('guests')}
        className="w-full bg-stone-900 rounded-2xl p-5 mb-6 text-left shadow-premium"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-widest text-stone-400 font-medium">
              Goście
            </span>
            <p className="font-serif text-2xl text-white mt-1">
              {guestStats.confirmed} Potwierdzonych
            </p>
          </div>
          <div className="flex -space-x-2">
            {['A', 'B', 'C', 'D'].map((letter, index) => (
              <div
                key={letter}
                className="w-8 h-8 rounded-full bg-stone-700 border-2 border-stone-900 flex items-center justify-center text-xs text-stone-300"
              >
                {letter}
              </div>
            ))}
            {guestStats.total > 4 && (
              <div className="w-8 h-8 rounded-full bg-stone-600 border-2 border-stone-900 flex items-center justify-center text-xs text-white">
                +{guestStats.total - 4}
              </div>
            )}
          </div>
        </div>
      </motion.button>

      {/* Notes Preview */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-medium text-stone-600">Twoje Notatki</span>
        </div>
        <button
          onClick={() => onNavigate('notes')}
          className="w-full sticky-note text-center py-6"
        >
          {randomNote ? (
            <>
              <p className="font-serif text-lg italic text-stone-700 mb-2">
                "{randomNote.content.substring(0, 50)}
                {randomNote.content.length > 50 ? '...' : ''}"
              </p>
              <p className="text-xs uppercase tracking-widest text-stone-400">
                Kliknij aby zobaczyć wszystkie
              </p>
            </>
          ) : (
            <>
              <p className="font-serif text-lg italic text-stone-500 mb-2">
                "Najszczęśliwszy"
              </p>
              <p className="text-xs uppercase tracking-widest text-stone-400">
                Kliknij aby zobaczyć wszystkie
              </p>
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default DashboardView;
