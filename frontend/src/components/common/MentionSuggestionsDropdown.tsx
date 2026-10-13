import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { MentionCandidate } from '../../types';
import { getAvatarUrl } from '../../utils/avatar';

interface MentionSuggestionsDropdownProps {
  candidates: MentionCandidate[];
  isOpen: boolean;
  onSelect: (candidate: MentionCandidate) => void;
  activeIndex: number;
  className?: string;
}

export const MentionSuggestionsDropdown: React.FC<MentionSuggestionsDropdownProps> = ({
  candidates,
  isOpen,
  onSelect,
  activeIndex,
  className = '',
}) => {
  if (!isOpen || candidates.length === 0) return null;

  return (
    <div
      className={`absolute z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto animate-fadeIn min-w-[240px] max-w-sm ${className}`}
    >
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        Mention suggestions
      </div>
      <div className="p-1 space-y-0.5">
        {candidates.map((candidate, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={candidate.id}
              type="button"
              onMouseDown={(e) => {
                // Prevent input from losing focus before selection is applied
                e.preventDefault();
                onSelect(candidate);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <img
                  src={getAvatarUrl(candidate.avatar_url)}
                  alt={candidate.display_name}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold truncate">
                      {candidate.display_name}
                    </span>
                    {candidate.is_verified && (
                      <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500 text-white flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    @{candidate.username}
                  </p>
                </div>
              </div>

              {candidate.is_connected && (
                <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
                  Follower
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
