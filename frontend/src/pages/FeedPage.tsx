import React, { useState, useEffect } from 'react';
import { YapComposer } from '../components/yaps/YapComposer';
import { YapCard } from '../components/yaps/YapCard';
import { FeedTabs } from '../components/feed/FeedTabs';
import { Yap, FeedSliderSettings } from '../types';
import { api } from '../api/apiClient';

interface FeedPageProps {
  onOpenThread: (yap: Yap) => void;
  onOpenQuote: (yap: Yap) => void;
  onOpenSliders: () => void;
  sliderSettings: FeedSliderSettings;
}

export const FeedPage: React.FC<FeedPageProps> = ({
  onOpenThread,
  onOpenQuote,
  onOpenSliders,
  sliderSettings,
}) => {
  const [feedMode, setFeedMode] = useState<'ranked' | 'chronological' | 'regional'>('ranked');
  const [yaps, setYaps] = useState<Yap[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const mode = feedMode === 'chronological' ? 'chronological' : 'ranked';
      const country = feedMode === 'regional' ? 'PK' : undefined;
      const res = await api.getFeed(mode, sliderSettings, country);
      setYaps(res.yaps);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [feedMode, sliderSettings]);

  const handleYapCreated = (newYap: Yap) => {
    setYaps([newYap, ...yaps]);
  };

  const handleDeleteYap = async (yapId: string) => {
    setYaps(yaps.filter((y) => y.id !== yapId));
    await api.createYap('', []);
  };

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6">
      {/* Feed Tabs with Stage 1 indicator */}
      <FeedTabs
        currentTab={feedMode}
        onTabChange={setFeedMode}
        onOpenSliders={onOpenSliders}
      />

      {/* Yap Composer Card */}
      <YapComposer onYapCreated={handleYapCreated} />

      {/* Yaps List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-3">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-16 h-2 bg-slate-100 dark:bg-slate-850 rounded" />
                </div>
              </div>
              <div className="w-full h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
              <div className="w-full h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : yaps.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Yaps in this feed</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Be the first to yap something!</p>
        </div>
      ) : (
        <div>
          {yaps.map((yap) => (
            <YapCard
              key={yap.id}
              yap={yap}
              onOpenThread={onOpenThread}
              onOpenQuote={onOpenQuote}
              onDeleteYap={handleDeleteYap}
            />
          ))}
        </div>
      )}
    </div>
  );
};
