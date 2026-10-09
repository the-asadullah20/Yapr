import React from 'react';
import { LogIn, UserPlus, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LandingPageProps {
  onOpenAuth: (initialMode?: 'signin' | 'signup') => void;
  onExploreGuest: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onExploreGuest }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-6 transition-colors duration-200">
      {/* Top right theme toggle */}
      <div className="flex justify-end">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* Centered Minimal Auth Gateway */}
      <div className="max-w-sm w-full mx-auto text-center space-y-6">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="Yapr Logo"
            className="w-20 h-20 object-contain rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 bg-white p-2"
          />
        </div>

        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Yapr</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Yap your mind.</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => onOpenAuth('signin')}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all transform active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>

          <button
            onClick={() => onOpenAuth('signup')}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200 font-bold text-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all transform active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Account</span>
          </button>
        </div>

        {/* Guest link */}
        <div className="pt-2">
          <button
            onClick={onExploreGuest}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors"
          >
            Explore as Guest →
          </button>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-center text-[11px] text-slate-400 dark:text-slate-600">
        Yapr © {new Date().getFullYear()}
      </div>
    </div>
  );
};
