import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Guest } from '@shared/schema';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, UserCheck, UserMinus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-gold-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-purple-500',
  'bg-pink-500',
];

const GuestsView: React.FC = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Guest['rsvpStatus']>('all');

  // Fetch guests
  const { data: guests = [], isLoading } = useQuery<Guest[]>({
    queryKey: ['/api/guests'],
    queryFn: () => apiRequest('/api/guests'),
  });

  // Update guest mutation
  const updateGuestMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Guest> }) =>
      apiRequest(`/api/guests/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/guests'] });
      toast({ title: 'Status gościa zaktualizowany' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Błąd aktualizacji',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter guests
  const filteredGuests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return guests
      .filter((guest) => {
        if (statusFilter !== 'all' && guest.rsvpStatus !== statusFilter) {
          return false;
        }
        if (!term) return true;
        return guest.fullName.toLowerCase().includes(term);
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'pl'));
  }, [guests, searchTerm, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const confirmed = guests.filter((g) => g.rsvpStatus === 'confirmed').length;
    const pending = guests.filter((g) => g.rsvpStatus === 'pending').length;
    const declined = guests.filter((g) => g.rsvpStatus === 'declined').length;
    return { total: guests.length, confirmed, pending, declined };
  }, [guests]);

  const getAvatarColor = (name: string) => {
    const index = name.charCodeAt(0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  };

  const getStatusIcon = (status: Guest['rsvpStatus']) => {
    switch (status) {
      case 'confirmed':
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      case 'declined':
        return <UserMinus className="w-5 h-5 text-rose-500" />;
      default:
        return <Users className="w-5 h-5 text-stone-400" />;
    }
  };

  const handleStatusChange = (guestId: number, newStatus: Guest['rsvpStatus']) => {
    updateGuestMutation.mutate({ id: guestId, data: { rsvpStatus: newStatus } });
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

  return (
    <motion.div
      className="px-6 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="mb-6" variants={itemVariants}>
        <h2 className="font-serif text-3xl text-stone-900 mb-1">Lista Gości</h2>
      </motion.div>

      {/* Stats Buttons */}
      <motion.div variants={itemVariants} className="flex gap-3 mb-6">
        <button
          onClick={() => setStatusFilter('confirmed')}
          className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
            statusFilter === 'confirmed'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-stone-200 text-stone-600'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-medium">Potwierdzeni</span>
          <p className="font-serif text-2xl mt-1">{stats.confirmed}</p>
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
            statusFilter === 'pending'
              ? 'bg-gold-50 border-gold-200 text-gold-700'
              : 'bg-white border-stone-200 text-stone-600'
          }`}
        >
          <span className="text-xs uppercase tracking-wider font-medium">Oczekujący</span>
          <p className="font-serif text-2xl mt-1">{stats.pending}</p>
        </button>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            placeholder="Szukaj gościa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all"
          />
        </div>
      </motion.div>

      {/* Guest List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl animate-pulse">
              <div className="w-12 h-12 bg-stone-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-stone-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-stone-100 rounded w-1/3" />
              </div>
              <div className="w-6 h-6 bg-stone-200 rounded-full" />
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
                {/* Avatar */}
                <div
                  className={`avatar-circle ${getAvatarColor(guest.fullName)}`}
                >
                  <span className="font-script text-xl">
                    {guest.fullName.charAt(0)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800">{guest.fullName}</p>
                  <p className="text-xs text-stone-400 uppercase tracking-wide">
                    {guest.side ? `Stół ${guest.side}` : 'Stół 0'} • {
                      guest.notes?.includes('+') ? '+ osoba tow.' : 'pojedynczo'
                    }
                  </p>
                </div>

                {/* Status Button */}
                <button
                  onClick={() => {
                    const nextStatus: Record<Guest['rsvpStatus'], Guest['rsvpStatus']> = {
                      pending: 'confirmed',
                      confirmed: 'declined',
                      declined: 'pending',
                    };
                    handleStatusChange(guest.id, nextStatus[guest.rsvpStatus]);
                  }}
                  className="p-2 hover:bg-stone-50 rounded-xl transition-colors"
                >
                  {getStatusIcon(guest.rsvpStatus)}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Clear Filter Button */}
      {statusFilter !== 'all' && (
        <motion.button
          variants={itemVariants}
          onClick={() => setStatusFilter('all')}
          className="w-full mt-4 py-3 text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          Pokaż wszystkich gości ({stats.total})
        </motion.button>
      )}

      {/* Add Guest Button */}
      <motion.div variants={itemVariants} className="mt-6">
        <button className="w-full btn-premium flex items-center justify-center gap-2">
          <UserPlus className="w-5 h-5" />
          Dodaj gościa
        </button>
      </motion.div>
    </motion.div>
  );
};

export default GuestsView;
