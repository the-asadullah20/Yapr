import React from 'react';
import {
  Home,
  Compass,
  Bell,
  Bookmark,
  Sparkles,
  User,
  Sliders,
  LogOut,
  Send,
  Radio,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenComposer: () => void;
  onOpenSliders: () => void;
  onOpenAiStudio: () => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenComposer,
  onOpenSliders,
  onOpenAiStudio,
  onOpenAuth,
}) => {
  const { user, logout, switchDemoUser } = useAuth();
  const { unreadCount, isConnected } = useSocket();

  const navItems = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'ai-studio', label: 'AI Studio', icon: Sparkles, action: onOpenAiStudio },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const topicCircles = [
    { id: 'Tech', name: 'Karachi Tech Scene', initial: 'KT', color: 'bg-emerald-500', badge: '120' },
    { id: 'Cricket', name: 'Cricket & Sports', initial: 'CS', color: 'bg-purple-600' },
    { id: 'PulseAi', name: 'PulseAi Community', initial: 'PA', color: 'bg-blue-600' },
    { id: 'Design', name: 'Design & UI/UX', initial: 'UI', color: 'bg-pink-500' },
  ];

  return (
    <aside className="w-64 flex-shrink-0 sticky top-0 h-screen flex flex-col justify-between p-4 bg-white border-r border-slate-100 select-none">
      <div className="space-y-5">
        {/* Brand Logo - PulseAi & Yapr Theme */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('feed')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Yapr
              </span>
              <span className="block text-[10px] font-semibold tracking-wider text-slate-400 uppercase -mt-1">
                Speak Your Mind
              </span>
            </div>
          </div>
          {/* Live WebSocket Indicator */}
          <div
            className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-400'}`}
            title={isConnected ? 'Live WebSockets Connected' : 'Connecting realtime...'}
          />
        </div>

        {/* User Mini Profile Card (Like Image 1) */}
        {user ? (
          <div className="p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-all">
            <div className="flex items-center gap-3">
              <img
                src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={user.display_name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/30"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{user.display_name}</h4>
                  <span className="text-xs">{user.country_code === 'PK' ? '🇵🇰' : user.country_code === 'SG' ? '🇸🇬' : '🇺🇸'}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">@{user.username}</p>
              </div>
            </div>

            {/* Quick Demo Switcher */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Switch Profile:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => switchDemoUser('asadahmad')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${user.username === 'asadahmad' ? 'bg-blue-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                >
                  Asad
                </button>
                <button
                  onClick={() => switchDemoUser('panfengshui')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${user.username === 'panfengshui' ? 'bg-blue-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                >
                  Pan
                </button>
                <button
                  onClick={() => switchDemoUser('clarakim')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${user.username === 'clarakim' ? 'bg-blue-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                >
                  Clara
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-950">Join the discussion</p>
              <p className="text-[11px] text-blue-700">Sign in with Email OTP</p>
            </div>
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Primary Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Primary Action Button */}
        <button
          onClick={onOpenComposer}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all transform active:scale-[0.98]"
        >
          <Send className="w-4 h-4" />
          <span>Yap Something</span>
        </button>

        {/* TOPICS & CIRCLES (Matching Image 1 "Pages You Like") */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Circles & Topics
            </span>
          </div>
          <div className="space-y-1">
            {topicCircles.map((circle) => (
              <button
                key={circle.id}
                onClick={() => setActiveTab('explore')}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors group text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${circle.color}`}
                  >
                    {circle.initial}
                  </div>
                  <span className="truncate group-hover:text-slate-900">{circle.name}</span>
                </div>
                {circle.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                    {circle.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="pt-3 border-t border-slate-100 space-y-1">
        <button
          onClick={onOpenSliders}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Sliders className="w-4 h-4 text-slate-400" />
          <span>Tune Feed Algorithm</span>
        </button>

        {user && (
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
};
