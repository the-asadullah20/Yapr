import React, { useState, useRef } from 'react';
import { Image, Sparkles, Send, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/apiClient';
import { Yap } from '../../types';
import { isVideoUrl } from '../../utils/formatters';
import { useMentionAutocomplete } from '../../hooks/useMentionAutocomplete';
import { MentionSuggestionsDropdown } from '../common/MentionSuggestionsDropdown';

interface YapComposerProps {
  onYapCreated: (yap: Yap) => void;
  defaultHashtag?: string;
}

export const YapComposer: React.FC<YapComposerProps> = ({ onYapCreated, defaultHashtag }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(defaultHashtag ? `#${defaultHashtag} ` : '');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [countryCode, setCountryCode] = useState(user?.country_code || 'PK');
  const [isPolishing, setIsPolishing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mention = useMentionAutocomplete(body, setBody, textareaRef);

  const handlePolishAi = async () => {
    if (!body.trim()) return;
    setIsPolishing(true);
    try {
      const res = await api.polishYap(body);
      setBody(res.polished);
    } catch {
      // fallback
    } finally {
      setIsPolishing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaUrls.length + files.length > 4) {
      alert('You can attach a maximum of 4 media items per Yap');
      return;
    }

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 20MB maximum upload limit.`);
        return;
      }
    }

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file) => api.uploadMedia(file));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map((r) => r.url);
      setMediaUrls((prev) => [...prev, ...newUrls].slice(0, 4));
    } catch (err: any) {
      alert(err.message || 'Failed to upload media. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddMediaUrl = (url: string) => {
    if (url && !mediaUrls.includes(url) && mediaUrls.length < 4) {
      setMediaUrls([...mediaUrls, url]);
      setImageUrlInput('');
      setShowImageInput(false);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!body.trim() && mediaUrls.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newYap = await api.createYap(body.trim(), mediaUrls, undefined, countryCode);
      onYapCreated(newYap);
      setBody('');
      setMediaUrls([]);
    } catch (err: any) {
      alert(err.message || 'Failed to post Yap');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm mb-4 transition-colors">
      <div className="pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Yap Thoughts</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 items-start">
          <img
            src={user?.avatar_url || (user?.username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}` : 'https://api.dicebear.com/7.x/bottts/svg?seed=yapr')}
            alt={user?.display_name || ''}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 flex-shrink-0"
          />

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                mention.checkMention(e.target.value, e.target.selectionStart || 0);
              }}
              onKeyUp={(e) => {
                mention.checkMention(body, (e.target as HTMLTextAreaElement).selectionStart || 0);
              }}
              onClick={(e) => {
                mention.checkMention(body, (e.target as HTMLTextAreaElement).selectionStart || 0);
              }}
              onKeyDown={(e) => {
                if (mention.isOpen) {
                  const handled = mention.handleKeyDown(e);
                  if (handled) return;
                }
              }}
              placeholder="What's happening? Yap your thoughts..."
              rows={3}
              maxLength={500}
              className="w-full text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-transparent resize-none outline-none leading-relaxed"
            />

            {/* Mention suggestions dropdown */}
            <MentionSuggestionsDropdown
              candidates={mention.candidates}
              isOpen={mention.isOpen}
              onSelect={mention.applyCandidate}
              activeIndex={mention.activeIndex}
              className="top-24 left-0 mt-1"
            />

            {/* Media preview chips */}
            {mediaUrls.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto py-1">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0 group bg-black flex items-center justify-center">
                    {isVideoUrl(url) ? (
                      <video src={url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(i)}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* URL input field if open */}
            {showImageInput && (
              <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Paste image URL..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddMediaUrl(imageUrlInput)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Bottom composer controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Media file upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || mediaUrls.length >= 4}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                  title="Attach Photo or Video"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Image className="w-4 h-4" />}
                </button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* URL Paste Option Toggle */}
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium px-2 py-1"
                >
                  {showImageInput ? 'Hide URL' : 'Link URL'}
                </button>

                {/* Yapr AI Polish Button */}
                <button
                  type="button"
                  onClick={handlePolishAi}
                  disabled={isPolishing || !body.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 rounded-xl border border-blue-200 dark:border-blue-800 transition-colors"
                  title="Enhance & optimize Yap with Yapr AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{isPolishing ? 'Polishing...' : 'Polish with AI'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  {500 - body.length}
                </span>

                <button
                  type="submit"
                  disabled={(!body.trim() && mediaUrls.length === 0) || isSubmitting || isUploading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-all transform active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Posting...' : 'Yap'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
