import React, { useState, useEffect } from 'react';
import { X, Send, Sparkles, CheckCircle2, HelpCircle, FileText, AlertCircle } from 'lucide-react';
import { Yap } from '../../types';
import { api } from '../../api/apiClient';
import { formatTimeAgo } from '../../utils/formatters';

interface ReplyThreadModalProps {
  yap: Yap | null;
  onClose: () => void;
  onYapReplied?: () => void;
}

export const ReplyThreadModal: React.FC<ReplyThreadModalProps> = ({
  yap,
  onClose,
  onYapReplied,
}) => {
  const [replies, setReplies] = useState<Yap[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [taggedLabel, setTaggedLabel] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    { label: 'Agree', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Disagree', icon: AlertCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { label: 'Question', icon: HelpCircle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Source', icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  ];

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newReply = await api.createYap(
        replyText,
        [],
        taggedLabel || undefined,
        yap.author?.country_code || 'PK'
      );
      setReplies([...replies, newReply]);
      setReplyText('');
      setTaggedLabel(null);
      onYapReplied?.();
    } catch (err: any) {
      alert(err.message || 'Failed to submit reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-sm text-slate-900">Thread Conversation</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Conversation Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Parent Yap */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-3 mb-2">
              <img
                src={yap.author?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                alt=""
                className="w-9 h-9 rounded-full object-cover"
              />
              <div>
                <h4 className="text-xs font-bold text-slate-900">{yap.author?.display_name}</h4>
                <p className="text-[11px] text-slate-400">@{yap.author?.username} · {formatTimeAgo(yap.created_at)}</p>
              </div>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed">{yap.body}</p>
          </div>

          {/* Replies divider */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Replies ({replies.length})</span>
            <div className="flex-1 border-t border-slate-100" />
          </div>

          {/* Replies List */}
          {loading ? (
            <div className="text-center py-6 text-xs text-slate-400">Loading replies...</div>
          ) : replies.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              No replies yet. Be the first to start the discussion!
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((r) => (
                <div key={r.id} className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={r.author?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800">{r.author?.display_name}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">{formatTimeAgo(r.created_at)}</span>
                      </div>
                    </div>

                    {/* Tagged reply label badge */}
                    {r.tagged_label && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {r.tagged_label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{r.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Composer Form */}
        <form onSubmit={handlePostReply} className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
          {/* Tagged Reply Selector (PDF Feature) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Tag reply:</span>
            {tagOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = taggedLabel === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setTaggedLabel(isSelected ? null : opt.label)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    isSelected ? opt.color : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your tagged reply..."
              className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3 h-3" />
              <span>Reply</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
