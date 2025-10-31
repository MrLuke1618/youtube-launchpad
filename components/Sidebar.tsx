import React from 'react';
import { View } from '../types';
import LogoIcon from './icons/LogoIcon';
import HomeIcon from './icons/HomeIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import PuzzleIcon from './icons/PuzzleIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import ChartIcon from './icons/ChartIcon';
import QuestionMarkIcon from './icons/QuestionMarkIcon';
import SearchIcon from './icons/SearchIcon';
import BeakerIcon from './icons/BeakerIcon';
import ViewGridIcon from './icons/ViewGridIcon';
import KeyIcon from './icons/KeyIcon';
import GlobeAltIcon from './icons/GlobeAltIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import FunnelIcon from './icons/FunnelIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface SidebarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  onHelpClick: () => void;
  onManageApiKey: () => void;
}

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
    { id: 'onboardingTask', label: 'Onboarding Task', icon: <ClipboardIcon /> },
    { id: 'audiencePersonaBuilder', label: 'Audience Persona', icon: <UserCircleIcon /> },
    { id: 'contentFunnelMapper', label: 'Content Funnel', icon: <FunnelIcon /> },
    { id: 'researchAssistant', label: 'Research Assistant', icon: <GlobeAltIcon /> },
    { id: 'topicExplorer', label: 'Topic Explorer', icon: <SearchIcon /> },
    { id: 'contentSeriesPlanner', label: 'Series Planner', icon: <ViewGridIcon /> },
    { id: 'videoBrief', label: 'Video Workflow', icon: <LightbulbIcon /> },
    { id: 'scriptAnalyzer', label: 'Script Polishing', icon: <ChartIcon /> },
    { id: 'thumbnailTester', label: 'A/B Test Studio', icon: <BeakerIcon /> },
    { id: 'fullAnalysisReport', label: 'Full Analysis Report', icon: <DocumentTextIcon /> },
];

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, onHelpClick, onManageApiKey }) => {

  const currentYear = new Date().getFullYear();
  const copyrightYear = currentYear > 2025 ? `2025-${currentYear}` : '2025';

  return (
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-dark-card flex-shrink-0">
        <div className="h-full p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-10">
                <LogoIcon />
                <h1 className="text-xl font-bold text-white">YT Launchpad</h1>
              </div>

              <nav>
                <ul>
                  {navItems.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => onNavigate(item.id as View)}
                        className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors duration-200 ${
                          activeView === item.id
                            ? 'bg-brand-purple text-white'
                            : 'text-dark-text-secondary hover:bg-dark-border hover:text-white'
                        }`}
                      >
                        <div className="flex-shrink-0 w-5 h-5">{item.icon}</div>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-4 border-t border-white/20 pt-4 flex flex-col gap-1">
                <button
                    onClick={() => onNavigate('ecosystem')}
                    className={`w-full flex items-center gap-4 px-4 py-2 rounded-lg text-left text-sm font-medium transition-colors duration-200 ${
                          activeView === 'ecosystem'
                            ? 'bg-dark-border text-white'
                            : 'text-dark-text-secondary hover:bg-dark-border hover:text-white'
                        }`}
                >
                    <div className="flex-shrink-0 w-5 h-5"><PuzzleIcon /></div>
                    Ecosystem Apps
                </button>
                <button
                    onClick={onManageApiKey}
                    className="w-full text-left flex items-center gap-4 px-4 py-2 rounded-lg text-sm font-medium text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors duration-200"
                >
                    <div className="flex-shrink-0 w-5 h-5"><KeyIcon /></div>
                    Manage API Key
                </button>
                <button
                    onClick={onHelpClick}
                    className="w-full text-left flex items-center gap-4 px-4 py-2 rounded-lg text-sm font-medium text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors duration-200"
                >
                    <div className="flex-shrink-0 w-5 h-5"><QuestionMarkIcon /></div>
                    Help & Support
                </button>
              </div>
            </div>
            <div>
              <p className="text-center text-xs text-dark-text font-semibold mb-2">
                Built for <a href="https://avada.io" target="_blank" rel="noopener noreferrer" className="text-brand-purple-light hover:underline transition-colors">Avada Commerce</a>
              </p>
              <div className="flex justify-center items-center gap-3 mb-4 text-sm">
                <a href="https://www.youtube.com/@luke1618gamer" target="_blank" rel="noopener noreferrer" className="text-dark-text-secondary hover:text-white hover:underline transition-colors">
                  YouTube
                </a>
                <span className="text-dark-text-secondary">&bull;</span>
                <a href="https://www.tiktok.com/@hoangcao2704" target="_blank" rel="noopener noreferrer" className="text-dark-text-secondary hover:text-white hover:underline transition-colors">
                  TikTok
                </a>
                <span className="text-dark-text-secondary">&bull;</span>
                <a href="https://www.linkedin.com/in/hoangminhcao" target="_blank" rel="noopener noreferrer" className="text-dark-text-secondary hover:text-white hover:underline transition-colors">
                  LinkedIn
                </a>
              </div>
              <div className="text-center text-xs text-dark-text-secondary">
                <p>&copy; {copyrightYear} Developed by MrLuke1618.</p>
                <p>All rights reserved.</p>
              </div>
            </div>
        </div>
      </aside>
  );
};

export default Sidebar;