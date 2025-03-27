import React from 'react';

interface MobileNavigationProps {
  onAddTask: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ onAddTask }) => {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-10">
      <div className="flex justify-around py-3">
        <button
          className="flex flex-col items-center justify-center text-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-xs mt-1">Zadania</span>
        </button>
        
        <button
          onClick={onAddTask}
          className="flex flex-col items-center justify-center text-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs mt-1">Dodaj</span>
        </button>
        
        <button
          className="flex flex-col items-center justify-center text-gray-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs mt-1">Kalendarz</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNavigation;
