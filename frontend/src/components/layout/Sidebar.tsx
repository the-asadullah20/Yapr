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
  Sun,
  Moon,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';

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
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const { toggleTheme, isDark } = useTheme();

  const navItems = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'profile', label: 'Profile', icon: User, action: !user ? onOpenAuth : undefined },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-shrink-0 sticky top-0 h-screen flex-col justify-between p-4 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 select-none transition-colors duration-200">

      <div className="space-y-4">
        {/* Brand Logo - Origami Y-Bird Logo */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('feed')}>
            <img
              src="/logo.png"
              alt="Yapr Logo"
              className="w-10 h-10 object-contain rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 bg-white"
            />
            <div className="flex flex-col justify-center">
              <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-500 leading-none">
                Yapr
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-1">
                Yap Your Mind
              </span>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

        {/* User Mini Profile Card or Sign In Banner */}
        {user ? (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between transition-all">
            <div
              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
              onClick={() => setActiveTab('profile')}
            >
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt={user.display_name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.display_name}</h4>
                  <span className="px-1 py-0.2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-[9px] font-bold">
                    {user.country_code || 'PK'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">@{user.username}</p>
              </div>
            </div>

            {/* Quick Sign Out Button directly on User Card */}
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-950 dark:text-blue-200">Welcome to Yapr</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-400">Sign In or Join</p>
            </div>
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
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
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Primary Action Button */}
        <button
          onClick={user ? onOpenComposer : onOpenAuth}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all transform active:scale-[0.98]"
        >
          <Send className="w-4 h-4" />
          <span>{user ? 'Yap Something' : 'Sign In to Yap'}</span>
        </button>
      </div>

      {/* Bottom Footer Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <button
          onClick={onOpenSliders}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <Sliders className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span>Feed Settings</span>
        </button>

        {user ? (
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </aside>
  );
};
