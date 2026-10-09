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
  X,
  UserCheck,
  UserPlus,
  Globe,
} from 'lucide-react';
import { Yap, UserProfile } from '../../types';
import { YapMediaGrid } from './YapMediaGrid';
import { formatTimeAgo, formatCompactNumber } from '../../utils/formatters';
import { api } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

interface YapCardProps {
  yap: Yap;
  onOpenThread: (yap: Yap) => void;
  onOpenQuote?: (yap: Yap) => void;
  onHashtagClick?: (tag: string) => void;
  onDeleteYap?: (yapId: string) => void;
  onOpenProfile?: (username: string) => void;
}

export const YapCard: React.FC<YapCardProps> = ({
  yap,
  onOpenThread,
  onHashtagClick,
  onDeleteYap,
  onOpenProfile,
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

  // Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationText, setTranslationText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('Urdu');
  const [loadingTranslation, setLoadingTranslation] = useState(false);

  // Likers modal state
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [likersList, setLikersList] = useState<UserProfile[]>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);

  // Quick reply input
  const [quickReplyText, setQuickReplyText] = useState('');
  const [showQuickEmoji, setShowQuickEmoji] = useState(false);
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

  const handleOpenLikers = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLikersModal(true);
    setLoadingLikers(true);
    try {
      const list = await api.getYapLikers(yap.id);
      setLikersList(list);
    } catch {
      setLikersList([]);
    } finally {
      setLoadingLikers(false);
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

  const handleTranslate = async (lang?: string) => {
    const languageToUse = lang || targetLanguage;
    if (lang) setTargetLanguage(lang);
    setShowTranslation(true);
    setLoadingTranslation(true);
    try {
      const res = await api.translateYap(yap.body, languageToUse);
      setTranslationText(res.translation);
    } catch {
      setTranslationText('Translation currently unavailable.');
    } finally {
      setLoadingTranslation(false);
    }
  };

  const handleQuickReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReplyText.trim() || isReplying) return;

    setIsReplying(true);
    try {
      await api.createYap(quickReplyText, [], undefined, yap.author?.country_code || 'PK', yap.id);
      yap.reply_count = (yap.reply_count || 0) + 1;
      setQuickReplyText('');
    } catch (err: any) {
      alert(err.message || 'Reply failed');
    } finally {
      setIsReplying(false);
    }
  };

  // Render body with clickable hashtag and URL highlights
  const renderFormattedBody = (text: string) => {
    const regex = /(https?:\/\/[^\s]+|#[a-zA-Z0-9_]+)/g;
    const parts = text.split(regex);
    return parts.map((part, index) => {
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-700 break-all"
          >
            {part}
          </a>
        );
      }
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

  const authorUsername = yap.author?.username || (yap as any).username;

  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-hover transition-all duration-200 mb-4 relative">
      {/* Header: Author + Timestamp + Options */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={
              yap.author?.avatar_url ||
              (yap as any).avatar_url ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${authorUsername || yap.author_id || 'yapr'}`
            }
            alt={yap.author?.display_name || (yap as any).display_name || ''}
            onClick={() => {
              if (authorUsername) onOpenProfile?.(authorUsername);
            }}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 bg-slate-100 dark:bg-slate-800 cursor-pointer hover:ring-blue-500 transition-all"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3
                onClick={() => {
                  if (authorUsername) onOpenProfile?.(authorUsername);
                }}
                className="text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
              >
                {yap.author?.display_name || (yap as any).display_name || 'Yapr User'}
              </h3>
              {(yap.author?.is_verified || (yap as any).is_verified) && (
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                  ✓
                </span>
              )}
              <span
                onClick={() => {
                  if (authorUsername) onOpenProfile?.(authorUsername);
                }}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-blue-500 cursor-pointer"
              >
                @{authorUsername || 'yapr'}
              </span>
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
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Yap</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      if (authorUsername) onOpenProfile?.(authorUsername);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </button>
                  <button
                    onClick={async () => {
                      await api.blockUser(yap.author_id);
                      alert('User blocked');
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Block Author</span>
                  </button>
                  <button
                    onClick={async () => {
                      await api.reportContent({ yapId: yap.id, reason: 'Reported by user' });
                      alert('Report submitted for review');
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Yap</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Yap Post Body */}
      <div className="mt-3 cursor-pointer" onClick={() => onOpenThread(yap)}>
        <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
          {renderFormattedBody(yap.body)}
        </p>

        {/* Media Grid */}
        {yap.media && yap.media.length > 0 && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <YapMediaGrid media={yap.media} />
          </div>
        )}
      </div>

      {/* AI Summary & Language Translation Controls */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* AI Summary Toggle */}
          <button
            onClick={handleSummarize}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{showSummary ? 'Hide AI Summary' : 'AI Yap Summary'}</span>
          </button>

          {/* Translate To Dropdown */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              Translate to:
            </span>
            <select
              value={targetLanguage}
              onChange={(e) => {
                const newLang = e.target.value;
                setTargetLanguage(newLang);
                handleTranslate(newLang);
              }}
              className="bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="Urdu">Urdu (اردو)</option>
              <option value="Roman Urdu">Roman Urdu</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Arabic">Arabic (العربية)</option>
              <option value="Spanish">Spanish (Español)</option>
              <option value="French">French (Français)</option>
              <option value="German">German (Deutsch)</option>
              <option value="Chinese">Chinese (中文)</option>
              <option value="Japanese">Japanese (日本語)</option>
            </select>
            <button
              onClick={() => handleTranslate()}
              disabled={loadingTranslation}
              className="px-2 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg font-semibold text-[11px] border border-blue-200 dark:border-blue-800 transition-colors"
            >
              {loadingTranslation ? '...' : 'Translate'}
            </button>
          </div>
        </div>

        {/* AI Summary Result Card */}
        {showSummary && (
          <div className="mt-2.5 p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900 text-xs text-slate-700 dark:text-slate-300 leading-relaxed animate-fadeIn">
            {loadingSummary ? (
              <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Generating AI Summary...
              </span>
            ) : (
              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {summaryText.replace(/^TL;DR\s*:?\s*/i, '').replace(/\*{1,4}/g, '').trim()}
              </p>
            )}
          </div>
        )}

        {/* AI Translation Result Card */}
        {showTranslation && (
          <div className="mt-2.5 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 text-xs text-slate-800 dark:text-slate-200 leading-relaxed animate-fadeIn">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-emerald-100 dark:border-emerald-900/50">
              <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Translation ({targetLanguage})
              </span>
              <button
                onClick={() => setShowTranslation(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            {loadingTranslation ? (
              <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400 py-1">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                Translating post into {targetLanguage}...
              </span>
            ) : (
              <p className="whitespace-pre-wrap text-slate-900 dark:text-slate-100 font-medium">
                {translationText.replace(/<\/?[^>]+(>|$)/g, '').replace(/\*{1,4}/g, '').trim()}
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

        {/* Likes + View Likers List */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleLike}
            className={`p-1 rounded-full transition-colors ${
              isLiked ? 'text-rose-600' : 'hover:text-rose-600'
            }`}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <button
            onClick={handleOpenLikers}
            className="hover:underline hover:text-rose-600 transition-colors"
            title="View people who liked this post"
          >
            {formatCompactNumber(likeCount)} Likes
          </button>
        </div>

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

      {/* Quick Reply Bar with Emoji Support */}
      <div className="relative">
        {showQuickEmoji && (
          <div className="absolute bottom-12 right-6 p-2.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-20 max-w-[280px] animate-fadeIn">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Add Emoji</span>
              <button
                type="button"
                onClick={() => setShowQuickEmoji(false)}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-0.5">
              {['❤️', '🔥', '😂', '👍', '👏', '🎉', '🚀', '💯', '✨', '🤩', '💀', '😍', '🤔', '🙌', '👀', '🥳', '😎', '🙏'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setQuickReplyText((prev) => prev + emoji);
                    setShowQuickEmoji(false);
                  }}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-base hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleQuickReplySubmit} className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
          <img
            src={
              user?.avatar_url ||
              (user?.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}` : 'https://api.dicebear.com/7.x/bottts/svg?seed=me')
            }
            alt=""
            className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
          />

          <div className="flex-1 min-w-0 flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-200/80 dark:border-slate-700 focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
            <input
              type="text"
              value={quickReplyText}
              onChange={(e) => setQuickReplyText(e.target.value)}
              placeholder="Write your comment..."
              className="flex-1 min-w-0 bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />

            <div className="flex items-center gap-1.5 text-slate-400">
              <button
                type="button"
                onClick={() => setShowQuickEmoji(!showQuickEmoji)}
                className={`p-0.5 transition-colors ${showQuickEmoji ? 'text-amber-500' : 'hover:text-amber-500'}`}
                title="Add emoji"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onOpenThread(yap)}
                className="hover:text-blue-600 dark:hover:text-blue-400 p-0.5"
                title="Open full reply thread"
              >
                <Paperclip className="w-3.5 h-3.5" />
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
      </div>

      {/* Likers Modal */}
      {showLikersModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowLikersModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Liked By</h3>
              </div>
              <button
                onClick={() => setShowLikersModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 max-h-72 overflow-y-auto space-y-2.5">
              {loadingLikers ? (
                <p className="text-center text-xs text-slate-400 py-4">Loading likes...</p>
              ) : likersList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4">No likes recorded yet.</p>
              ) : (
                likersList.map((liker) => (
                  <div
                    key={liker.id}
                    onClick={() => {
                      setShowLikersModal(false);
                      onOpenProfile?.(liker.username);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={liker.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${liker.username}`}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-100 dark:ring-slate-700"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600">
                          {liker.display_name}
                        </h4>
                        <p className="text-[10px] text-slate-400">@{liker.username}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
