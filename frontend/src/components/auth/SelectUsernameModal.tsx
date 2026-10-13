import React, { useState, useEffect, useRef } from 'react';
import { AtSign, Check, AlertCircle, Loader2, Sparkles, Globe, Lock, Image as ImageIcon, X, Bell } from 'lucide-react';
import { api } from '../../api/apiClient';
import { DEFAULT_AVATAR } from '../../utils/avatar';
import { subscribeToPush } from '../../utils/pushNotifications';

interface SelectUsernameModalProps {
  isOpen: boolean;
  initialUsername?: string;
  initialIsPrivate?: boolean;
  onComplete: (chosenUsername: string, isPrivate: boolean, bannerUrl?: string) => void;
}

export const SelectUsernameModal: React.FC<SelectUsernameModalProps> = ({
  isOpen,
  initialUsername = '',
  initialIsPrivate = false,
  onComplete,
}) => {
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [username, setUsername] = useState(
    initialUsername.startsWith('user_') ? '' : initialUsername
  );
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notifications permission state
  const [allowNotifications, setAllowNotifications] = useState(true);

  // Cover photo state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isCoverSkipped, setIsCoverSkipped] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialUsername && !initialUsername.startsWith('user_')) {
      setUsername(initialUsername);
    }
  }, [initialUsername]);

  const validateAndCheck = (val: string) => {
    const clean = val.toLowerCase().trim();

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!clean) {
      setStatus('idle');
      setStatusMsg('');
      return;
    }

    if (clean.length < 3) {
      setStatus('invalid');
      setStatusMsg('Username must be at least 3 characters');
      return;
    }

    if (clean.length > 20) {
      setStatus('invalid');
      setStatusMsg('Username must be 20 characters or fewer');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setStatus('invalid');
      setStatusMsg('Only letters, numbers, and underscores are allowed');
      return;
    }

    setStatus('checking');
    setStatusMsg('Checking availability...');

    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await api.checkUsername(clean);
        if (res.available) {
          setStatus('available');
          setStatusMsg(`@${clean} is available!`);
        } else {
          setStatus('taken');
          setStatusMsg(`@${clean} is already taken`);
        }
      } catch {
        // Fallback: allow proceed if network check fails
        setStatus('available');
        setStatusMsg(`@${clean} looks good`);
      }
    }, 350);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setUsername(val);
    validateAndCheck(val);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setIsCoverSkipped(false);
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
    }
  };

  const handleRemoveCover = () => {
    setCoverFile(null);
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverPreview(null);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const handleSkipCover = () => {
    handleRemoveCover();
    setIsCoverSkipped(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.toLowerCase().trim();
    if (!clean || clean.length < 3 || status === 'taken' || status === 'invalid') return;

    setIsSubmitting(true);
    try {
      let uploadedBannerUrl = '';
      if (coverFile && !isCoverSkipped) {
        try {
          const uploadRes = await api.uploadMedia(coverFile);
          uploadedBannerUrl = uploadRes.url || '';
        } catch {
          // If media upload fails, proceed with username setup
        }
      }

      await api.updateProfile({
        username: clean,
        is_private: isPrivate,
        ...(uploadedBannerUrl ? { banner_url: uploadedBannerUrl } : {}),
      });

      if (allowNotifications) {
        try {
          await subscribeToPush();
        } catch {
          // Push notification permission prompt dismissed or rejected
        }
      }

      onComplete(clean, isPrivate, uploadedBannerUrl);
    } catch (err: any) {
      setStatus('taken');
      setStatusMsg(err.message || 'Failed to set username. Please try another.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Welcome to Yapr</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set up your username, cover photo, and privacy preferences
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Choose Handle
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                <AtSign className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={handleInputChange}
                placeholder="yourhandle"
                maxLength={20}
                autoFocus
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {status === 'checking' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                {status === 'available' && <Check className="w-4 h-4 text-emerald-500" />}
                {(status === 'taken' || status === 'invalid') && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </span>
            </div>

            {statusMsg && (
              <p
                className={`mt-1.5 text-xs font-medium flex items-center gap-1.5 ${
                  status === 'available'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : status === 'checking'
                    ? 'text-blue-500'
                    : 'text-red-500 dark:text-red-400'
                }`}
              >
                {statusMsg}
              </p>
            )}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              3-20 characters, lowercase letters, numbers, and underscores only.
            </p>
          </div>

          {/* Cover Picture & Profile Picture Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cover Photo
              </label>
              {!coverPreview && !isCoverSkipped && (
                <button
                  type="button"
                  onClick={handleSkipCover}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium"
                >
                  Skip for now
                </button>
              )}
            </div>

            {/* Banner preview or upload prompt */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-28 flex items-center justify-center group">
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold rounded-lg shadow"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveCover}
                      className="p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg shadow"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : isCoverSkipped ? (
                <div className="text-center p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cover photo skipped</p>
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 font-semibold"
                  >
                    Add one anyway
                  </button>
                </div>
              ) : (
                <div className="text-center p-3">
                  <ImageIcon className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Add a personalized cover photo
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      Upload Image
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipCover}
                      className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {/* WhatsApp-style Neutral Avatar Overlap Preview */}
              <div className="absolute bottom-2 left-3 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                <img
                  src={DEFAULT_AVATAR}
                  alt="Default WhatsApp Avatar"
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                />
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                  Neutral DP applied
                </span>
              </div>
            </div>

            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverSelect}
            />
          </div>

          {/* Account Visibility / Privacy Selection */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Account Visibility
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  !isPrivate
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600 text-blue-900 dark:text-blue-100'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Public</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Anyone can view your yaps and profile
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isPrivate
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600 text-blue-900 dark:text-blue-100'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Private</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Only approved followers can view your yaps
                </p>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              You can change your account visibility anytime later in your Settings.
            </p>
          </div>

          {/* Push Notifications Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Allow Notifications</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    Get instant alerts when someone yaps, mentions or replies
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={allowNotifications}
                  onChange={(e) => setAllowNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              username.length < 3 ||
              status === 'taken' ||
              status === 'invalid' ||
              status === 'checking'
            }
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up profile...
              </>
            ) : (
              'Confirm & Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
