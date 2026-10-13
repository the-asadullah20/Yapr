import React, { useState, useEffect, useRef } from 'react';
import { AtSign, Check, AlertCircle, Loader2, Sparkles, Globe, Lock, Image as ImageIcon, X, Bell, Camera, User } from 'lucide-react';
import { api } from '../../api/apiClient';
import { DEFAULT_AVATAR } from '../../utils/avatar';
import { subscribeToPush } from '../../utils/pushNotifications';

interface SelectUsernameModalProps {
  isOpen: boolean;
  initialUsername?: string;
  initialDisplayName?: string;
  initialIsPrivate?: boolean;
  initialAvatarUrl?: string;
  onComplete: (
    chosenUsername: string,
    displayName: string,
    isPrivate: boolean,
    bannerUrl?: string,
    avatarUrl?: string
  ) => void;
}

export const SelectUsernameModal: React.FC<SelectUsernameModalProps> = ({
  isOpen,
  initialUsername = '',
  initialDisplayName = '',
  initialIsPrivate = false,
  initialAvatarUrl = '',
  onComplete,
}) => {
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [username, setUsername] = useState(
    initialUsername.startsWith('user_') ? '' : initialUsername
  );
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Notifications permission state
  const [allowNotifications, setAllowNotifications] = useState(true);

  // Profile picture (DP) state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl || null);
  const [isAvatarSkipped, setIsAvatarSkipped] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (initialDisplayName) {
      setDisplayName(initialDisplayName);
    }
  }, [initialDisplayName]);

  useEffect(() => {
    if (initialAvatarUrl && !initialAvatarUrl.includes('dicebear')) {
      setAvatarPreview(initialAvatarUrl);
    }
  }, [initialAvatarUrl]);

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

  // DP Handlers
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setIsAvatarSkipped(false);
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleSkipAvatar = () => {
    handleRemoveAvatar();
    setIsAvatarSkipped(true);
  };

  // Cover Handlers
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
    if (coverPreview && coverPreview.startsWith('blob:')) {
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
      let uploadedAvatarUrl = '';
      if (avatarFile && !isAvatarSkipped) {
        try {
          const uploadRes = await api.uploadMedia(avatarFile);
          uploadedAvatarUrl = uploadRes.url || '';
        } catch {
          // Proceed if media upload fails
        }
      } else if (isAvatarSkipped) {
        uploadedAvatarUrl = DEFAULT_AVATAR;
      }

      let uploadedBannerUrl = '';
      if (coverFile && !isCoverSkipped) {
        try {
          const uploadRes = await api.uploadMedia(coverFile);
          uploadedBannerUrl = uploadRes.url || '';
        } catch {
          // If media upload fails, proceed
        }
      }

      const cleanDisplayName = displayName.trim() || clean;

      await api.updateProfile({
        username: clean,
        display_name: cleanDisplayName,
        is_private: isPrivate,
        onboarding_completed: true,
        ...(uploadedAvatarUrl ? { avatar_url: uploadedAvatarUrl } : {}),
        ...(uploadedBannerUrl ? { banner_url: uploadedBannerUrl } : {}),
      });

      if (allowNotifications) {
        try {
          await subscribeToPush();
        } catch {
          // Push notification permission prompt dismissed or rejected
        }
      }

      onComplete(clean, cleanDisplayName, isPrivate, uploadedBannerUrl, uploadedAvatarUrl);
    } catch (err: any) {
      setStatus('taken');
      setStatusMsg(err.message || 'Failed to update profile. Please try another handle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentDisplayAvatar = isAvatarSkipped || !avatarPreview ? DEFAULT_AVATAR : avatarPreview;

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Welcome to Yapr</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set up your username, display name, photo, and preferences
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

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Asad Ullah"
                maxLength={50}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Profile Picture (DP) Section with Skip */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Profile Picture (DP)
              </label>
              {!isAvatarSkipped && (
                <button
                  type="button"
                  onClick={handleSkipAvatar}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  Skip
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm shrink-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <img
                  src={currentDisplayAvatar}
                  alt="Profile Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                {avatarFile && !isAvatarSkipped ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors w-fit"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Add Profile Photo
                    </button>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {isAvatarSkipped ? 'Neutral WhatsApp-style DP active' : 'Click Add Photo or Skip to use default DP'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>

          {/* Cover Picture Section with Skip */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cover Photo
              </label>
              {!coverPreview && !isCoverSkipped && (
                <button
                  type="button"
                  onClick={handleSkipCover}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  Skip
                </button>
              )}
            </div>

            {/* Banner preview or upload prompt */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-24 flex items-center justify-center group">
              {coverPreview && !isCoverSkipped ? (
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
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-3">
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>Upload Cover Photo</span>
                  </button>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {isCoverSkipped ? 'Cover photo skipped (can add later)' : 'Optional banner photo'}
                  </p>
                </div>
              )}
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
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Allow Push Notifications</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                    Receive instant alerts when someone likes, replies, or mentions you
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
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
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm mt-3"
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
