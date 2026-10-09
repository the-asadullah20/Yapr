import React, { useState } from 'react';
import { Image, Sparkles, Send, Globe, X, Tag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/apiClient';
import { Yap } from '../../types';

interface YapComposerProps {
  onYapCreated: (yap: Yap) => void;
  defaultHashtag?: string;
}

export const YapComposer: React.FC<YapComposerProps> = ({ onYapCreated, defaultHashtag }) => {
  const { user } = useAuth();
  const [body, setBody] = useState(defaultHashtag ? `#${defaultHashtag} ` : '');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [countryCode, setCountryCode] = useState(user?.country_code || 'PK');
  const [taggedLabel, setTaggedLabel] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sampleImages = [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
  ];

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

  const handleAddMedia = (url: string) => {
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
    if (!body.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newYap = await api.createYap(body, mediaUrls, taggedLabel || undefined, countryCode);
      onYapCreated(newYap);
      setBody('');
      setMediaUrls([]);
      setTaggedLabel(null);
    } catch (err: any) {
      alert(err.message || 'Failed to post Yap');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm mb-4">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-50">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Post Something</h3>
        <div className="flex items-center gap-2">
          {/* Country indicator */}
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none"
          >
            <option value="PK">🇵🇰 Pakistan</option>
            <option value="US">🇺🇸 United States</option>
            <option value="SG">🇸🇬 Singapore</option>
            <option value="GB">🇬🇧 United Kingdom</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 items-start">
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt=""
            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 flex-shrink-0"
          />

          <div className="flex-1">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind? (English, Urdu, or Roman Urdu)..."
              rows={3}
              maxLength={500}
              className="w-full text-sm text-slate-900 placeholder-slate-400 bg-transparent resize-none outline-none leading-relaxed"
            />

            {/* Media preview chips */}
            {mediaUrls.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto py-1">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
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
              <div className="mb-3 p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="Paste image URL..."
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddMedia(imageUrlInput)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                {/* Preset image suggestions */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Quick demo presets:</span>
                  {sampleImages.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddMedia(s)}
                      className="underline text-blue-600 hover:text-blue-800"
                    >
                      Photo {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom composer controls */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                {/* Media upload button */}
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  title="Attach Media / Images"
                >
                  <Image className="w-4 h-4" />
                </button>

                {/* PulseAi Polish Button */}
                <button
                  type="button"
                  onClick={handlePolishAi}
                  disabled={isPolishing || !body.trim()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 rounded-xl border border-blue-200 transition-colors"
                  title="Enhance & optimize Yap with AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isPolishing ? 'Polishing...' : 'Polish with AI'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-400">
                  {500 - body.length}
                </span>

                <button
                  type="submit"
                  disabled={!body.trim() || isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all transform active:scale-95"
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
