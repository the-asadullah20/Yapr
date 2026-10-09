import React, { useState } from 'react';
import { User, MapPin, Calendar, Edit3, Check, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/apiClient';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [countryCode, setCountryCode] = useState(user?.country_code || 'PK');

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-slate-500">
        Please sign in to view your profile.
      </div>
    );
  }

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
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-36 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 relative">
          <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-semibold">
            {user.country_code === 'PK' ? '🇵🇰 Pakistan' : '🌐 Global'}
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6 pt-0 relative">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user.display_name}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg"
            />

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Country (ISO 3166)</label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="PK">🇵🇰 Pakistan</option>
                  <option value="US">🇺🇸 United States</option>
                  <option value="SG">🇸🇬 Singapore</option>
                  <option value="GB">🇬🇧 United Kingdom</option>
                  <option value="AE">🇦🇪 United Arab Emirates</option>
                  <option value="SA">🇸🇦 Saudi Arabia</option>
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
                <h2 className="text-xl font-black text-slate-900">{user.display_name}</h2>
                {user.is_verified && (
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">@{user.username}</p>

              {user.bio && (
                <p className="mt-3 text-xs text-slate-700 leading-relaxed max-w-lg">{user.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-5 mt-4 text-xs">
                <div>
                  <span className="font-bold text-slate-900">{user.following_count.toLocaleString()}</span>{' '}
                  <span className="text-slate-500">Following</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900">{user.follower_count.toLocaleString()}</span>{' '}
                  <span className="text-slate-500">Followers</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
