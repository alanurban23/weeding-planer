import React from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  CheckSquare,
  Users,
  Wallet,
  FileText,
  Heart,
} from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'tasks', icon: CheckSquare, label: 'Zadania' },
  { id: 'guests', icon: Users, label: 'Goście' },
  { id: 'budget', icon: Wallet, label: 'Budżet' },
  { id: 'notes', icon: FileText, label: 'Notatki' },
  { id: 'story', icon: Heart, label: 'Historia' },
];

const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className="z-50">
      <div className="px-4 pb-4 pt-1">
        <div className="bg-stone-900/90 backdrop-blur-xl rounded-2xl px-2 py-2 flex items-center justify-around shadow-premium border border-stone-800/50">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-300 ${
                  isActive ? '-translate-y-1' : ''
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <Icon
                  className={`w-5 h-5 transition-colors duration-300 ${
                    isActive ? 'text-gold' : 'text-stone-400'
                  }`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className={`text-[10px] transition-colors duration-300 ${
                  isActive ? 'text-gold' : 'text-stone-500'
                }`}>
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-gold"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
