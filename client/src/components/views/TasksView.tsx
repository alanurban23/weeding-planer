import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Task } from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

interface TasksViewProps {
  onCategorySelect?: (categoryId: number) => void;
}

const TasksView: React.FC<TasksViewProps> = ({ onCategorySelect }) => {
  const navigate = useNavigate();
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  // Fetch tasks
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    queryFn: () => apiRequest('/api/tasks'),
  });

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories'),
  });

  // Toggle task completion mutation
  const toggleTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/tasks/${id}/toggle`, 'PATCH'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  // Process categories with task counts
  const categoriesWithProgress = useMemo(() => {
    const mainCategories = categories
      .filter((cat) => cat.parent_id === null)
      .sort((a, b) => {
        const numA = parseInt(a.name.match(/^(\d+)\./)?.[1] || '999999', 10);
        const numB = parseInt(b.name.match(/^(\d+)\./)?.[1] || '999999', 10);
        return numA - numB;
      });

    return mainCategories.map((category) => {
      const categoryTasks = tasks.filter(
        (task) => task.id_category === category.id
      );
      const completedTasks = categoryTasks.filter((task) => task.completed);
      const progress =
        categoryTasks.length > 0
          ? Math.round((completedTasks.length / categoryTasks.length) * 100)
          : 0;

      return {
        ...category,
        totalTasks: categoryTasks.length,
        completedTasks: completedTasks.length,
        progress,
        tasks: categoryTasks,
      };
    });
  }, [categories, tasks]);

  // Calculate total progress
  const totalProgress = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.completed).length;
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }, [tasks]);

  // Get overdue tasks
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

  const handleCategoryClick = (categoryId: number) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    } else {
      navigate(`/category/${categoryId}`);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const isLoading = isLoadingTasks || isLoadingCategories;

  return (
    <motion.div
      className="px-6 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="mb-6" variants={itemVariants}>
        <h2 className="font-serif text-3xl text-stone-900 mb-1">Zadania</h2>
        <p className="text-sm text-stone-500">Lista rzeczy do zrobienia.</p>
      </motion.div>

      {/* Progress Circle */}
      <motion.div
        variants={itemVariants}
        className="flex justify-end mb-6"
      >
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="#e7e5e4"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="#d4af37"
              strokeWidth="2"
              strokeDasharray={`${totalProgress} 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-stone-600">
              {tasks.filter(t => t.completed).length}/{tasks.length}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Overdue Tasks Section */}
      {overdueTasks.length > 0 && (
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-semibold text-rose-500">
              Zaległe zadania ({overdueTasks.length})
            </span>
          </div>
          <div className="space-y-2">
            {overdueTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100"
              >
                <button
                  onClick={() => toggleTaskMutation.mutate(task.id)}
                  className="w-5 h-5 rounded-full border-2 border-rose-300 flex items-center justify-center"
                >
                  {task.completed && <Check className="w-3 h-3 text-rose-500" />}
                </button>
                <span className="flex-1 text-sm text-stone-700 truncate">
                  {task.title}
                </span>
                <Clock className="w-4 h-4 text-rose-400" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Categories Section */}
      <motion.div variants={itemVariants}>
        <span className="section-header">Kategorie</span>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="category-card animate-pulse">
                <div className="h-6 bg-stone-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-stone-100 rounded w-1/3 mb-3" />
                <div className="h-1.5 bg-stone-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {categoriesWithProgress.map((category, index) => (
                <motion.button
                  key={category.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleCategoryClick(category.id)}
                  className="w-full category-card text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-800 uppercase tracking-wide text-sm">
                        {category.name}
                      </h3>
                      <p className="text-xs text-stone-400 mt-1">
                        {category.completedTasks} z {category.totalTasks} ukończonych
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-400">
                        {category.progress}%
                      </span>
                      <ChevronRight className="w-5 h-5 text-stone-300" />
                    </div>
                  </div>
                  <div className="progress-premium">
                    <motion.div
                      className="progress-premium-bar"
                      initial={{ width: 0 }}
                      animate={{ width: `${category.progress}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    />
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TasksView;
