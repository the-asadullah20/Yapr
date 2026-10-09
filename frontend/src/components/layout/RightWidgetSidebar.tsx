import React, { useState, useEffect } from 'react';
import { TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '../../api/apiClient';
import { TrendingTopic } from '../../types';

interface RightWidgetSidebarProps {
  onSelectHashtag: (tag: string) => void;
  onOpenSliders: () => void;
  onOpenAiStudio: () => void;
}

export const RightWidgetSidebar: React.FC<RightWidgetSidebarProps> = ({
  onSelectHashtag,
  onOpenAiStudio,
}) => {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [timeframe, setTimeframe] = useState<'1h' | '24h'>('24h');
  const [country, setCountry] = useState('PK');

  useEffect(() => {
    api.getTrending(country, timeframe).then(setTopics).catch(() => setTopics([]));
  }, [country, timeframe]);

  return (
    <aside className="w-80 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto hidden lg:block select-none transition-colors">
      {/* Yapr AI Banner Card */}
      <div className="p-4 rounded-2xl bg-blue-600 dark:bg-blue-700 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase">
              Yapr AI
            </span>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="font-bold text-sm tracking-tight">AI Summaries & Polish</h3>
          <p className="text-xs text-blue-100 mt-1 leading-relaxed">
            Groq Llama 3.3 & Gemini Flash summarize yap threads and optimize your posts in seconds.
          </p>
          <button
            onClick={onOpenAiStudio}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-50 transition-colors shadow-sm"
          >
            <span>Launch Yapr AI</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Regional Trending Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Trending Topics</h3>
          </div>
          {/* Timeframe Pill */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              onClick={() => setTimeframe('1h')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                timeframe === '1h' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              1h
            </button>
            <button
              onClick={() => setTimeframe('24h')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                timeframe === '24h' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              24h
            </button>
          </div>
        </div>

        {/* Country Selector */}
        <div className="flex gap-1.5 mb-3">
          {[
            { id: 'PK', label: 'Pakistan' },
            { id: 'SG', label: 'Singapore' },
            { id: 'GLOBAL', label: 'Global' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCountry(c.id)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                country === c.id
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Trending List */}
        {topics.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">No trending topics yet</p>
        ) : (
          <div className="space-y-2">
            {topics.map((t, index) => (
              <div
                key={t.tag}
                onClick={() => onSelectHashtag(t.tag)}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
              >
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">#{index + 1} Trending</span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    #{t.tag}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {t.count.toLocaleString()} yaps
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-2 text-[11px] text-slate-400 dark:text-slate-600 leading-relaxed">
        <p>© 2026 Yapr Inc. All rights reserved.</p>
      </div>
    </aside>
  );
};
