import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
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

// Modals
import { FeedSlidersModal } from './components/feed/FeedSlidersModal';
import { ReplyThreadModal } from './components/yaps/ReplyThreadModal';
import { AiStudioModal } from './components/ai/AiStudioModal';
import { AuthModal } from './components/auth/AuthModal';

import { Yap, FeedSliderSettings, SearchResult } from './types';

export const AppContent: React.FC = () => {
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

  const handleSelectHashtag = (tag: string) => {
    setSelectedTag(tag);
    setActiveTab('explore');
  };

  const handleSelectSearchResult = (result: SearchResult) => {
    if (result.type === 'hashtag') {
      handleSelectHashtag(result.title.replace(/^#/, ''));
    } else if (result.type === 'user') {
      setActiveTab('profile');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex justify-center selection:bg-blue-600 selection:text-white transition-colors duration-200">
      <div className="w-full max-w-[1440px] flex">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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

          <main className="flex-1 pb-16">
            {activeTab === 'feed' && (
              <FeedPage
                onOpenThread={(yap) => setSelectedThreadYap(yap)}
                onOpenQuote={(yap) => setSelectedThreadYap(yap)}
                onOpenSliders={() => setIsSlidersOpen(true)}
                sliderSettings={sliderSettings}
              />
            )}

            {activeTab === 'explore' && (
              <ExplorePage
                onOpenThread={(yap) => setSelectedThreadYap(yap)}
                onOpenQuote={(yap) => setSelectedThreadYap(yap)}
                selectedTag={selectedTag}
              />
            )}

            {activeTab === 'notifications' && <NotificationsPage />}

            {activeTab === 'bookmarks' && (
              <BookmarksPage
                onOpenThread={(yap) => setSelectedThreadYap(yap)}
                onOpenQuote={(yap) => setSelectedThreadYap(yap)}
              />
            )}

            {activeTab === 'profile' && <ProfilePage />}
          </main>
        </div>

        {/* Right Widget Sidebar */}
        <RightWidgetSidebar
          onSelectHashtag={handleSelectHashtag}
          onOpenSliders={() => setIsSlidersOpen(true)}
          onOpenAiStudio={() => setIsAiStudioOpen(true)}
        />
      </div>

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
