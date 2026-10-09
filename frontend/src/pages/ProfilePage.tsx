import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Edit3,
  Loader2,
  Lock,
  KeyRound,
  ArrowLeft,
  UserPlus,
  UserCheck,
  Check,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/apiClient';
import { UserProfile, Yap } from '../types';

interface ProfilePageProps {
  viewingUsername?: string | null;
  onBack?: () => void;
  onOpenThread?: (yap: Yap) => void;
  onOpenProfile?: (username: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  viewingUsername,
  onBack,
}) => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Other user's profile state
  const isViewingOther = !!viewingUsername && viewingUsername !== user?.username;
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [loadingOther, setLoadingOther] = useState(isViewingOther);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  // Own profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [countryCode, setCountryCode] = useState(user?.country_code || 'PK');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Forgot / Reset Password state
  const [resetEmail, setResetEmail] = useState(user?.email || '');
  const [resetStep, setResetStep] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Sync own user fields
  useEffect(() => {
    if (user && !isViewingOther) {
      setUsername(user.username || '');
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
      setCountryCode(user.country_code || 'PK');
      setResetEmail(user.email || '');
    }
  }, [user, isViewingOther]);

  // Load other user's profile if viewing other
  useEffect(() => {
    if (isViewingOther && viewingUsername) {
      setLoadingOther(true);
      api
        .getProfile(viewingUsername)
        .then((p) => {
          setOtherProfile(p);
          setIsFollowing(!!(p as any).is_following);
          setFollowerCount(p.follower_count || 0);
          setLoadingOther(false);
        })
        .catch(() => {
          setLoadingOther(false);
        });
    }
  }, [viewingUsername, isViewingOther]);

  const handleToggleFollow = async () => {
    if (!user) {
      alert('Please sign in to follow users');
      return;
    }
    if (!otherProfile) return;

    const next = !isFollowing;
    setIsFollowing(next);
    setFollowerCount((prev) => prev + (next ? 1 : -1));
    try {
      const res = await api.toggleFollow(otherProfile.id);
      setIsFollowing(res.following);
    } catch {
      setIsFollowing(!next);
      setFollowerCount((prev) => prev + (!next ? 1 : -1));
    }
  };

  const handleInitiateForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = user?.email || resetEmail.trim();
    if (!targetEmail) {
      setResetError('Please enter your email address.');
      return;
    }
    setIsSendingReset(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      await api.forgotPassword(targetEmail);
      setResetSuccess(`A 6-digit reset code has been sent to ${targetEmail}`);
      setResetStep(true);
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset code');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = user?.email || resetEmail.trim();
    if (!targetEmail) {
      setResetError('Email address is missing.');
      return;
    }
    if (!resetOtp.trim()) {
      setResetError('Please enter the 6-digit reset code.');
      return;
    }
    if (newPassword.length < 6) {
      setResetError('New password must be at least 6 characters.');
      return;
    }
    setIsSubmittingReset(true);
    setResetError(null);
    try {
      const res = await api.resetPassword({
        email: targetEmail,
        code: resetOtp.trim(),
        newPassword,
      });
      setResetSuccess(res.message || 'Password updated successfully!');
      setNewPassword('');
      setResetOtp('');
      setTimeout(() => {
        setResetStep(false);
      }, 3000);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Avatar image must be under 5MB');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      const res = await api.uploadAvatar(file);
      updateUser({ avatar_url: res.url });
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload profile picture');
      alert(err.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const cleanUsername = username.toLowerCase().trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setSaveError('Username must be between 3 and 30 characters');
      setIsSaving(false);
      return;
    }

    try {
      const updated = await api.updateProfile({
        username: cleanUsername,
        display_name: displayName.trim() || cleanUsername,
        bio: bio.trim(),
        country_code: countryCode,
      });

      updateUser({
        username: cleanUsername,
        display_name: displayName.trim() || cleanUsername,
        bio: bio.trim(),
        country_code: countryCode,
      });

      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Rendering Other Person's Profile
  if (isViewingOther) {
    if (loadingOther) {
      return (
        <div className="max-w-2xl mx-auto py-12 text-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          Loading @{viewingUsername}'s profile...
        </div>
      );
    }

    if (!otherProfile) {
      return (
        <div className="max-w-2xl mx-auto py-12 text-center space-y-3">
          <p className="text-slate-500">User @{viewingUsername} not found.</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Back to Feed
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6 space-y-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </button>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          {/* Banner */}
          <div className="h-36 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 relative">
            <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-semibold flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>{otherProfile.country_code ? `${otherProfile.country_code} · Regional` : 'Global'}</span>
            </div>
          </div>

          {/* Profile Header */}
          <div className="p-6 pt-0 relative">
            <div className="flex items-end justify-between -mt-12 mb-4">
              <img
                src={
                  otherProfile.avatar_url ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${otherProfile.username}`
                }
                alt={otherProfile.display_name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-lg bg-slate-100 dark:bg-slate-800"
              />

              {/* Follow / Unfollow Button */}
              <button
                onClick={handleToggleFollow}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                  isFollowing
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            </div>

            {/* User Info */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {otherProfile.display_name}
                </h2>
                {otherProfile.is_verified && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">@{otherProfile.username}</p>

              {otherProfile.bio && (
                <p className="mt-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-lg">
                  {otherProfile.bio}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-5 mt-4 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(otherProfile.following_count || 0).toLocaleString()}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">Following</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {followerCount.toLocaleString()}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">Followers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Rendering Own Profile (Settings)
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-slate-500 dark:text-slate-400">
        Please sign in to view your profile and settings.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6 space-y-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {/* Banner */}
        <div className="h-36 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 relative">
          <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-semibold">
            {user.country_code ? `${user.country_code} · Regional` : 'Global'}
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6 pt-0 relative">
          {/* Avatar with Camera Upload Overlay */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload profile picture"
            >
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt={user.display_name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-lg bg-slate-100 dark:bg-slate-800 transition-all"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-white mb-0.5" />
                    <span className="text-[10px] text-white font-semibold">Change</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setSaveError(null);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>

          {avatarError && <p className="text-xs text-rose-600 mb-2">{avatarError}</p>}
          {saveError && <p className="text-xs text-rose-600 mb-2">{saveError}</p>}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 mb-4">
              {/* Change Username Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Username Handle
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
                  <span className="text-slate-400 font-bold mr-1">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    placeholder="new_username"
                    required
                    className="w-full bg-transparent outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  3-30 lowercase characters, numbers, and underscores only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Country
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                >
                  <option value="PK">PK · Pakistan</option>
                  <option value="US">US · United States</option>
                  <option value="SG">SG · Singapore</option>
                  <option value="GB">GB · United Kingdom</option>
                  <option value="AE">AE · United Arab Emirates</option>
                  <option value="SA">SA · Saudi Arabia</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">{user.display_name}</h2>
                {user.is_verified && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">@{user.username}</p>

              {user.bio && (
                <p className="mt-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-lg">{user.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-5 mt-4 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {user.following_count?.toLocaleString() || 0}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">Following</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {user.follower_count?.toLocaleString() || 0}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">Followers</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security & Password Reset Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-colors">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security & Password</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Forgot or want to change your password</p>
          </div>
        </div>

        {resetSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
            {resetSuccess}
          </div>
        )}

        {resetError && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {resetError}
          </div>
        )}

        {!resetStep ? (
          <form onSubmit={handleInitiateForgot} className="space-y-3">
            {!user.email && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Email
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                />
              </div>
            )}
            {user.email && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Click below to send a 6-digit verification code to{' '}
                <span className="font-semibold text-slate-900 dark:text-white">{user.email}</span>.
              </p>
            )}
            <button
              type="submit"
              disabled={isSendingReset}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              {isSendingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              <span>{isSendingReset ? 'Sending Reset Code...' : 'Request Password Reset OTP'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleCompleteReset} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                6-Digit Reset Code
              </label>
              <input
                type="text"
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                required
                className="w-full px-3.5 py-2 text-xs font-mono tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmittingReset}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {isSubmittingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isSubmittingReset ? 'Updating Password...' : 'Update Password'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetStep(false);
                  setResetError(null);
                  setResetSuccess(null);
                }}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
