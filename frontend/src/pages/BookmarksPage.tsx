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
    // In dev / mock, fetch feed and filter bookmarked yaps
    api.getFeed('chronological').then((res) => {
      setBookmarkedYaps(res.yaps.filter((y) => y.is_bookmarked));
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6 space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-2.5">
        <Bookmark className="w-5 h-5 text-blue-600 fill-blue-600" />
        <h2 className="text-base font-bold text-slate-900">Your Bookmarks</h2>
      </div>

      {loading ? (
        <div className="text-center py-10 text-xs text-slate-400">Loading saved yaps...</div>
      ) : bookmarkedYaps.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
          <p className="text-sm font-semibold text-slate-800">No bookmarks saved yet</p>
          <p className="text-xs text-slate-400 mt-1">Tap the bookmark icon on any yap to save it here for later.</p>
        </div>
      ) : (
        <div>
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
