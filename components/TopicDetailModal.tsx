import React, { useState, useRef } from 'react';
import { SubNiche, NicheDeepDiveResult } from '../types';
import { generateNicheDeepDive } from '../services/geminiService';
import UsersIcon from './icons/UsersIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import KeyIcon from './icons/KeyIcon';
import DollarIcon from './icons/DollarIcon';
import DownloadIcon from './icons/DownloadIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface TopicDetailModalProps {
    niche: SubNiche;
    isOpen: boolean;
    onClose: () => void;
}

const TopicDetailModal: React.FC<TopicDetailModalProps> = ({ niche, isOpen, onClose }) => {
    const [deepDive, setDeepDive] = useState<NicheDeepDiveResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);

    const handleGenerateDeepDive = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await generateNicheDeepDive(niche);
            setDeepDive(result);
        } catch (e: any) {
            setError(e.message || 'Failed to generate deep dive.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeepDiveChange = (path: (string | number)[], value: any) => {
        setDeepDive(prev => {
            if (!prev) return null;
            const newState = JSON.parse(JSON.stringify(prev));
            let current = newState;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]];
            }
            current[path[path.length - 1]] = value;
            return newState;
        });
    };

    const generateReportText = (format: 'md' | 'txt'): string => {
        const nl = '\n';
        const h1 = format === 'md' ? '# ' : '';
        const h2 = format === 'md' ? '## ' : '';
        const h3 = format === 'md' ? '### ' : '';
        const bold = (text: string) => format === 'md' ? `**${text}**` : text;
        const listItem = (text: string) => format === 'md' ? `* ${text}` : `  - ${text}`;
    
        let report = `${h1}Deep Dive Analysis: ${niche.name}${nl.repeat(2)}`;
    
        if (deepDive) {
            report += `${h2}Audience Deep Dive${nl}`;
            report += `${h3}Pain Points${nl}${(deepDive.audienceDeepDive.painPoints || []).map(listItem).join(nl)}${nl.repeat(2)}`;
            report += `${h3}Goals${nl}${(deepDive.audienceDeepDive.goals || []).map(listItem).join(nl)}${nl.repeat(2)}`;
            report += `${h3}Online Habits${nl}${(deepDive.audienceDeepDive.onlineHabits || []).map(listItem).join(nl)}${nl.repeat(2)}`;
            
            report += `${h2}Content Strategy${nl}`;
            report += `${h3}Suggested Formats${nl}${(deepDive.contentStrategy.suggestedFormats || []).join(', ')}${nl.repeat(2)}`;
            report += `${bold('Tone & Style:')} ${deepDive.contentStrategy.toneAndStyle}${nl.repeat(2)}`;
            report += `${bold('Example Series:')} ${deepDive.contentStrategy.exampleSeries}${nl.repeat(2)}`;

            report += `${h2}Keyword Opportunities${nl}`;
            report += `${h3}Primary Keywords${nl}${(deepDive.keywordOpportunities.primaryKeywords || []).join(', ')}${nl.repeat(2)}`;
            report += `${h3}Long-Tail Keywords${nl}${(deepDive.keywordOpportunities.longTailKeywords || []).join(', ')}${nl.repeat(2)}`;

            report += `${h2}Monetization Avenues${nl}`;
            report += (deepDive.monetizationAvenues || []).map(m => `${bold(m.avenue)}: ${m.description}`).join(nl + nl);
        } else {
            report += "No deep dive analysis has been generated yet.";
        }

        const currentYear = new Date().getFullYear();
        const copyrightYear = currentYear > 2025 ? `2025-${currentYear}` : '2025';
        const copyrightText = `This document was generated using YT Launchpad. © ${copyrightYear} Developed by MrLuke1618. All rights reserved.`;
        report += `\n\n---\n${copyrightText}`;

        return report;
    };

    const handleCopy = () => {
        const reportText = generateReportText('txt');
        navigator.clipboard.writeText(reportText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExport = (format: 'md' | 'txt') => {
        const filename = `Niche-Analysis-${niche.name.replace(/\s+/g, '-')}`;
        const reportText = generateReportText(format);
        const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
        const blob = new Blob([reportText], { type: `${mimeType};charset=utf-8;` });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.${format}`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    if (!isOpen) return null;

    const renderDeepDive = () => {
        if (!deepDive) return null;
        const { audienceDeepDive, contentStrategy, keywordOpportunities, monetizationAvenues } = deepDive;
        const InfoCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
            <div className="bg-dark-bg p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                    {icon}
                    <h4 className="text-lg font-semibold text-brand-purple-light">{title}</h4>
                </div>
                {children}
            </div>
        );

        return (
            <div ref={reportContentRef} className="space-y-4">
                <div id="audience-dive">
                    <InfoCard icon={<UsersIcon className="h-6 w-6 text-brand-purple-light" />} title="Audience Deep Dive">
                        <div className="text-sm space-y-4">
                             {(['painPoints', 'goals', 'onlineHabits'] as const).map(key => (
                                <div key={key}>
                                    <strong className="text-dark-text font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}</strong>
                                    <textarea
                                        value={(audienceDeepDive?.[key] || []).join('\n')}
                                        onChange={e => handleDeepDiveChange(['audienceDeepDive', key], e.target.value.split('\n'))}
                                        className="w-full bg-dark-bg/50 border border-dark-border rounded-md px-3 py-2 mt-1 text-dark-text-secondary"
                                        rows={(audienceDeepDive?.[key] || []).length + 1}
                                    />
                                </div>
                            ))}
                        </div>
                    </InfoCard>
                </div>
                <div id="content-strategy">
                    <InfoCard icon={<LightbulbIcon className="h-6 w-6 text-brand-purple-light" />} title="Content Strategy">
                         <div className="text-sm space-y-3">
                            <div>
                                <strong className="text-dark-text font-semibold">Suggested Formats:</strong>
                                <textarea
                                    value={(contentStrategy?.suggestedFormats || []).join('\n')}
                                    onChange={e => handleDeepDiveChange(['contentStrategy', 'suggestedFormats'], e.target.value.split('\n'))}
                                    className="w-full bg-dark-bg/50 border border-dark-border rounded-md px-3 py-2 mt-1 text-dark-text-secondary"
                                    rows={(contentStrategy?.suggestedFormats || []).length + 1}
                                />
                            </div>
                            <div>
                                <strong className="text-dark-text font-semibold">Tone & Style:</strong>
                                <input
                                    type="text"
                                    value={contentStrategy?.toneAndStyle || ''}
                                    onChange={e => handleDeepDiveChange(['contentStrategy', 'toneAndStyle'], e.target.value)}
                                    className="w-full bg-dark-bg/50 border border-dark-border rounded-md px-3 py-2 mt-1 text-dark-text-secondary"
                                />
                            </div>
                            <div>
                                <strong className="text-dark-text font-semibold">Example Series:</strong>
                                <input
                                    type="text"
                                    value={contentStrategy?.exampleSeries || ''}
                                    onChange={e => handleDeepDiveChange(['contentStrategy', 'exampleSeries'], e.target.value)}
                                    className="w-full bg-dark-bg/50 border border-dark-border rounded-md px-3 py-2 mt-1 text-dark-text-secondary"
                                />
                            </div>
                        </div>
                    </InfoCard>
                </div>
                <div id="keyword-opportunities">
                    <InfoCard icon={<KeyIcon className="h-6 w-6 text-brand-purple-light" />} title="Keyword Opportunities">
                         <div className="text-sm space-y-3">
                            <div>
                                <strong className="text-dark-text font-semibold">Primary Keywords:</strong>
                                <textarea
                                    value={(keywordOpportunities?.primaryKeywords || []).join(', ')}
                                    onChange={e => handleDeepDiveChange(['keywordOpportunities', 'primaryKeywords'], e.target.value.split(',').map(k => k.trim()))}
                                    className="w-full bg-dark-bg/50 border border-dark-border rounded-md px-3 py-2 mt-1 text-dark-text-secondary"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <strong className="text-dark-text font-semibold">Long-Tail Keywords:</strong>
                                <textarea
                                    value={(keywordOpportunities?.longTailKeywords || []).join(', ')}
                                    onChange={e => handleDeepDiveChange(['keywordOpportunities', 'longTailKeywords'], e.target.value.split(',').map(k => k.trim()))}
                                    className="w-full bg-dark-bg/50 border border-dark-border rounded-md px-3 py-2 mt-1 text-dark-text-secondary"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </InfoCard>
                </div>
                <div id="monetization-avenues">
                    <InfoCard icon={<DollarIcon className="h-6 w-6 text-brand-purple-light" />} title="Monetization Avenues">
                         <div className="text-sm space-y-3">
                            {(monetizationAvenues || []).map((item, i) => (
                                 <div key={i} className="space-y-1">
                                    <input 
                                        type="text"
                                        value={item.avenue}
                                        onChange={e => handleDeepDiveChange(['monetizationAvenues', i, 'avenue'], e.target.value)}
                                        className="w-full font-semibold bg-dark-bg/50 border border-dark-border rounded-md px-3 py-2 text-dark-text"
                                    />
                                    <textarea
                                        value={item.description}
                                        onChange={e => handleDeepDiveChange(['monetizationAvenues', i, 'description'], e.target.value)}
                                        className="w-full bg-dark-bg/50 border border-dark-border rounded-md px-3 py-2 text-dark-text-secondary"
                                        rows={2}
                                    />
                                 </div>
                            ))}
                        </div>
                    </InfoCard>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-dark-card rounded-lg border border-dark-border shadow-xl w-full max-w-4xl m-4 text-white transform transition-all flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-dark-border flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">{niche.name}</h2>
                        <p className="text-sm text-dark-text-secondary">Strategic Deep Dive</p>
                    </div>
                    <button onClick={onClose} className="text-dark-text-secondary hover:text-white text-2xl font-bold">&times;</button>
                </div>
                
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto"></div>
                            <p className="mt-4 text-dark-text-secondary">Generating strategic analysis...</p>
                        </div>
                    ) : error ? (
                        <p className="text-red-400 text-center">{error}</p>
                    ) : deepDive ? (
                        renderDeepDive()
                    ) : (
                        <div className="text-center py-12">
                            <h3 className="text-xl font-semibold text-white mb-2">Unlock Deeper Insights</h3>
                            <p className="text-dark-text-secondary mb-6">Generate a detailed report on audience, content strategy, keywords, and monetization.</p>
                            <button onClick={handleGenerateDeepDive} className="bg-brand-purple text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-purple-light transition-colors">
                                Generate Deep Dive Analysis
                            </button>
                        </div>
                    )}
                </div>

                {deepDive && (
                    <div className="p-4 bg-dark-bg/50 rounded-b-lg border-t border-dark-border flex items-center justify-end gap-2">
                        <button onClick={handleCopy} className="flex items-center gap-2 bg-dark-border text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm">
                            <ClipboardIcon className="w-4 h-4" /> {copied ? 'Copied!' : 'Copy Text'}
                        </button>
                        <div className="group relative inline-block">
                             <button className="flex items-center gap-2 bg-dark-border text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-600 transition-colors text-sm group-hover:rounded-b-none">
                                <DownloadIcon /> Export
                            </button>
                             <div className="absolute bottom-full left-0 mb-1 w-full bg-dark-card border border-dark-border rounded-t-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                <a onClick={() => handleExport('md')} className="flex items-center gap-3 px-4 py-2 text-sm text-dark-text-secondary hover:bg-dark-border hover:text-white cursor-pointer"><ClipboardIcon className="w-4 h-4" /> Markdown</a>
                                <a onClick={() => handleExport('txt')} className="flex items-center gap-3 px-4 py-2 text-sm text-dark-text-secondary hover:bg-dark-border hover:text-white cursor-pointer"><DocumentTextIcon className="w-4 h-4" /> TXT</a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopicDetailModal;