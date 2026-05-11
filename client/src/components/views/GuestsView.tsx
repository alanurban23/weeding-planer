import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Guest } from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, UserPlus, UserCheck, UserMinus, Users, X, Loader2,
  Upload, FileDown, StickyNote, List, Save, Copy, Trash2, Edit2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-indigo-500', 'bg-cyan-500', 'bg-purple-500',
  'bg-pink-500', 'bg-teal-500',
];

interface GuestFormValues {
  fullName: string;
  guestCount: number;
  email: string;
  phone: string;
  side: string;
  rsvpStatus: Guest['rsvpStatus'];
  notes: string;
}

const CSV_FIELD_MAP: Record<string, keyof GuestFormValues> = {
  full_name: 'fullName', imię_i_nazwisko: 'fullName', imie_i_nazwisko: 'fullName',
  guest_count: 'guestCount', liczba_osob: 'guestCount', liczba: 'guestCount',
  email: 'email',
  phone: 'phone', telefon: 'phone',
  side: 'side', strona: 'side',
  rsvp_status: 'rsvpStatus', status: 'rsvpStatus',
  notes: 'notes', uwagi: 'notes',
};

const emptyForm = (): GuestFormValues => ({
  fullName: '', guestCount: 1, email: '', phone: '', side: '', rsvpStatus: 'pending', notes: '',
});

