import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Sliders, ExternalLink, Sparkles } from 'lucide-react';
import { api } from '../../api/apiClient';
import { TrendingTopic } from '../../types';

interface RightWidgetSidebarProps {
  onSelectHashtag: (tag: string) => void;
  onOpenSliders: () => void;
  onOpenAiStudio: () => void;
}

export const RightWidgetSidebar: React.FC<RightWidgetSidebarProps> = ({
  onSelectHashtag,
  onOpenSliders,
  onOpenAiStudio,
}) => {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [timeframe, setTimeframe] = useState<'1h' | '24h'>('24h');
  const [country, setCountry] = useState('PK');
  const [followedList, setFollowedList] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.getTrending(country, timeframe).then(setTopics);
  }, [country, timeframe]);

  const followSuggestions = [
    {
      id: 'd4444444-4444-4444-4444-444444444444',
      name: 'Hamza Khan',
      username: 'hamza_tech',
      country: '🇵🇰',
      bio: 'Karachi tech scene insider',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    },
    {
      id: 'e5555555-5555-5555-5555-555555555555',
      name: 'Zainab Qureshi',
      username: 'zainab_writes',
      country: '🇵🇰',
      bio: 'Journalist & Roman Urdu storyteller',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
  ];

  const handleToggleFollow = async (id: string) => {
    setFollowedList((prev) => ({ ...prev, [id]: !prev[id] }));
    await api.toggleFollow(id);
  };

  return (
    <aside className="w-80 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto hidden lg:block select-none">
      {/* PulseAi Banner Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 text-white shadow-md shadow-blue-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
              PulseAi Feature
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <h3 className="font-bold text-sm tracking-tight">AI Summaries & Polish</h3>
          <p className="text-xs text-blue-100 mt-1 leading-relaxed">
            Groq & Gemini Flash summarize long yap threads and optimize your posts in seconds.
          </p>
          <button
            onClick={onOpenAiStudio}
            className="mt-3 px-3 py-1.5 bg-white text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm"
          >
            Launch AI Studio →
          </button>
        </div>
      </div>

      {/* Regional Trending Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Regional Trending</h3>
          </div>
          {/* Timeframe Pill */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
            <button
              onClick={() => setTimeframe('1h')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                timeframe === '1h' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              1h
            </button>
            <button
              onClick={() => setTimeframe('24h')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                timeframe === '24h' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              24h
            </button>
          </div>
        </div>

        {/* Country Selector */}
        <div className="flex gap-2 mb-3">
          {['PK', 'SG', 'GLOBAL'].map((c) => (
            <button
              key={c}
              onClick={() => setCountry(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                country === c
                  ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {c === 'PK' ? '🇵🇰 Pakistan' : c === 'SG' ? '🇸🇬 Singapore' : '🌐 Global'}
            </button>
          ))}
        </div>

        {/* Trending List */}
        <div className="space-y-2">
          {topics.map((t, index) => (
            <div
              key={t.tag}
              onClick={() => onSelectHashtag(t.tag)}
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
            >
              <div>
                <span className="text-[11px] text-slate-400 font-mono">#{index + 1} Trending</span>
                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  #{t.tag}
                </p>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {t.count.toLocaleString()} yaps
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Who To Follow Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Who To Follow</h3>
        </div>

        <div className="space-y-3">
          {followSuggestions.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={item.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{item.name}</p>
                    <span className="text-[10px]">{item.country}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">@{item.username}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleFollow(item.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  followedList[item.id]
                    ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
              >
                {followedList[item.id] ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Stage 1 Algorithm Info Card */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-3.5 text-xs text-slate-600 space-y-2">
        <div className="flex items-center justify-between font-semibold text-slate-800">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Stage 1 Ranking Active
          </span>
          <button onClick={onOpenSliders} className="text-blue-600 hover:underline text-[11px]">
            Adjust
          </button>
        </div>
        <p className="text-[11px] text-slate-500 leading-normal font-mono bg-white p-2 rounded-lg border border-slate-200/60">
          score = (likes×1 + replies×3 + reyaps×2) × decay + affinity
        </p>
      </div>

      {/* Footer Info */}
      <div className="px-2 text-[11px] text-slate-400 leading-relaxed">
        <p>© 2026 Yapr Inc. Built with Express, React, Tailwind, Supabase Postgres & Redis.</p>
      </div>
    </aside>
  );
};
