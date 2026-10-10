import React, { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { Yap } from '../types';
import { YapCard } from '../components/yaps/YapCard';
import { api } from '../api/apiClient';

interface BookmarksPageProps {
  onOpenThread: (yap: Yap) => void;
  onOpenQuote: (yap: Yap) => void;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({
  onOpenThread,
  onOpenQuote,
}) => {
  const [bookmarkedYaps, setBookmarkedYaps] = useState<Yap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBookmarks()
      .then((res) => {
        setBookmarkedYaps(res.yaps || []);
      })
      .catch((err) => {
        console.error('Failed to fetch bookmarks:', err);
        setBookmarkedYaps([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-3 px-3 sm:px-6 space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2.5">
          <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-blue-600 dark:fill-blue-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Saved Yaps</h2>
        </div>
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
          {bookmarkedYaps.length} {bookmarkedYaps.length === 1 ? 'yap' : 'yaps'}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500">Loading saved yaps...</div>
      ) : bookmarkedYaps.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center transition-colors">
          <Bookmark className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No bookmarks saved yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
            Tap the bookmark icon on any yap in your feed to save it here for later.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarkedYaps.map((yap) => (
            <YapCard
              key={yap.id}
              yap={yap}
              onOpenThread={onOpenThread}
              onOpenQuote={onOpenQuote}
            />
          ))}
        </div>
      )}
    </div>
  );
};
