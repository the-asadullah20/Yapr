import React from 'react';
import { Sparkles, Clock, Globe, Sliders } from 'lucide-react';

interface FeedTabsProps {
  currentTab: 'ranked' | 'chronological' | 'regional';
  onTabChange: (tab: 'ranked' | 'chronological' | 'regional') => void;
  onOpenSliders: () => void;
}

export const FeedTabs: React.FC<FeedTabsProps> = ({
  currentTab,
  onTabChange,
  onOpenSliders,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-1.5 sm:p-2 shadow-sm mb-4 flex items-center justify-between gap-1 sm:gap-2 select-none transition-colors overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
        <button
          onClick={() => onTabChange('ranked')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
            currentTab === 'ranked'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span>For You</span>
        </button>

        <button
          onClick={() => onTabChange('chronological')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
            currentTab === 'chronological'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Latest</span>
        </button>

        <button
          onClick={() => onTabChange('regional')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
            currentTab === 'regional'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Regional</span>
        </button>
      </div>

      <button
        onClick={onOpenSliders}
        className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors flex-shrink-0"
        title="Customize Feed Algorithm Sliders"
      >
        <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <span className="hidden sm:inline">Feed Sliders</span>
      </button>
    </div>
  );
};
