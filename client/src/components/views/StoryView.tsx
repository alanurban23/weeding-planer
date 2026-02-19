import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Calendar, MapPin, Users, Sparkles } from 'lucide-react';

interface StoryViewProps {
  coupleName?: string;
  weddingDate?: Date;
  venue?: string;
}

const StoryView: React.FC<StoryViewProps> = ({
  coupleName = 'Ava + Lucas',
  weddingDate = new Date('2025-04-28'),
  venue = 'Pałac w Nieborowie',
}) => {
  const milestones = [
    {
      date: 'Pierwsza randka',
      title: 'Spotkanie',
      description: 'Pierwsze wspólne chwile, które zmieniły wszystko.',
      icon: Heart,
    },
    {
      date: 'Rocznica',
      title: 'Pierwszy rok',
      description: 'Rok pełen przygód i wspólnych marzeń.',
      icon: Calendar,
    },
    {
      date: 'Zaręczyny',
      title: 'TAK!',
      description: 'Najpiękniejsze pytanie i najpiękniejsza odpowiedź.',
      icon: Sparkles,
    },
    {
      date: weddingDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }),
      title: 'Wielki Dzień',
      description: 'Początek naszej wspólnej drogi jako małżeństwo.',
      icon: Users,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
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
      <motion.div className="text-center mb-10" variants={itemVariants}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center"
        >
          <Heart className="w-10 h-10 text-rose-500" fill="currentColor" />
        </motion.div>
        <h2 className="font-script text-5xl text-stone-800 mb-2">{coupleName}</h2>
        <p className="text-sm uppercase tracking-widest text-stone-400">Nasza Historia</p>
      </motion.div>

      {/* Timeline */}
      <motion.div className="relative" variants={containerVariants}>
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-rose-200 via-gold-200 to-emerald-200" />

        {milestones.map((milestone, index) => {
          const Icon = milestone.icon;
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              className="relative pl-16 pb-10 last:pb-0"
            >
              {/* Timeline dot */}
              <div className="absolute left-4 w-5 h-5 rounded-full bg-white border-2 border-gold-400 shadow-soft" />

              {/* Content */}
              <div className="premium-card p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gold-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-stone-400 mb-1">
                      {milestone.date}
                    </p>
                    <h3 className="font-serif text-xl text-stone-800 mb-2">
                      {milestone.title}
                    </h3>
                    <p className="text-sm text-stone-500 leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Venue Card */}
      <motion.div variants={itemVariants} className="mt-8">
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-6 text-white shadow-premium">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-gold-400" />
            <span className="text-xs uppercase tracking-widest text-stone-400">
              Miejsce ceremonii
            </span>
          </div>
          <h3 className="font-serif text-2xl mb-2">{venue}</h3>
          <p className="text-sm text-stone-400">
            {weddingDate.toLocaleDateString('pl-PL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </motion.div>

      {/* Quote */}
      <motion.div variants={itemVariants} className="mt-8 text-center">
        <p className="font-serif text-lg italic text-stone-500">
          "Razem możemy wszystko"
        </p>
      </motion.div>
    </motion.div>
  );
};

export default StoryView;
