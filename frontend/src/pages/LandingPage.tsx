import React from 'react';
import { ArrowRight, Sparkles, Sliders, Shield, Zap, Image as ImageIcon, Send, LogIn, UserPlus, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface LandingPageProps {
  onOpenAuth: (initialMode?: 'signin' | 'signup') => void;
  onExploreGuest: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onExploreGuest }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Yapr Logo"
            className="w-10 h-10 object-contain rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 bg-white"
          />
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-500 leading-none">
              Yapr
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">
              Yap Your Mind
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            onClick={() => onOpenAuth('signin')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>

          <button
            onClick={() => onOpenAuth('signup')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-all transform active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center text-center">
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Real-Time Social Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-3xl leading-[1.1]">
          Yap Your Mind Without Algorithmic Traps.
        </h1>

        <p className="mt-5 text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Join the conversation. Experience real-time yaps, customizable feed algorithms, instant AI summaries, and ultra-fast media uploads.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          <button
            onClick={() => onOpenAuth('signup')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all transform active:scale-95"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onExploreGuest}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
          >
            <span>Explore Public Feed</span>
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* Card 1 */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Transparent Feed Sliders</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Take back control of your feed. Adjust recency decay, network follow weight, and viral thresholds with real-time sliders.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Instant AI Summaries</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Catch up in seconds. Long threads and complex discussions get synthesized into crisp 1-sentence takeaways with zero delay.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Supabase S3 Storage</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Seamless media attachments and personalized profile avatars stored on high-speed S3 storage buckets with instant delivery.
            </p>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="mt-16 w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm text-left">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              Y
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Yapr Community</span>
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                  ✓
                </span>
              </div>
              <span className="text-[11px] text-slate-400">@yapr · Just now</span>
            </div>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            Welcome to the new era of public conversation. Transparent ranking, direct S3 media uploads, and instant summaries. Ready to yap?
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>2.4k Likes</span>
            <span>890 Reyaps</span>
            <button
              onClick={() => onOpenAuth('signup')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign up to reply →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>© 2026 Yapr Inc. All rights reserved. Built for open, real-time expression.</p>
      </footer>
    </div>
  );
};
