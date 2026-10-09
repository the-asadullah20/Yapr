import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AuthModal } from '../components/auth/AuthModal';

export const LandingPage: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">
      {/* Top Bar with Theme Toggle */}
      <div className="flex justify-end w-full max-w-md mx-auto">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors shadow-sm"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle color theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* Centered Auth Card (Matching User Screenshot 1 Exactly) */}
      <div className="w-full flex justify-center items-center py-4 my-auto">
        <AuthModal isOpen={true} isStandalone={true} initialMode="signin" />
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-400 dark:text-slate-600 py-2">
        Yapr © {new Date().getFullYear()} · Yap your mind
      </div>
    </div>
  );
};
