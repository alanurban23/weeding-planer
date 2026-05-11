import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Heart, X, Filter, CheckSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  content: string;
  created_at: string;
  category?: string | number | null;
  category_id?: number | null;
}

interface Category {
  id: number;
  name: string;
}

const NOTE_COLORS = [
  'bg-stone-50', 'bg-amber-50', 'bg-rose-50', 'bg-emerald-50', 'bg-indigo-50',
];

const NotesView: React.FC = () => {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);

  // Fetch notes
  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ['/api/notes'],
    queryFn: () => apiRequest('/api/notes'),
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: () => apiRequest('/api/categories'),
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: (data: { content: string; category_id?: number | null }) =>
      apiRequest('/api/notes', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setShowAddForm(false);
      setNewNoteContent('');
      setNewNoteCategory('');
      toast({ title: 'Notatka dodana' });
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiRequest(`/api/notes/${id}`, 'PUT', { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setEditingNote(null);
      toast({ title: 'Notatka zaktualizowana' });
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/notes/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setDeletingNote(null);
      toast({ title: 'Notatka usunięta' });
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Create task from note mutation
  const createTaskMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest('/api/tasks', 'POST', { title: content.slice(0, 200), notes: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: 'Zadanie utworzone z notatki' });
    },
    onError: (error: Error) => {
      toast({ title: 'Błąd', description: error.message, variant: 'destructive' });
    },
  });

  // Filtered notes
  const filteredNotes = useMemo(() => {
    if (categoryFilter === 'all') return notes;
    if (categoryFilter === 'uncategorized') return notes.filter((n) => !n.category && !n.category_id);
    const catId = parseInt(categoryFilter);
    return notes.filter((n) => n.category_id === catId || n.category === catId || n.category === categoryFilter);
  }, [notes, categoryFilter]);

  const getNoteColor = (index: number) => NOTE_COLORS[index % NOTE_COLORS.length];

  const handleAddNote = () => {
    if (!newNoteContent.trim()) {
      toast({ title: 'Błąd', description: 'Treść notatki nie może być pusta', variant: 'destructive' });
      return;
    }
    addNoteMutation.mutate({
      content: newNoteContent.trim(),
      category_id: newNoteCategory ? parseInt(newNoteCategory) : null,
    });
  };

  const handleUpdateNote = () => {
    if (!editingNote || !editingNote.content.trim()) return;
    updateNoteMutation.mutate({ id: editingNote.id, content: editingNote.content.trim() });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  };

  return (
    <motion.div className="px-6 py-4" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="mb-5" variants={itemVariants}>
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-rose-400" />
          <h2 className="font-serif text-3xl text-stone-900">Notatki</h2>
        </div>
      </motion.div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <motion.div variants={itemVariants} className="mb-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Filter className="w-4 h-4 text-stone-400 flex-shrink-0" />
            {[
              { value: 'all', label: 'Wszystkie' },
              { value: 'uncategorized', label: 'Bez kategorii' },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategoryFilter(value)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full border transition-all ${
                  categoryFilter === value
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                {label.length > 20 ? label.slice(0, 20) + '…' : label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="sticky-note animate-pulse h-32">
              <div className="h-4 bg-stone-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-stone-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center">
            <Heart className="w-8 h-8 text-stone-300" />
          </div>
          <p className="text-stone-500 mb-4">Brak notatek</p>
          <button onClick={() => setShowAddForm(true)} className="text-amber-600 font-medium">
            Dodaj pierwszą notatkę
          </button>
        </motion.div>
      ) : (
        <motion.div className="grid grid-cols-2 gap-4" variants={containerVariants}>
          <AnimatePresence>
            {filteredNotes.map((note, index) => (
              <motion.div
                key={note.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
                className={`sticky-note ${getNoteColor(index)}`}
              >
                {/* Tape effect */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-4 bg-stone-200/60 rounded-b-sm" />

                <p className="font-sans text-sm text-stone-700 leading-relaxed line-clamp-4 mt-3">
                  {note.content}
                </p>

                {/* Actions */}
                <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => createTaskMutation.mutate(note.content)}
                    className="p-1.5 bg-white/80 rounded-lg hover:bg-white transition-colors"
                    title="Utwórz zadanie"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  </button>
                  <button
                    onClick={() => setEditingNote(note)}
                    className="p-1.5 bg-white/80 rounded-lg hover:bg-white transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                  </button>
                  <button
                    onClick={() => setDeletingNote(note)}
                    className="p-1.5 bg-white/80 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add Note Button */}
      <motion.div variants={itemVariants} className="mt-6">
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full btn-premium flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Dodaj notatkę
        </button>
      </motion.div>

      {/* Add Note Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl text-stone-900">Nowa notatka</h3>
                <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Wpisz treść notatki..."
                className="w-full h-32 p-4 bg-stone-50 rounded-2xl border border-stone-200 resize-none focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 font-sans"
                autoFocus
              />
              {categories.length > 0 && (
                <div className="mt-3">
                  <select
                    value={newNoteCategory}
                    onChange={(e) => setNewNoteCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-sm"
                  >
                    <option value="">Bez kategorii</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={handleAddNote}
                disabled={addNoteMutation.isPending}
                className="w-full mt-4 btn-premium"
              >
                {addNoteMutation.isPending ? 'Zapisywanie...' : 'Zapisz notatkę'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Note Modal */}
      <AnimatePresence>
        {editingNote && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setEditingNote(null)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl text-stone-900">Edytuj notatkę</h3>
                <button onClick={() => setEditingNote(null)} className="p-2 hover:bg-stone-100 rounded-xl">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>
              <textarea
                value={editingNote.content}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                placeholder="Wpisz treść notatki..."
                className="w-full h-32 p-4 bg-stone-50 rounded-2xl border border-stone-200 resize-none focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 font-sans"
                autoFocus
              />
              <button
                onClick={handleUpdateNote}
                disabled={updateNoteMutation.isPending}
                className="w-full mt-4 btn-premium"
              >
                {updateNoteMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deletingNote && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6"
            onClick={() => setDeletingNote(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-serif text-xl text-stone-900 mb-2">Usuń notatkę</h3>
              <p className="text-sm text-stone-500 mb-6 line-clamp-2">
                Usunąć: „{deletingNote.content.slice(0, 80)}{deletingNote.content.length > 80 ? '…' : ''}"?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingNote(null)}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => deleteNoteMutation.mutate(deletingNote.id)}
                  disabled={deleteNoteMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                >
                  Usuń
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NotesView;
