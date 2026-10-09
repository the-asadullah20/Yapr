import React, { useState, useRef } from 'react';
import { Camera, Edit3, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/apiClient';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [countryCode, setCountryCode] = useState(user?.country_code || 'PK');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-slate-500 dark:text-slate-400">
        Please sign in to view your profile.
      </div>
    );
  }

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
    try {
      await api.updateProfile({ display_name: displayName, bio, country_code: countryCode });
      updateUser({ display_name: displayName, bio, country_code: countryCode });
      setIsEditing(false);
    } catch {
      updateUser({ display_name: displayName, bio, country_code: countryCode });
      setIsEditing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6 space-y-4">
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
              title="Click to upload profile picture to Supabase S3"
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
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>

          {avatarError && (
            <p className="text-xs text-rose-600 mb-2">{avatarError}</p>
          )}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Country</label>
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Save Changes
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
                  <span className="font-bold text-slate-900 dark:text-white">{user.following_count.toLocaleString()}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">Following</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{user.follower_count.toLocaleString()}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">Followers</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
