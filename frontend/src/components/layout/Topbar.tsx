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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-4">
      {/* Search Input Container - Image 1 Style */}
      <div className="flex-1 max-w-xl relative" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setIsOpen(true)}
            placeholder="Search Yapr (supports Roman Urdu: khabar, acha, bhai)..."
            className="w-full pl-11 pr-10 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm text-slate-900 placeholder-slate-400 rounded-full border border-transparent focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Popup Dropdown */}
        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 max-h-96 overflow-y-auto z-50">
            {expandedTerms.length > 1 && (
              <div className="px-3 py-1.5 mb-1 bg-blue-50/70 rounded-xl text-xs text-blue-700 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold">Roman Urdu variants:</span>
                {expandedTerms.map((term, i) => (
                  <span key={i} className="bg-white/90 px-1.5 py-0.5 rounded text-[11px] font-mono">
                    {term}
                  </span>
                ))}
              </div>
            )}

            {loading ? (
              <div className="p-4 text-center text-xs text-slate-400">Searching yaps, people & topics...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">No results found for &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              <div className="space-y-1">
                {results.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectSearchResult?.(item);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                        {item.type === 'hashtag' ? '#' : '@'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 truncate">{item.title}</span>
                        {item.country_code && <span className="text-[10px]">{item.country_code === 'PK' ? '🇵🇰' : '🌐'}</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
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
        {/* PulseAi Assistant Studio Button */}
        <button
          onClick={onOpenAiStudio}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-colors"
          title="Open PulseAi Studio (Summaries & AI Polish)"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Pulse AI Studio</span>
        </button>

        {/* Algorithm Tuning Trigger */}
        <button
          onClick={onOpenSliders}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          title="Tune Stage 1 Algorithm Weights"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Notifications Icon with Badge */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </button>

        {/* Active User Avatar */}
        {user && (
          <img
            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user.display_name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
          />
        )}
      </div>
    </header>
  );
};
