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
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2 shadow-sm mb-4 flex items-center justify-between gap-2 select-none transition-colors">
      <div className="flex items-center gap-1.5 flex-1">
        <button
          onClick={() => onTabChange('ranked')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            currentTab === 'ranked'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>For You</span>
        </button>

        <button
          onClick={() => onTabChange('chronological')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            currentTab === 'chronological'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Latest</span>
        </button>

        <button
          onClick={() => onTabChange('regional')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            currentTab === 'regional'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Regional</span>
        </button>
      </div>

      <button
        onClick={onOpenSliders}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
        title="Customize Feed Algorithm Sliders"
      >
        <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="hidden sm:inline">Feed Sliders</span>
      </button>
    </div>
  );
};
