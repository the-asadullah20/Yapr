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
    <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-sm mb-4 flex items-center justify-between gap-2 select-none">
      <div className="flex items-center gap-1.5 flex-1">
        <button
          onClick={() => onTabChange('ranked')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentTab === 'ranked'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Stage 1 For You</span>
        </button>

        <button
          onClick={() => onTabChange('chronological')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentTab === 'chronological'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Latest Real-time</span>
        </button>

        <button
          onClick={() => onTabChange('regional')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            currentTab === 'regional'
              ? 'bg-blue-50 text-blue-600 shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Regional (🇵🇰 PK)</span>
        </button>
      </div>

      <button
        onClick={onOpenSliders}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
        title="Customize Stage 1 Feed Algorithm Sliders"
      >
        <Sliders className="w-3.5 h-3.5 text-blue-600" />
        <span className="hidden sm:inline">Feed Sliders</span>
      </button>
    </div>
  );
};
