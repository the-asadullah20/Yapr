import React, { useState, useEffect } from 'react';
import { TrendingUp, Globe, Sparkles, Hash } from 'lucide-react';
import { api } from '../api/apiClient';
import { TrendingTopic, Yap } from '../types';
import { YapCard } from '../components/yaps/YapCard';

interface ExplorePageProps {
  onOpenThread: (yap: Yap) => void;
  onOpenQuote: (yap: Yap) => void;
  selectedTag?: string;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  onOpenThread,
  onOpenQuote,
  selectedTag,
}) => {
  const [activeTimeframe, setActiveTimeframe] = useState<'1h' | '24h'>('24h');
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [currentTag, setCurrentTag] = useState<string | null>(selectedTag || null);
  const [tagYaps, setTagYaps] = useState<Yap[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getTrending('GLOBAL', activeTimeframe).then(setTrending);
  }, [activeTimeframe]);

  useEffect(() => {
    if (currentTag) {
      setLoading(true);
      api.search(`#${currentTag}`, 'yaps').then((_res: any) => {
        setLoading(false);
      });
    }
  }, [currentTag]);

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6 space-y-5">
      {/* Trending Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Trending on Yapr</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Conversations happening right now across the platform</p>
            </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTimeframe('1h')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTimeframe === '1h'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Past Hour
            </button>
            <button
              onClick={() => setActiveTimeframe('24h')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTimeframe === '24h'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              24 Hours
            </button>
          </div>
        </div>

        {/* Trending Tags Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trending.map((t, idx) => (
            <div
              key={t.tag}
              onClick={() => setCurrentTag(t.tag)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                currentTag === t.tag
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
                  : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-[10px] text-slate-400 font-mono">#{idx + 1} Trending</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {t.tag}
              </h4>
              <span className="text-xs text-slate-400 dark:text-slate-500">{t.count.toLocaleString()} yaps</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Tag Yaps View */}
      {currentTag && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Yaps tagged with <span className="text-blue-600">#{currentTag}</span>
            </h3>
            <button
              onClick={() => setCurrentTag(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Clear filter
            </button>
          </div>

          {/* Real-time Tag Banner */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed shadow-sm">
            Viewing real-time discussions for <span className="font-bold text-blue-600 dark:text-blue-400">#{currentTag}</span> across Yapr.
          </div>
        </div>
      )}
    </div>
  );
};
