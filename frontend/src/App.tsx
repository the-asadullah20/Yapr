import React, { useState, useRef, useEffect } from 'react';
import { Home, Compass, Bell, Bookmark, Sparkles, User } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { RightWidgetSidebar } from './components/layout/RightWidgetSidebar';

// Pages
import { FeedPage } from './pages/FeedPage';
import { ExplorePage } from './pages/ExplorePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { BookmarksPage } from './pages/BookmarksPage';
import { LandingPage } from './pages/LandingPage';

// Modals
import { FeedSlidersModal } from './components/feed/FeedSlidersModal';
import { ReplyThreadModal } from './components/yaps/ReplyThreadModal';
import { AiStudioModal } from './components/ai/AiStudioModal';
import { AuthModal } from './components/auth/AuthModal';

import { Yap, FeedSliderSettings, SearchResult } from './types';

export const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useSocket();
  const [activeTab, setActiveTab] = useState('feed');
  const [sliderSettings, setSliderSettings] = useState<FeedSliderSettings>({
    followingWeight: 1.5,
    viralWeight: 1.0,
    recencyHours: 12.0,
  });

  // Modal states
  const [isSlidersOpen, setIsSlidersOpen] = useState(false);
  const [isAiStudioOpen, setIsAiStudioOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedThreadYap, setSelectedThreadYap] = useState<Yap | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [viewingProfileUsername, setViewingProfileUsername] = useState<string | null>(null);
  const [refreshFeedKey, setRefreshFeedKey] = useState(0);

  // If user signs out or is unauthenticated, show Landing Page with Auth Card directly
  if (!user) {
    return <LandingPage />;
  }

  const handleSelectHashtag = (tag: string) => {
    setSelectedTag(tag);
    setActiveTab('explore');
  };

  const handleOpenProfile = (username: string) => {
    setViewingProfileUsername(username);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    if (result.type === 'hashtag') {
      handleSelectHashtag(result.title.replace(/^#/, ''));
    } else if (result.type === 'user') {
      handleOpenProfile(result.title.replace(/^@/, ''));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex justify-center selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <div className="w-full max-w-[1440px] flex">
        {/* Left Sidebar (Hidden on mobile, visible md+) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'profile') setViewingProfileUsername(null);
            setActiveTab(tab);
          }}
          onOpenComposer={() => {
            setActiveTab('feed');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenSliders={() => setIsSlidersOpen(true)}
          onOpenAiStudio={() => setIsAiStudioOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        {/* Center Main Content Area */}
        <div className="flex-1 min-w-0 border-r border-slate-200/80 dark:border-slate-800 flex flex-col min-h-screen">
          <Topbar
            onOpenSliders={() => setIsSlidersOpen(true)}
            onOpenNotifications={() => setActiveTab('notifications')}
            onOpenAiStudio={() => setIsAiStudioOpen(true)}
            onSelectSearchResult={handleSelectSearchResult}
          />

          <main className="flex-1 pb-20 md:pb-16">
            {activeTab === 'feed' && (
              <FeedPage
                key={refreshFeedKey}
                onOpenThread={(yap) => setSelectedThreadYap(yap)}
                onOpenQuote={(yap) => setSelectedThreadYap(yap)}
                onOpenSliders={() => setIsSlidersOpen(true)}
                sliderSettings={sliderSettings}
                onOpenProfile={handleOpenProfile}
              />
            )}

            {activeTab === 'explore' && (
              <ExplorePage
                onOpenThread={(yap) => setSelectedThreadYap(yap)}
                onOpenQuote={(yap) => setSelectedThreadYap(yap)}
                selectedTag={selectedTag}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsPage onOpenProfile={handleOpenProfile} />
            )}

            {activeTab === 'bookmarks' && (
              <BookmarksPage
                onOpenThread={(yap) => setSelectedThreadYap(yap)}
                onOpenQuote={(yap) => setSelectedThreadYap(yap)}
              />
            )}

            {activeTab === 'profile' && (
              <ProfilePage
                viewingUsername={viewingProfileUsername}
                onBack={() => {
                  setViewingProfileUsername(null);
                  setActiveTab('feed');
                }}
                onOpenProfile={handleOpenProfile}
              />
            )}
          </main>
        </div>

        {/* Right Widget Sidebar */}
        <RightWidgetSidebar
          onSelectHashtag={handleSelectHashtag}
          onOpenSliders={() => setIsSlidersOpen(true)}
          onOpenAiStudio={() => setIsAiStudioOpen(true)}
        />
      </div>

      {/* Mobile Bottom Navigation Bar (Scalable to all phone screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActiveTab('feed')}
          className={`p-2 rounded-xl transition-colors ${
            activeTab === 'feed' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Home className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('explore')}
          className={`p-2 rounded-xl transition-colors ${
            activeTab === 'explore' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Compass className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsAiStudioOpen(true)}
          className="p-2 rounded-xl bg-blue-600 text-white shadow-sm"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`relative p-2 rounded-xl transition-colors ${
            activeTab === 'notifications' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
          )}
        </button>

        <button
          onClick={() => {
            if (user) {
              setViewingProfileUsername(null);
              setActiveTab('profile');
            } else {
              setIsAuthOpen(true);
            }
          }}
          className={`p-2 rounded-xl transition-colors ${
            activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <User className="w-5 h-5" />
        </button>
      </nav>

      {/* Global Modals */}
      <FeedSlidersModal
        isOpen={isSlidersOpen}
        onClose={() => setIsSlidersOpen(false)}
        settings={sliderSettings}
        onSave={(newSettings) => setSliderSettings(newSettings)}
      />

      <ReplyThreadModal
        yap={selectedThreadYap}
        onClose={() => setSelectedThreadYap(null)}
        onOpenProfile={handleOpenProfile}
        onYapReplied={() => {
          setRefreshFeedKey((k) => k + 1);
        }}
      />

      <AiStudioModal
        isOpen={isAiStudioOpen}
        onClose={() => setIsAiStudioOpen(false)}
        onUseGeneratedYap={() => {
          setActiveTab('feed');
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        initialMode="signin"
        onClose={() => setIsAuthOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
