import React from 'react';
import { View } from '../types';
import ClipboardIcon from './icons/ClipboardIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import ChartIcon from './icons/ChartIcon';
import PuzzleIcon from './icons/PuzzleIcon';
import SearchIcon from './icons/SearchIcon';
import BeakerIcon from './icons/BeakerIcon';
import ViewGridIcon from './icons/ViewGridIcon';
import GlobeAltIcon from './icons/GlobeAltIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import FunnelIcon from './icons/FunnelIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface DashboardProps {
  onNavigate: (view: View) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {

    const features = [
        {
            view: 'audiencePersonaBuilder',
            icon: <UserCircleIcon className="h-8 w-8 text-brand-purple-light" />,
            title: 'Audience Persona Builder',
            description: "Develop detailed, AI-generated audience personas to deeply understand who you're creating for.",
        },
        {
            view: 'contentFunnelMapper',
            icon: <FunnelIcon className="h-8 w-8 text-brand-purple-light" />,
            title: 'Content Funnel Mapper',
            description: 'Strategically plan videos for each stage of the marketing funnel, from awareness to conversion.',
        },
        {
          view: 'researchAssistant',
          icon: <GlobeAltIcon className="h-8 w-8 text-brand-purple-light" />,
          title: 'Research Assistant',
          description: 'Get up-to-date, sourced answers to any question using a research tool powered by Google Search.',
        },
        {
          view: 'topicExplorer',
          icon: <SearchIcon className="h-8 w-8 text-brand-purple-light" />,
          title: 'Topic Explorer',
          description: 'Discover untapped content niches and analyze their competition level and audience potential.',
        },
        {
          view: 'contentSeriesPlanner',
          icon: <ViewGridIcon className="h-8 w-8 text-brand-purple-light" />,
          title: 'Series Planner',
          description: 'Plan a cohesive, multi-part video series with AI-generated episode outlines and titles.',
        },
        {
          view: 'videoBrief',
          icon: <LightbulbIcon className="h-8 w-8 text-brand-purple-light" />,
          title: 'Video Workflow',
          description: 'Generate a complete video plan, from titles and hooks to SEO keywords, with a single topic.',
        },
        {
          view: 'scriptAnalyzer',
          icon: <ChartIcon className="h-8 w-8 text-brand-purple-light" />,
          title: 'Script Polishing',
          description: 'Analyze your script to predict and fix potential viewer drop-off points before you start filming.',
        },
        {
          view: 'thumbnailTester',
          icon: <BeakerIcon className="h-8 w-8 text-brand-purple-light" />,
          title: 'A/B Test Studio',
          description: 'Simulate title and thumbnail performance to maximize your video\'s click-through rate (CTR).',
        },
        {
          view: 'ecosystem',
          icon: <PuzzleIcon className="h-8 w-8 text-brand-purple-light" />,
          title: 'Ecosystem Apps',
          description: 'Explore our suite of powerful, AI-driven tools to support your entire content workflow.',
        },
      ];

  return (
    <div className="space-y-8 lg:space-y-12 animate-fade-in">
      <div className="text-center pt-8 lg:pt-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3">Welcome to YT Launchpad</h1>
        <p className="text-lg sm:text-xl text-dark-text-secondary max-w-3xl mx-auto">Your guided workspace for building a data-driven channel strategy.</p>
      </div>
      
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
         <div 
            onClick={() => onNavigate('onboardingTask')}
            className="bg-dark-card p-6 md:p-8 rounded-lg border border-dark-border text-center cursor-pointer hover:border-brand-purple transition-all duration-300 group hover:shadow-lg hover:shadow-brand-purple/20 flex flex-col justify-center"
          >
            <div className="flex justify-center mb-4">
                <div className="bg-brand-purple rounded-full p-4 shadow-lg">
                    <ClipboardIcon className="h-8 w-8 text-white" />
                </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Start a New Project</h2>
            <p className="text-sm text-dark-text-secondary max-w-2xl mx-auto mb-6">
              Build a complete channel strategy from scratch with a five-part guided research task. This is the recommended first step.
            </p>
            <button
              tabIndex={-1}
              className="bg-brand-purple text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-purple-light transition-transform transform group-hover:scale-105 duration-200"
            >
              Begin Onboarding
            </button>
          </div>
          <div 
            onClick={() => onNavigate('fullAnalysisReport')}
            className="bg-dark-card p-6 md:p-8 rounded-lg border border-dark-border text-center cursor-pointer hover:border-brand-purple transition-all duration-300 group hover:shadow-lg hover:shadow-brand-purple/20 flex flex-col justify-center"
          >
            <div className="flex justify-center mb-4">
                <div className="bg-brand-purple rounded-full p-4 shadow-lg">
                    <DocumentTextIcon className="h-8 w-8 text-white" />
                </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">View Full Report</h2>
            <p className="text-sm text-dark-text-secondary max-w-2xl mx-auto mb-6">
             Compile all your work from every module into a single, comprehensive report. View, review, and export your entire project.
            </p>
            <button
              tabIndex={-1}
              className="bg-brand-purple text-white font-bold py-2 px-6 rounded-lg hover:bg-brand-purple-light transition-transform transform group-hover:scale-105 duration-200"
            >
              Open Report
            </button>
          </div>
      </div>


      <div>
          <h2 className="text-2xl font-bold text-center mb-6 mt-12">Or, Use Individual Tools</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.view}
                onClick={() => onNavigate(feature.view as View)}
                className="bg-dark-card p-6 rounded-lg border border-dark-border cursor-pointer hover:border-brand-purple-light hover:-translate-y-1 transform-gpu transition-all duration-300 group flex flex-col hover:shadow-lg hover:shadow-brand-purple/20"
              >
                <div className="flex items-center gap-4 mb-4">
                    {feature.icon}
                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                </div>
                <p className="text-sm text-dark-text-secondary flex-grow">{feature.description}</p>
                 <div className="mt-4 text-brand-purple-light font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center">
                    Go to {feature.title} &rarr;
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;