const GuestsView: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'note'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Guest['rsvpStatus']>('all');

  // Add/Edit guest dialog
  const [showForm, setShowForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [formValues, setFormValues] = useState<GuestFormValues>(emptyForm());

  // Delete confirmation
  const [deletingGuest, setDeletingGuest] = useState<Guest | null>(null);

  // CSV import
  const [parsedGuests, setParsedGuests] = useState<GuestFormValues[]>([]);
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guest list note
  const [noteContent, setNoteContent] = useState('');
  const [noteLoaded, setNoteLoaded] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: guests = [], isLoading } = useQuery<Guest[]>({
    queryKey: ['/api/guests'],
    queryFn: () => apiRequest('/api/guests'),
  });

  const { data: noteData } = useQuery<{ id: number | null; content: string; updatedAt: string | null }>({
    queryKey: ['/api/guest-list-note'],
    queryFn: () => apiRequest('/api/guest-list-note'),
  });

  useEffect(() => {
    if (noteData && !noteLoaded) {
      setNoteContent(noteData.content || '');
      setNoteLoaded(true);
    }
  }, [noteData, noteLoaded]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const addGuestMutation = useMutation({
    mutationFn: (data: GuestFormValues) => apiRequest('/api/guests', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      setShowForm(false);
      setFormValues(emptyForm());
      toast({ title: 'Gość dodany' });
    },
    onError: (e: Error) => toast({ title: 'Błąd', description: e.message, variant: 'destructive' }),
  });

  const updateGuestMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<GuestFormValues> }) =>
      apiRequest(`/api/guests/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      setShowForm(false);
      setEditingGuest(null);
      setFormValues(emptyForm());
      toast({ title: 'Gość zaktualizowany' });
    },
    onError: (e: Error) => toast({ title: 'Błąd', description: e.message, variant: 'destructive' }),
  });

  const deleteGuestMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/guests/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      setDeletingGuest(null);
      toast({ title: 'Gość usunięty' });
    },
    onError: (e: Error) => toast({ title: 'Błąd', description: e.message, variant: 'destructive' }),
  });

  const importGuestsMutation = useMutation({
    mutationFn: (payload: GuestFormValues[]) =>
      apiRequest('/api/guests/import', 'POST', { guests: payload }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      setShowImport(false);
      setParsedGuests([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const imported = data?.imported?.length ?? 0;
      toast({ title: `Zaimportowano ${imported} gości` });
    },
    onError: (e: Error) => toast({ title: 'Błąd importu', description: e.message, variant: 'destructive' }),
  });

  const saveNoteMutation = useMutation({
    mutationFn: (content: string) => apiRequest('/api/guest-list-note', 'PUT', { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guest-list-note'] });
    },
  });

  // Auto-save note with 1s debounce
  useEffect(() => {
    if (!noteLoaded) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveNoteMutation.mutate(noteContent);
    }, 1000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [noteContent, noteLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openAddForm = () => { setEditingGuest(null); setFormValues(emptyForm()); setShowForm(true); };

  const openEditForm = (guest: Guest) => {
    setEditingGuest(guest);
    setFormValues({
      fullName: guest.fullName,
      guestCount: guest.guestCount ?? 1,
      email: guest.email ?? '',
      phone: guest.phone ?? '',
      side: guest.side ?? '',
      rsvpStatus: guest.rsvpStatus,
      notes: guest.notes ?? '',
    });
    setShowForm(true);
  };

  const handleFormSubmit = () => {
    if (!formValues.fullName.trim()) {
      toast({ title: 'Błąd', description: 'Imię i nazwisko jest wymagane', variant: 'destructive' });
      return;
    }
    if (editingGuest) {
      updateGuestMutation.mutate({ id: editingGuest.id, data: formValues });
    } else {
      addGuestMutation.mutate(formValues);
    }
  };

  const handleStatusCycle = (guest: Guest) => {
    const next: Record<Guest['rsvpStatus'], Guest['rsvpStatus']> = {
      pending: 'confirmed', confirmed: 'declined', declined: 'pending',
    };
    updateGuestMutation.mutate({ id: guest.id, data: { rsvpStatus: next[guest.rsvpStatus] } });
  };

  const downloadCsvTemplate = () => {
    const header = 'full_name,guest_count,email,phone,side,rsvp_status,notes';
    const s1 = 'Jan Kowalski,2,jan@example.com,+48123456789,panna_młoda,pending,';
    const s2 = 'Anna Nowak,1,,+48987654321,pan_młody,confirmed,plus jeden';
    const blob = new Blob([`${header}\n${s1}\n${s2}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lista-gosci-szablon.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelection = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast({ title: 'Błąd', description: 'Plik CSV jest pusty', variant: 'destructive' }); return; }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const parsed: GuestFormValues[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const row: Partial<GuestFormValues> = {};
        headers.forEach((h, idx) => {
          const key = CSV_FIELD_MAP[h];
          if (key && values[idx] !== undefined) {
            if (key === 'guestCount') (row as any)[key] = parseInt(values[idx]) || 1;
            else (row as any)[key] = values[idx];
          }
        });
        if (row.fullName) parsed.push({ ...emptyForm(), ...row });
      }
      setParsedGuests(parsed);
      if (parsed.length === 0) toast({ title: 'Błąd', description: 'Brak poprawnych rekordów', variant: 'destructive' });
    };
    reader.readAsText(file, 'UTF-8');
  };

  const copyGuestsToNote = useCallback(() => {
    if (!guests.length) return;
    const lines = guests.map((g) => {
      const parts = [g.fullName];
      if (g.guestCount > 1) parts.push(`(${g.guestCount} os.)`);
      if (g.side) parts.push(`[${g.side}]`);
      const status = g.rsvpStatus === 'confirmed' ? '✓' : g.rsvpStatus === 'declined' ? '✗' : '?';
      parts.push(status);
      return parts.join(' ');
    });
    const text = lines.join('\n');
    const newContent = noteContent.trim() ? `${noteContent.trim()}\n${text}` : text;
    setNoteContent(newContent);
    saveNoteMutation.mutate(newContent);
    toast({ title: 'Skopiowano gości do notatki' });
  }, [guests, noteContent, saveNoteMutation, toast]);

  const noteLineCount = useMemo(() => {
    if (!noteContent) return 0;
    return noteContent.split('\n').filter((l) => l.trim().length > 0).length;
  }, [noteContent]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredGuests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return guests
      .filter((g) => {
        if (statusFilter !== 'all' && g.rsvpStatus !== statusFilter) return false;
        if (!term) return true;
        return [g.fullName, g.email, g.phone, g.side, g.notes]
          .some((v) => v?.toLowerCase().includes(term));
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pl'));
  }, [guests, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: guests.length,
    confirmed: guests.filter((g) => g.rsvpStatus === 'confirmed').length,
    pending: guests.filter((g) => g.rsvpStatus === 'pending').length,
    declined: guests.filter((g) => g.rsvpStatus === 'declined').length,
  }), [guests]);

  const getAvatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  const getStatusIcon = (status: Guest['rsvpStatus']) => {
    if (status === 'confirmed') return <UserCheck className="w-5 h-5 text-emerald-500" />;
    if (status === 'declined') return <UserMinus className="w-5 h-5 text-rose-500" />;
    return <Users className="w-5 h-5 text-stone-400" />;
  };

  // ── Animation variants ─────────────────────────────────────────────────────

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div className="px-6 py-4" variants={containerVariants} initial="hidden" animate="visible">

      {/* Header */}
      <motion.div className="mb-4 flex items-center justify-between" variants={itemVariants}>
        <h2 className="font-serif text-3xl text-stone-900">Lista Gości</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
            title="Importuj CSV"
          >
            <Upload className="w-5 h-5 text-stone-500" />
          </button>
          <button
            onClick={downloadCsvTemplate}
            className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-colors"
            title="Pobierz szablon CSV"
          >
            <FileDown className="w-5 h-5 text-stone-500" />
          </button>
        </div>
      </motion.div>

      {/* Tabs: List / Note */}
      <motion.div variants={itemVariants} className="flex gap-1 mb-5 bg-stone-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'list' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <List className="w-4 h-4" /> Tabelka
        </button>
        <button
          onClick={() => setActiveTab('note')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'note' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <StickyNote className="w-4 h-4" /> Notatka
        </button>
      </motion.div>

      {/* ── TAB: LIST ── */}
      {activeTab === 'list' && (
        <>
          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: 'Potwierdzeni', value: stats.confirmed, filter: 'confirmed' as const, active: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: 'text-emerald-500' },
              { label: 'Oczekujący', value: stats.pending, filter: 'pending' as const, active: 'bg-amber-50 border-amber-200 text-amber-700', icon: 'text-amber-500' },
              { label: 'Odmówili', value: stats.declined, filter: 'declined' as const, active: 'bg-rose-50 border-rose-200 text-rose-700', icon: 'text-rose-500' },
            ].map(({ label, value, filter, active }) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(statusFilter === filter ? 'all' : filter)}
                className={`py-3 px-2 rounded-xl border transition-all ${
                  statusFilter === filter ? active : 'bg-white border-stone-200 text-stone-600'
                }`}
              >
                <span className="block text-xs uppercase tracking-wider font-medium leading-tight">{label}</span>
                <p className="font-serif text-2xl mt-0.5">{value}</p>
              </button>
            ))}
          </motion.div>

          {/* Search */}
          <motion.div variants={itemVariants} className="mb-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="Szukaj po nazwisku, email, telefon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
              />
            </div>
          </motion.div>

          {/* Guest list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl animate-pulse">
                  <div className="w-12 h-12 bg-stone-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-stone-200 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-stone-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500">Brak gości spełniających kryteria</p>
            </div>
          ) : (
            <motion.div variants={containerVariants} className="space-y-3">
              <AnimatePresence>
                {filteredGuests.map((guest, index) => (
                  <motion.div
                    key={guest.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-soft border border-stone-100"
                  >
                    <div className={`avatar-circle ${getAvatarColor(guest.fullName)}`}>
                      <span className="font-script text-xl">{guest.fullName.charAt(0)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-stone-800 truncate">{guest.fullName}</p>
                        {guest.guestCount > 1 && (
                          <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-md">
                            ×{guest.guestCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {guest.side && (
                          <span className="text-xs text-stone-400">{guest.side}</span>
                        )}
                        {guest.email && (
                          <span className="text-xs text-stone-400 truncate max-w-[120px]">{guest.email}</span>
                        )}
                        {guest.phone && (
                          <span className="text-xs text-stone-400">{guest.phone}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditForm(guest)}
                        className="p-2 hover:bg-stone-50 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-stone-400" />
                      </button>
                      <button
                        onClick={() => handleStatusCycle(guest)}
                        className="p-2 hover:bg-stone-50 rounded-xl transition-colors"
                      >
                        {getStatusIcon(guest.rsvpStatus)}
                      </button>
                      <button
                        onClick={() => setDeletingGuest(guest)}
                        className="p-2 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="w-full mt-4 py-3 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              Pokaż wszystkich ({stats.total})
            </button>
          )}

          <motion.div variants={itemVariants} className="mt-6">
            <button onClick={openAddForm} className="w-full btn-premium flex items-center justify-center gap-2">
              <UserPlus className="w-5 h-5" />
              Dodaj gościa
            </button>
          </motion.div>
        </>
      )}

      {/* ── TAB: NOTE ── */}
      {activeTab === 'note' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.div variants={itemVariants} className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <StickyNote className="w-4 h-4" />
              <span>{noteLineCount} linii</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyGuestsToNote}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
              >
                <Copy className="w-4 h-4" /> Kopiuj z listy
              </button>
              <button
                onClick={() => saveNoteMutation.mutate(noteContent)}
                disabled={saveNoteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm btn-premium"
              >
                {saveNoteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Zapisz
              </button>
            </div>
          </motion.div>
          <motion.div variants={itemVariants}>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Twoje notatki dotyczące listy gości..."
              className="w-full min-h-[50vh] p-4 bg-white rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 resize-none font-sans text-sm text-stone-700 leading-relaxed"
            />
          </motion.div>
        </motion.div>
      )}

      {/* ── ADD / EDIT GUEST MODAL ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif text-xl text-stone-900">
                  {editingGuest ? 'Edytuj gościa' : 'Dodaj gościa'}
                </h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Imię i nazwisko *</label>
                  <input
                    type="text" value={formValues.fullName}
                    onChange={(e) => setFormValues({ ...formValues, fullName: e.target.value })}
                    placeholder="np. Anna Kowalska"
                    className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Liczba osób</label>
                    <input
                      type="number" min="1" value={formValues.guestCount}
                      onChange={(e) => setFormValues({ ...formValues, guestCount: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Status RSVP</label>
                    <select
                      value={formValues.rsvpStatus}
                      onChange={(e) => setFormValues({ ...formValues, rsvpStatus: e.target.value as Guest['rsvpStatus'] })}
                      className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                    >
                      <option value="pending">Oczekuje</option>
                      <option value="confirmed">Potwierdzony</option>
                      <option value="declined">Odmówił</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Strona</label>
                  <input
                    type="text" value={formValues.side}
                    onChange={(e) => setFormValues({ ...formValues, side: e.target.value })}
                    placeholder="np. panna_młoda / pan_młody"
                    className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                  <input
                    type="email" value={formValues.email}
                    onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Telefon</label>
                  <input
                    type="tel" value={formValues.phone}
                    onChange={(e) => setFormValues({ ...formValues, phone: e.target.value })}
                    placeholder="+48 123 456 789"
                    className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Uwagi</label>
                  <textarea
                    value={formValues.notes}
                    onChange={(e) => setFormValues({ ...formValues, notes: e.target.value })}
                    placeholder="Alergie, preferencje, osoba towarzysząca..."
                    rows={3}
                    className="w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 resize-none"
                  />
                </div>

                <button
                  onClick={handleFormSubmit}
                  disabled={addGuestMutation.isPending || updateGuestMutation.isPending}
                  className="w-full btn-premium flex items-center justify-center gap-2"
                >
                  {(addGuestMutation.isPending || updateGuestMutation.isPending)
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <UserPlus className="w-5 h-5" />}
                  {editingGuest ? 'Zapisz zmiany' : 'Dodaj gościa'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CSV IMPORT MODAL ── */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowImport(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif text-xl text-stone-900">Import z CSV</h3>
                <button onClick={() => setShowImport(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>

              <p className="text-sm text-stone-500 mb-4">
                Wybierz plik CSV. Wymagany nagłówek: <code className="text-xs bg-stone-100 px-1 rounded">full_name</code>.
                Opcjonalne: guest_count, email, phone, side, rsvp_status, notes.
              </p>

              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelection}
                  className="w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200"
                />

                {parsedGuests.length > 0 && (
                  <p className="text-sm text-emerald-600 font-medium">
                    Znaleziono {parsedGuests.length} rekordów gotowych do importu
                  </p>
                )}

                <button
                  onClick={() => parsedGuests.length && importGuestsMutation.mutate(parsedGuests)}
                  disabled={!parsedGuests.length || importGuestsMutation.isPending}
                  className="w-full btn-premium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importGuestsMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  Importuj gości
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRMATION ── */}
      <AnimatePresence>
        {deletingGuest && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6"
            onClick={() => setDeletingGuest(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-serif text-xl text-stone-900 mb-2">Usuń gościa</h3>
              <p className="text-sm text-stone-500 mb-6">
                Czy na pewno chcesz usunąć <strong>{deletingGuest.fullName}</strong>? Tej operacji nie można cofnąć.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingGuest(null)}
                  className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => deleteGuestMutation.mutate(deletingGuest.id)}
                  disabled={deleteGuestMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                >
                  {deleteGuestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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

export default GuestsView;
