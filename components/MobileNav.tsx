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
import XIcon from './icons/XIcon';
import KeyIcon from './icons/KeyIcon';
import GlobeAltIcon from './icons/GlobeAltIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import FunnelIcon from './icons/FunnelIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface MobileNavProps {
  isOpen: boolean;
  activeView: View;
  onNavigate: (view: View) => void;
  onClose: () => void;
  onHelpClick: () => void;
  onManageApiKey: () => void;
}

const navGroups = [
    {
        title: 'Foundation & Strategy',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
            { id: 'onboardingTask', label: 'Onboarding Task', icon: <ClipboardIcon /> },
            { id: 'audiencePersonaBuilder', label: 'Audience Persona', icon: <UserCircleIcon /> },
            { id: 'contentFunnelMapper', label: 'Content Funnel', icon: <FunnelIcon /> },
        ]
    },
    {
        title: 'Ideation & Research',
        items: [
            { id: 'researchAssistant', label: 'Research Assistant', icon: <GlobeAltIcon /> },
            { id: 'topicExplorer', label: 'Topic Explorer', icon: <SearchIcon /> },
        ]
    },
    {
        title: 'Content Planning',
        items: [
            { id: 'contentSeriesPlanner', label: 'Series Planner', icon: <ViewGridIcon /> },
            { id: 'videoBrief', label: 'Video Workflow', icon: <LightbulbIcon /> },
        ]
    },
    {
        title: 'Optimization & Analysis',
        items: [
            { id: 'scriptAnalyzer', label: 'Script Polishing', icon: <ChartIcon /> },
            { id: 'thumbnailTester', label: 'A/B Test Studio', icon: <BeakerIcon /> },
            { id: 'fullAnalysisReport', label: 'Full Report', icon: <DocumentTextIcon /> },
            { id: 'ecosystem', label: 'Ecosystem Apps', icon: <PuzzleIcon /> },
        ]
    }
];

const MobileNav: React.FC<MobileNavProps> = ({ isOpen, activeView, onNavigate, onClose, onHelpClick, onManageApiKey }) => {
  const currentYear = new Date().getFullYear();
  const copyrightYear = currentYear > 2025 ? `2025-${currentYear}` : '2025';

  return (
    <div
      className={`fixed inset-0 bg-dark-bg z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="h-full p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <LogoIcon />
              <h1 className="text-xl font-bold text-white">YT Launchpad</h1>
            </div>
            <button onClick={onClose} className="text-dark-text-secondary hover:text-white" aria-label="Close menu">
              <XIcon className="h-7 w-7" />
            </button>
          </div>
          <nav className="space-y-8">
            {navGroups.map(group => (
              <div key={group.title}>
                <h2 className="text-sm font-semibold uppercase text-dark-text-secondary tracking-wider mb-3 px-2">{group.title}</h2>
                <div className="grid grid-cols-2 gap-2">
                    {group.items.map(item => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id as View)}
                            className={`flex flex-col items-center justify-center text-center p-4 rounded-lg transition-colors duration-200 h-28 ${
                                activeView === item.id
                                ? 'bg-brand-purple text-white'
                                : 'bg-dark-card hover:bg-dark-border text-dark-text-secondary hover:text-white'
                            }`}
                        >
                            <div className="w-7 h-7 mb-2">{item.icon}</div>
                            <span className="text-xs font-semibold">{item.label}</span>
                        </button>
                    ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
        
        <div className="mt-10 pt-6 border-t border-dark-border">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onManageApiKey}
              className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors duration-200"
            >
              <div className="flex-shrink-0 w-5 h-5"><KeyIcon /></div>
              Manage API Key
            </button>
            <button
              onClick={onHelpClick}
              className="flex items-center gap-2 p-3 rounded-lg text-sm font-medium text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors duration-200"
            >
              <div className="flex-shrink-0 w-5 h-5"><QuestionMarkIcon /></div>
              Help & Support
            </button>
          </div>
          <div className="mt-8">
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
      </div>
    </div>
  );
};

export default MobileNav;