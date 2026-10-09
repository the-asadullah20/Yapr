import React, { useState } from 'react';
import {
  MessageSquare,
  Heart,
  Repeat,
  Bookmark,
  MoreHorizontal,
  Sparkles,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Send,
  Flag,
  UserX,
  Trash2,
} from 'lucide-react';
import { Yap } from '../../types';
import { YapMediaGrid } from './YapMediaGrid';
import { formatTimeAgo, formatCompactNumber } from '../../utils/formatters';
import { api } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

interface YapCardProps {
  yap: Yap;
  onOpenThread: (yap: Yap) => void;
  onOpenQuote: (yap: Yap) => void;
  onHashtagClick?: (tag: string) => void;
  onDeleteYap?: (yapId: string) => void;
}

export const YapCard: React.FC<YapCardProps> = ({
  yap,
  onOpenThread,
  onHashtagClick,
  onDeleteYap,
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(yap.is_liked || false);
  const [likeCount, setLikeCount] = useState(yap.like_count);
  const [isReyapped, setIsReyapped] = useState(yap.is_reyapped || false);
  const [reyapCount, setReyapCount] = useState(yap.reyap_count);
  const [isBookmarked, setIsBookmarked] = useState(yap.is_bookmarked || false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState(yap.summary || '');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Quick reply input
  const [quickReplyText, setQuickReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const handleLike = async () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikeCount((prev) => prev + (nextLiked ? 1 : -1));
    try {
      const res = await api.toggleLike(yap.id);
      setLikeCount(res.likeCount);
      setIsLiked(res.liked);
    } catch {
      setIsLiked(!nextLiked);
    }
  };

  const handleReyap = async () => {
    const nextReyapped = !isReyapped;
    setIsReyapped(nextReyapped);
    setReyapCount((prev) => prev + (nextReyapped ? 1 : -1));
    try {
      const res = await api.toggleReyap(yap.id);
      setReyapCount(res.reyapCount);
      setIsReyapped(res.reyapped);
    } catch {
      setIsReyapped(!nextReyapped);
    }
  };

  const handleBookmark = async () => {
    setIsBookmarked(!isBookmarked);
    await api.toggleBookmark(yap.id);
  };

  const handleSummarize = async () => {
    if (summaryText) {
      setShowSummary(!showSummary);
      return;
    }
    setLoadingSummary(true);
    setShowSummary(true);
    try {
      const res = await api.summarizeYap(yap.id, yap.body);
      setSummaryText(res.summary);
    } catch {
      setSummaryText('Summary currently unavailable.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleQuickReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReplyText.trim() || isReplying) return;

    setIsReplying(true);
    try {
      await api.createYap(quickReplyText, [], undefined, yap.author?.country_code || 'PK');
      setQuickReplyText('');
    } catch (err: any) {
      alert(err.message || 'Reply failed');
    } finally {
      setIsReplying(false);
    }
  };

  // Render body with clickable hashtag highlights
  const renderFormattedBody = (text: string) => {
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onHashtagClick?.(part.slice(1));
            }}
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-hover transition-all duration-200 mb-4 relative">
      {/* Header: Author + Timestamp + Options */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={yap.author?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
            alt={yap.author?.display_name || ''}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                {yap.author?.display_name || 'Anonymous Yapr'}
              </h3>
              {yap.author?.is_verified && (
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                  ✓
                </span>
              )}
              <span className="text-xs text-slate-400 dark:text-slate-500">@{yap.author?.username}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              <span>{formatTimeAgo(yap.created_at)}</span>
              {yap.why_label && (
                <>
                  <span>·</span>
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                    {yap.why_label}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Options Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 text-xs">
              {user?.id === yap.author_id ? (
                <button
                  onClick={() => {
                    onDeleteYap?.(yap.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Yap</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      alert('Yap reported for moderation.');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Yap</span>
                  </button>
                  <button
                    onClick={() => {
                      alert(`Blocked @${yap.author?.username}`);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Block @{yap.author?.username}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Yap Body */}
      <p className="mt-3 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
        {renderFormattedBody(yap.body)}
      </p>

      {/* Media Grid Gallery */}
      {yap.media && yap.media.length > 0 && <YapMediaGrid media={yap.media} />}

      {/* AI Summary Accordion Drawer */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleSummarize}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{showSummary ? 'Hide AI Summary' : 'AI Yap Summary (TL;DR)'}</span>
        </button>

        {showSummary && (
          <div className="mt-2 p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {loadingSummary ? (
              <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Analyzing with Gemini & Groq fallback...
              </span>
            ) : (
              <p>
                <strong className="text-blue-900 dark:text-blue-300 font-semibold">TL;DR: </strong>
                {summaryText}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Social Action Stats Bar */}
      <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
        {/* Comments */}
        <button
          onClick={() => onOpenThread(yap)}
          className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{formatCompactNumber(yap.reply_count)} Comments</span>
        </button>

        {/* Likes */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 transition-colors ${
            isLiked ? 'text-rose-600 font-semibold' : 'hover:text-rose-600'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span>{formatCompactNumber(likeCount)} Likes</span>
        </button>

        {/* Reyap / Share */}
        <button
          onClick={handleReyap}
          className={`flex items-center gap-1.5 transition-colors ${
            isReyapped ? 'text-emerald-600 font-semibold' : 'hover:text-emerald-600'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>{formatCompactNumber(reyapCount)} Share</span>
        </button>

        {/* Saved / Bookmark */}
        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 transition-colors ${
            isBookmarked ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400' : ''}`} />
          <span>{isBookmarked ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* Quick Reply Bar */}
      <form onSubmit={handleQuickReplySubmit} className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
        <img
          src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
          alt=""
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
        />

        <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-200/80 dark:border-slate-700 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
          <input
            type="text"
            value={quickReplyText}
            onChange={(e) => setQuickReplyText(e.target.value)}
            placeholder="Write your comment..."
            className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />

          <div className="flex items-center gap-1.5 text-slate-400">
            <button type="button" className="hover:text-slate-600 dark:hover:text-slate-200 p-0.5">
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="hover:text-slate-600 dark:hover:text-slate-200 p-0.5">
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="hover:text-slate-600 dark:hover:text-slate-200 p-0.5">
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {quickReplyText.trim() && (
          <button
            type="submit"
            disabled={isReplying}
            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
      </form>
    </article>
  );
};
