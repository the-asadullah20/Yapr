import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { AuthModal } from '../components/auth/AuthModal';

export const LandingPage: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200">

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
