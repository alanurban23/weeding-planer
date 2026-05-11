import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNavigation from './BottomNavigation';

interface AppShellProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showHeader?: boolean;
  headerTitle?: string;
}

const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  onTabChange,
  showHeader = true,
  headerTitle = 'Planer Weselny',
}) => {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      {/* Mobile App Container */}
      <div className="w-full max-w-md min-h-screen bg-stone-50 relative overflow-hidden shadow-premium">
        {/* Header */}
        {showHeader && (
          <header className="sticky top-0 z-40 bg-stone-50/95 backdrop-blur-sm px-6 pt-safe">
            <div className="flex items-center justify-between py-4">
              <h1 className="font-serif text-xl italic text-stone-800">
                {headerTitle}
              </h1>
              <button className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                <svg
                  className="w-6 h-6 text-stone-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main className="pb-28 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </div>
  );
};

export default AppShell;
