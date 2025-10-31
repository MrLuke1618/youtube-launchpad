
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import OnboardingTask from './components/OnboardingTask';
import HelpModal from './components/HelpModal';
import Ecosystem from './components/Ecosystem';
import VideoBriefGenerator from './components/VideoBriefGenerator';
import ScriptAnalyzer from './components/ScriptAnalyzer';
import ScrollToTopButton from './components/ScrollToTopButton';
import TopicExplorer from './components/TopicExplorer';
// FIX: Changed to a named import to resolve module loading issues, likely caused by a circular dependency.
import { ThumbnailTester } from './components/ThumbnailTester';
import ContentSeriesPlanner from './components/ContentSeriesPlanner';
import ResearchAssistant from './components/ResearchAssistant';
import ApiKeyModal from './components/ApiKeyModal';
import AudiencePersonaBuilder from './components/AudiencePersonaBuilder';
// FIX: Changed to a named import to resolve module loading issues.
import ContentFunnelMapper from './components/ContentFunnelMapper';
import MobileNav from './components/MobileNav';
import { View } from './types';
// FIX: Changed to a named import to resolve module loading issues, likely caused by a circular dependency.
import { FullAnalysisReport } from './components/FullAnalysisReport';

function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [navigationPayload, setNavigationPayload] = useState<any | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Effect to control body scroll
  useEffect(() => {
    if (isSidebarOpen || isHelpModalOpen || isApiKeyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen, isHelpModalOpen, isApiKeyModalOpen]);

  const openApiKeyModal = () => setIsApiKeyModalOpen(true);

  const handleSaveApiKey = (key: string) => {
    if (key) { localStorage.setItem('gemini_api_key', key); } 
    else { localStorage.removeItem('gemini_api_key'); }
  };
  
  const handleNavigate = (view: View, payload?: any) => {
    setActiveView(view);
    setNavigationPayload(payload || null);
    setIsSidebarOpen(false);
    window.scrollTo(0, 0);
  };


  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'onboardingTask':
        return <OnboardingTask onHelpClick={() => setIsHelpModalOpen(true)} />;
      case 'researchAssistant':
        return <ResearchAssistant />;
      case 'videoBrief':
        return <VideoBriefGenerator 
                  initialData={navigationPayload}
                  onNavigate={handleNavigate}
               />;
      case 'scriptAnalyzer':
        return <ScriptAnalyzer initialData={navigationPayload} />;
      case 'ecosystem':
        return <Ecosystem />;
      case 'topicExplorer':
        return <TopicExplorer onNavigate={handleNavigate} />;
      case 'thumbnailTester':
        return <ThumbnailTester initialData={navigationPayload} onManageApiKey={openApiKeyModal} />;
      case 'contentSeriesPlanner':
        return <ContentSeriesPlanner onNavigate={handleNavigate} initialData={navigationPayload} />;
      case 'audiencePersonaBuilder':
        return <AudiencePersonaBuilder />;
      case 'contentFunnelMapper':
        return <ContentFunnelMapper />;
      case 'fullAnalysisReport':
        return <FullAnalysisReport onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="relative min-h-screen bg-dark-bg lg:flex text-white font-sans">
      <Sidebar 
        activeView={activeView} 
        onNavigate={handleNavigate} 
        onHelpClick={() => setIsHelpModalOpen(true)}
        onManageApiKey={openApiKeyModal}
      />
      <MobileNav
        isOpen={isSidebarOpen}
        activeView={activeView}
        onNavigate={handleNavigate}
        onClose={() => setIsSidebarOpen(false)}
        onHelpClick={() => {
            setIsHelpModalOpen(true);
            setIsSidebarOpen(false);
        }}
        onManageApiKey={() => {
            openApiKeyModal();
            setIsSidebarOpen(false);
        }}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
          <ScrollToTopButton />
        </main>
      </div>
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsHelpModalOpen(false)} onSave={handleSaveApiKey} />
    </div>
  );
}

export default App;
