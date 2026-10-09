import React, { useState, useEffect, useRef } from 'react';
import { X, Send, CheckCircle2, HelpCircle, FileText, AlertCircle, Image, Loader2, Smile } from 'lucide-react';
import { Yap } from '../../types';
import { api } from '../../api/apiClient';
import { formatTimeAgo } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

interface ReplyThreadModalProps {
  yap: Yap | null;
  onClose: () => void;
  onYapReplied?: () => void;
  onOpenProfile?: (username: string) => void;
}

const EMOJI_LIST = [
  '❤️', '🔥', '😂', '👍', '👏', '🎉', '🚀', '💡',
  '💯', '🤝', '🙌', '👀', '✨', '🤩', '🤯', '🥺',
  '💀', '🎯', '💬', '⚡', '🥳', '😎', '🙏', '💪',
  '😍', '🤔', '👋', '✅'
];

export const ReplyThreadModal: React.FC<ReplyThreadModalProps> = ({
  yap,
  onClose,
  onYapReplied,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Yap[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [taggedLabel, setTaggedLabel] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (yap) {
      setLoading(true);
      api.getReplies(yap.id).then((data) => {
        setReplies(data);
        setLoading(false);
      });
    }
  }, [yap]);

  if (!yap) return null;

  const tagOptions = [
    { label: 'Agree', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' },
    { label: 'Disagree', icon: AlertCircle, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800' },
    { label: 'Question', icon: HelpCircle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' },
    { label: 'Source', icon: FileText, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800' },
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mediaUrls.length >= 4) {
      alert('You can attach up to 4 images');
      return;
    }
    setIsUploading(true);
    try {
      const res = await api.uploadMedia(file);
      setMediaUrls((prev) => [...prev, res.url]);
    } catch (err: any) {
      alert(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyText.trim() && mediaUrls.length === 0) || isSubmitting) return;

    const currentText = replyText.trim();
    const currentMedia = [...mediaUrls];
    const currentLabel = taggedLabel;
    const tempId = `temp-${Date.now()}`;

    // 0ms Optimistic UI update
    const optimisticReply: Yap = {
      id: tempId,
      author_id: user?.id || 'me',
      parent_id: yap.id,
      body: currentText,
      media: currentMedia,
      tagged_label: currentLabel,
      like_count: 0,
      reply_count: 0,
      reyap_count: 0,
      created_at: new Date().toISOString(),
      author: user || {
        id: 'me',
        username: 'me',
        display_name: 'You',
        country_code: 'PK',
        follower_count: 0,
        following_count: 0,
      },
    };

    setReplies((prev) => [...prev, optimisticReply]);
    yap.reply_count = (yap.reply_count || 0) + 1;
    setReplyText('');
    setMediaUrls([]);
    setTaggedLabel(null);
    setShowEmojiBar(false);
    setIsSubmitting(true);

    try {
      const newReply = await api.createYap(
        currentText,
        currentMedia,
        currentLabel || undefined,
        yap.author?.country_code || 'PK',
        yap.id // Critical: pass parent Yap ID
      );

      setReplies((prev) => prev.map((r) => (r.id === tempId ? newReply : r)));
      onYapReplied?.();
    } catch (err: any) {
      setReplies((prev) => prev.filter((r) => r.id !== tempId));
      yap.reply_count = Math.max(0, (yap.reply_count || 1) - 1);
      alert(err.message || 'Failed to submit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render text with clickable links, hashtags, and emojis
  const renderFormattedText = (text: string) => {
    // Regex splits by URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-700 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Thread Conversation</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Conversation Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Parent Yap */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={
                  yap.author?.avatar_url ||
                  (yap as any).avatar_url ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${yap.author?.username || yap.author_id || 'yapr'}`
                }
                alt=""
                onClick={() => {
                  const uname = yap.author?.username || (yap as any).username;
                  if (uname) onOpenProfile?.(uname);
                }}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 cursor-pointer"
              />
              <div
                onClick={() => {
                  const uname = yap.author?.username || (yap as any).username;
                  if (uname) onOpenProfile?.(uname);
                }}
                className="cursor-pointer"
              >
                <h4 className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 transition-colors">
                  {yap.author?.display_name || (yap as any).display_name || 'Yapr User'}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  @{yap.author?.username || (yap as any).username || 'yapr'} · {formatTimeAgo(yap.created_at)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {renderFormattedText(yap.body)}
            </p>

            {/* Parent Media preview */}
            {yap.media && yap.media.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto py-1">
                {yap.media.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={url}
                      alt="Attached media"
                      className="w-24 h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Replies divider */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
            <span>Replies ({replies.length})</span>
            <div className="flex-1 border-t border-slate-100 dark:border-slate-800" />
          </div>

          {/* Replies List */}
          {loading ? (
            <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">Loading replies...</div>
          ) : replies.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
              No replies yet. Be the first to start the discussion!
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={
                          r.author?.avatar_url ||
                          (r as any).avatar_url ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${r.author?.username || r.author_id || 'yapr'}`
                        }
                        alt=""
                        onClick={() => {
                          const uname = r.author?.username || (r as any).username;
                          if (uname) onOpenProfile?.(uname);
                        }}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-100 dark:ring-slate-700 cursor-pointer"
                      />
                      <div
                        onClick={() => {
                          const uname = r.author?.username || (r as any).username;
                          if (uname) onOpenProfile?.(uname);
                        }}
                        className="cursor-pointer"
                      >
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors">
                          {r.author?.display_name || (r as any).display_name || 'Yapr User'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5">
                          {formatTimeAgo(r.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Tagged reply label badge */}
                    {r.tagged_label && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {r.tagged_label}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {renderFormattedText(r.body)}
                  </p>

                  {/* Attached media images */}
                  {r.media && r.media.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto py-1">
                      {r.media.map((url, mi) => (
                        <a key={mi} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt="Reply photo"
                            className="w-20 h-20 object-cover rounded-xl border border-slate-200 dark:border-slate-700 hover:opacity-90 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Composer Form */}
        <form
          onSubmit={handlePostReply}
          className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
        >
          {/* Tagged Reply Selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">Tag reply:</span>
            {tagOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = taggedLabel === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setTaggedLabel(isSelected ? null : opt.label)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    isSelected
                      ? opt.color
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Emoji bar */}
          {showEmojiBar && (
            <div className="p-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Choose Emoji</span>
                <button
                  type="button"
                  onClick={() => setShowEmojiBar(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setReplyText((prev) => prev + emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded media previews */}
          {mediaUrls.length > 0 && (
            <div className="flex gap-2 py-1">
              {mediaUrls.map((url, i) => (
                <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setMediaUrls(mediaUrls.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Reply Input Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your comment or reply... (links & emojis supported)"
              className="flex-1 px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
            />

            {/* Emoji toggle button */}
            <button
              type="button"
              onClick={() => setShowEmojiBar(!showEmojiBar)}
              title="Add Emoji"
              className={`p-2 rounded-xl border transition-colors ${
                showEmojiBar
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-800'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            {/* Photo upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Attach Photo"
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Image className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Submit button */}
            <button
              type="submit"
              disabled={(!replyText.trim() && mediaUrls.length === 0) || isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              <span>Reply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
