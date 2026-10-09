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
  const [activeCountry, setActiveCountry] = useState('PK');
  const [activeTimeframe, setActiveTimeframe] = useState<'1h' | '24h'>('24h');
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [currentTag, setCurrentTag] = useState<string | null>(selectedTag || null);
  const [tagYaps, setTagYaps] = useState<Yap[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getTrending(activeCountry, activeTimeframe).then(setTrending);
  }, [activeCountry, activeTimeframe]);

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
      {/* Regional Trending Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Explore & Regional Trends</h2>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTimeframe('1h')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTimeframe === '1h' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Past Hour
            </button>
            <button
              onClick={() => setActiveTimeframe('24h')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTimeframe === '24h' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              24 Hours
            </button>
          </div>
        </div>

        {/* Country Selector Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { code: 'PK', label: '🇵🇰 Pakistan' },
            { code: 'SG', label: '🇸🇬 Singapore' },
            { code: 'US', label: '🇺🇸 United States' },
            { code: 'GLOBAL', label: '🌐 Global' },
          ].map((c) => (
            <button
              key={c.code}
              onClick={() => setActiveCountry(c.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                activeCountry === c.code
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Trending Tags Grid */}
        <div className="grid grid-cols-2 gap-3">
          {trending.map((t, idx) => (
            <div
              key={t.tag}
              onClick={() => setCurrentTag(t.tag)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                currentTag === t.tag
                  ? 'bg-blue-50/80 border-blue-300'
                  : 'bg-slate-50/60 border-slate-100 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-[10px] text-slate-400 font-mono">#{idx + 1} Trending</span>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                {t.tag}
              </h4>
              <span className="text-xs text-slate-400">{t.count.toLocaleString()} yaps</span>
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

          {/* Quick Demo Post about Tag */}
          <div className="p-4 bg-white rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
            Viewing real-time discussion for #{currentTag} in {activeCountry}.
          </div>
        </div>
      )}
    </div>
  );
};
