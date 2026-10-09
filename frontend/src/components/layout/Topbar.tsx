import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Sliders, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../api/apiClient';
import { SearchResult } from '../../types';

interface TopbarProps {
  onOpenSliders: () => void;
  onOpenNotifications: () => void;
  onOpenAiStudio: () => void;
  onSelectSearchResult?: (result: SearchResult) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenSliders,
  onOpenNotifications,
  onOpenAiStudio,
  onSelectSearchResult,
}) => {
  const { user } = useAuth();
  const { unreadCount } = useSocket();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedTerms, setExpandedTerms] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setExpandedTerms([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(searchQuery);
        setResults(data.results);
        setExpandedTerms(data.expandedTerms);
        setIsOpen(true);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-6 py-3 flex items-center justify-between gap-4 transition-colors duration-200">
      {/* Search Input Container */}
      <div className="flex-1 max-w-xl relative" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setIsOpen(true)}
            placeholder="Search Yapr"
            className="w-full pl-11 pr-10 py-2.5 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-full border border-transparent focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Popup Dropdown */}
        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-2 max-h-96 overflow-y-auto z-50">
            {expandedTerms.length > 1 && (
              <div className="px-3 py-1.5 mb-1 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold">Phonetic terms:</span>
                {expandedTerms.map((term, i) => (
                  <span key={i} className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-200/60 dark:border-slate-700">
                    {term}
                  </span>
                ))}
              </div>
            )}

            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">Searching yaps, people & topics...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">No results found for &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              <div className="space-y-1">
                {results.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectSearchResult?.(item);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                        {item.type === 'hashtag' ? '#' : '@'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.title}</span>
                        {item.country_code && (
                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[9px] font-bold">
                            {item.country_code}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Yapr AI Assistant Button */}
        <button
          onClick={onOpenAiStudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-semibold border border-blue-200/80 dark:border-blue-800 transition-colors"
          title="Open Yapr AI"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">Yapr AI</span>
        </button>

        {/* Algorithm Tuning Trigger */}
        <button
          onClick={onOpenSliders}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Tune Stage 1 Algorithm Weights"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Notifications Icon with Badge */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>

        {/* Active User Avatar */}
        {user && (
          <img
            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user.display_name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
          />
        )}
      </div>
    </header>
  );
};
