import React from 'react';
import DocumentTextIcon from './icons/DocumentTextIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import CompassIcon from './icons/CompassIcon';

const ecosystemApps = [
    {
        name: 'Shopify Growth Video Idea Generator',
        description: 'An AI content strategist that transforms keywords into complete video packages, including ideas, scripts, and thumbnails, with advanced audience targeting and strategic generation modes for Shopify merchants.',
        link: 'https://mrluke1618.github.io/shopify-growth-video-idea-generator-v2',
        icon: <LightbulbIcon className="h-8 w-8 text-brand-purple-light" />,
    },
    {
        name: 'Doc QA Assistant App',
        description: 'An AI-powered toolkit for proofreading, analyzing, and summarizing technical documentation from various sources like Google Docs and GitBook, with features like custom dictionaries and style guides.',
        link: 'https://mrluke1618.github.io/ai-proofreader',
        icon: <DocumentTextIcon className="h-8 w-8 text-brand-purple-light" />,
    },
    {
        name: 'Content Compass',
        description: 'An all-in-one AI marketing strategist that guides you from a basic idea to a complete, professional go-to-market plan with a guided 6-step workflow, unique operating modes, and powerful content creation tools.',
        link: 'https://mrluke1618.github.io/content-compass/',
        icon: <CompassIcon className="h-8 w-8 text-brand-purple-light" />,
    },
    {
        name: 'Customer Insights AI',
        description: 'An AI tool that analyzes customer feedback from multiple sources to provide actionable insights, sentiment analysis, trend reports, and even drafts customer replies.',
        link: 'https://mrluke1618.github.io/customer-review-summarizer',
        icon: <ChatBubbleIcon className="h-8 w-8 text-brand-purple-light" />,
    }
];

const Ecosystem: React.FC = () => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Creator Ecosystem Apps</h1>
                <p className="text-lg text-dark-text-secondary">A suite of powerful, AI-driven tools to support your entire content workflow.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ecosystemApps.map((app) => (
                    <a 
                        key={app.name} 
                        href={app.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-dark-card p-6 rounded-lg border border-dark-border flex flex-col justify-between hover:border-brand-purple-light hover:-translate-y-1 transform-gpu transition-all duration-200 group"
                    >
                        <div>
                            <div className="mb-4">{app.icon}</div>
                            <h2 className="text-xl font-bold text-white mb-2">{app.name}</h2>
                            <p className="text-sm text-dark-text-secondary mb-4 flex-grow">{app.description}</p>
                        </div>
                        <div className="flex items-center text-brand-purple-light font-semibold text-sm group-hover:underline mt-auto pt-4">
                            Visit App
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002 2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default Ecosystem;