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

// Chat tab needs full-height layout with its own scroll; other tabs scroll freely.
const FULL_HEIGHT_TABS = ['chat'];

const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  onTabChange,
  showHeader = true,
  headerTitle = 'Planer Weselny',
}) => {
  const isFullHeight = FULL_HEIGHT_TABS.includes(activeTab);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      {/* Mobile App Container */}
      <div className="w-full max-w-md h-screen bg-stone-50 relative shadow-premium flex flex-col">

        {/* Header */}
        {showHeader && (
          <header className="z-40 bg-stone-50/95 backdrop-blur-sm px-6 pt-safe flex-shrink-0">
            <div className="flex items-center justify-between py-4">
              <h1 className="font-serif text-xl italic text-stone-800">{headerTitle}</h1>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 min-h-0 ${
            isFullHeight
              ? 'flex flex-col overflow-hidden'
              : 'overflow-y-auto pb-28'
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={isFullHeight ? 'flex flex-col flex-1 min-h-0' : undefined}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation – inside the container so it's positioned correctly */}
        <div className="flex-shrink-0">
          <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
        </div>
      </div>
    </div>
  );
};

export default AppShell;
