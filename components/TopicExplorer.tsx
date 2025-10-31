import React, { useState, useEffect, useRef } from 'react';
import { exploreTopic, suggestTextRefinement, validateInput } from '../services/geminiService';
import { TopicExplorationResult, SubNiche, View } from '../types';
import SearchIcon from './icons/SearchIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import TopicDetailModal from './TopicDetailModal';
import ArrowTopRightOnSquareIcon from './icons/ArrowTopRightOnSquareIcon';
import TrashIcon from './icons/TrashIcon';
import DownloadIcon from './icons/DownloadIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import jsPDF from 'jspdf';
import ViewGridIcon from './icons/ViewGridIcon';
import SparklesIcon from './icons/SparklesIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';


declare const html2canvas: any;

type SaveStatus = 'unsaved' | 'saving' | 'saved';
const LOCAL_STORAGE_KEY = 'yt-launchpad-topic-explorer-state';

interface TopicExplorerProps {
    onNavigate?: (view: View, payload?: any) => void;
    isWorkflowMode?: boolean;
    onWorkflowComplete?: (data: any) => void;
    initialData?: { topic: string };
}

const MIN_TOPIC_LENGTH = 5;

const TopicExplorer: React.FC<TopicExplorerProps> = ({ onNavigate, initialData, isWorkflowMode, onWorkflowComplete }) => {
    const [topic, setTopic] = useState('');
    const [results, setResults] = useState<TopicExplorationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [selectedNiche, setSelectedNiche] = useState<SubNiche | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [isExporting, setIsExporting] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: string]: boolean }>({});
    const [currentNicheIndex, setCurrentNicheIndex] = useState(0);

    // Load state from localStorage on mount
    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                setTopic(savedState.topic || '');
                setResults(savedState.results || null);
            } catch (e) {
                console.error("Failed to parse topic explorer state from localStorage", e);
            }
        } else if (initialData?.topic) {
            setTopic(initialData.topic);
        }
    }, [initialData]);

    // Auto-save state to localStorage with debounce
    useEffect(() => {
        setSaveStatus('unsaved');
        const handler = setTimeout(() => {
            setSaveStatus('saving');
            const stateToSave = {
                topic,
                results,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
            setTimeout(() => setSaveStatus('saved'), 500);
        }, 1500);

        return () => {
            clearTimeout(handler);
        };
    }, [topic, results]);
    
     // Real-time input validation
    useEffect(() => {
        const { message } = validateInput(topic, MIN_TOPIC_LENGTH, 'topic');
        setValidationError(message);
    }, [topic]);

    const handleSuggest = async (
        key: string,
        fieldName: string,
        currentValue: string,
        context: string,
        outputFormat: 'string' | 'list' = 'string'
    ) => {
        setLoadingSuggestions(prev => ({ ...prev, [key]: true }));
        setError(null);
        try {
            const result = await suggestTextRefinement({ fieldName, currentValue, context, outputFormat });
            
            // Determine how to update state based on the key
            const parts = key.split('-');
            if (parts[0] === 'topic') {
                setTopic(result.suggestion as string);
            } else if (parts[0] === 'niche' && results) {
                const index = parseInt(parts[1], 10);
                const field = parts[2] as keyof SubNiche;
                
                const newSubNiches = [...results.subNiches];
                (newSubNiches[index] as any)[field] = result.suggestion;

                setResults({ ...results, subNiches: newSubNiches });
            }

        } catch (e) {
            setError('Failed to get a suggestion.');
            console.error(e);
        } finally {
            setLoadingSuggestions(prev => ({ ...prev, [key]: false }));
        }
    };


    const loadingSteps = [
        "Scanning YouTube for content gaps...",
        "Analyzing audience search behavior...",
        "Identifying related sub-niches...",
        "Assessing competition levels...",
        "Evaluating audience potential...",
        "Generating actionable content angles...",
    ];

    useEffect(() => {
        let interval: number | undefined;
        if (isLoading) {
            let step = 0;
            setLoadingMessage(loadingSteps[0]);
            interval = window.setInterval(() => {
                step = (step + 1) % loadingSteps.length;
                setLoadingMessage(loadingSteps[step]);
            }, 1500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading]);

    const handleExplore = async () => {
        const { isValid, message } = validateInput(topic, MIN_TOPIC_LENGTH, 'topic');
        if (!isValid) {
            setError(message || 'Please enter a valid topic to explore.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const data = await exploreTopic(topic);
            setResults(data);
            setCurrentNicheIndex(0);
        } catch (e: any) {
            setError(e.message || 'Failed to explore topic.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear the current topic and results? This cannot be undone.")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setTopic('');
            setResults(null);
            setError(null);
        }
    };

    const handleNicheChange = (index: number, field: keyof SubNiche, value: any) => {
        setResults(prevResults => {
            if (!prevResults) return null;
            const newSubNiches = [...prevResults.subNiches];
            newSubNiches[index] = { ...newSubNiches[index], [field]: value };
            return { ...prevResults, subNiches: newSubNiches };
        });
    };

    const generateReportText = (format: 'md' | 'txt'): string => {
        if (!results) return '';
        const nl = '\n';
        const h1 = format === 'md' ? '# ' : '';
        const h2 = format === 'md' ? '## ' : '';
        const bold = (text: string) => format === 'md' ? `**${text}**` : text;
        const listItem = (text: string) => format === 'md' ? `* ${text}` : `  - ${text}`;

        let report = `${h1}Topic Exploration Report: ${topic}${nl.repeat(2)}`;
        
        if (results.strategicInterpretation) {
            report += `${h2}Strategic Interpretation${nl}${results.strategicInterpretation}${nl.repeat(2)}`;
        }

        results.subNiches.forEach(niche => {
            report += `${h2}${niche.name}${nl}`;
            report += `${bold('Competition:')} ${niche.competition} | ${bold('Potential:')} ${niche.potential}${nl.repeat(2)}`;
            report += `${bold('Audience Profile:')} ${niche.audienceProfile}${nl.repeat(2)}`;
            report += `${bold('Content Angles:')}${nl}${(niche.contentAngles || []).map(listItem).join(nl)}${nl.repeat(2)}`;
            report += (format === 'md' ? '---' : '---') + nl.repeat(2);
        });
        
        const currentYear = new Date().getFullYear();
        const copyrightYear = currentYear > 2025 ? `2025-${currentYear}` : '2025';
        const copyrightText = `This document was generated using YT Launchpad. © ${copyrightYear} Developed by MrLuke1618. All rights reserved.`;
        report += `\n${copyrightText}`;

        return report;
    };

    const handleExport = (format: 'md' | 'txt') => {
        const reportText = generateReportText(format);
        const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
        const blob = new Blob([reportText], { type: `${mimeType};charset=utf-8;` });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Topic-Exploration-${topic.replace(/\s+/g, '-') || 'Untitled'}.${format}`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleExportPdf = async () => {
        const content = reportContentRef.current;
        if (!content) return;
    
        setIsExporting(true);
        setError(null);
    
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            
            const canvas = await html2canvas(content, {
                backgroundColor: '#131221',
                scale: 2,
                useCORS: true,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const imgProps = doc.getImageProperties(imgData);
            const imgWidth = pdfWidth - (margin * 2);
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            doc.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - (margin * 2));

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - (margin * 2));
            }

            const pageCount = (doc as any).internal.getNumberOfPages();
            const currentYear = new Date().getFullYear();
            const copyrightYear = currentYear > 2025 ? `2025-${currentYear}` : '2025';
            const copyrightText = `This document was generated using YT Launchpad. © ${copyrightYear} Developed by MrLuke1618. All rights reserved.`;

            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175);
                doc.setFont('helvetica', 'normal');
                
                doc.text(copyrightText, margin, pdfHeight - 10, { align: 'left' });
                doc.text(`Page ${i} of ${pageCount}`, pdfWidth - margin, pdfHeight - 10, { align: 'right' });
            }
            
            doc.save(`Topic-Exploration-${topic.replace(/\s+/g, '-') || 'Untitled'}.pdf`);
    
        } catch(e) {
            console.error("Failed to generate PDF:", e);
            setError("An error occurred while generating the PDF.");
        } finally {
            setIsExporting(false);
        }
    };


    const getCompetitionColor = (level: 'Low' | 'Medium' | 'High') => {
        switch (level) {
            case 'Low': return 'text-green-400';
            case 'Medium': return 'text-yellow-400';
            case 'High': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getPotentialColor = (level: 'Low' | 'Medium' | 'High') => {
        switch (level) {
            case 'Low': return 'text-red-400';
            case 'Medium': return 'text-yellow-400';
            case 'High': return 'text-green-400';
            default: return 'text-gray-400';
        }
    };

    const handlePrevNiche = () => {
        if (!results) return;
        setCurrentNicheIndex(prev => (prev - 1 + results.subNiches.length) % results.subNiches.length);
    };

    const handleNextNiche = () => {
        if (!results) return;
        setCurrentNicheIndex(prev => (prev + 1) % results.subNiches.length);
    };
    
    const isExploreDisabled = isLoading || !topic.trim() || !!validationError;
    
    return (
        <div className="space-y-8 animate-fade-in">
             <TopicDetailModal niche={selectedNiche!} isOpen={!!selectedNiche} onClose={() => setSelectedNiche(null)} />
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Topic Explorer</h1>
                    <p className="text-lg text-dark-text-secondary">Discover untapped content niches and analyze their potential.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-2 text-dark-text-secondary hover:text-white" title="Reset Progress">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    {results && (
                        <div className="group relative inline-block">
                            <button disabled={isExporting} className="bg-dark-border text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 flex-shrink-0 disabled:opacity-50 group-hover:rounded-b-none transition-all">
                                <DownloadIcon/> {isExporting ? 'Exporting...' : 'Export'}
                            </button>
                             <div className="absolute right-0 mt-0 w-full bg-dark-card border border-dark-border rounded-b-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                <a onClick={handleExportPdf} className="flex items-center gap-3 px-4 py-2 text-sm text-dark-text-secondary hover:bg-dark-border hover:text-white cursor-pointer"><DocumentTextIcon className="w-4 h-4" /> PDF</a>
                                <a onClick={() => handleExport('md')} className="flex items-center gap-3 px-4 py-2 text-sm text-dark-text-secondary hover:bg-dark-border hover:text-white cursor-pointer"><ClipboardIcon className="w-4 h-4" /> MD</a>
                                <a onClick={() => handleExport('txt')} className="flex items-center gap-3 px-4 py-2 text-sm text-dark-text-secondary hover:bg-dark-border hover:text-white cursor-pointer"><DocumentTextIcon className="w-4 h-4" /> TXT</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-dark-card p-6 rounded-lg border border-dark-border sticky top-0 z-20 backdrop-blur-sm bg-opacity-80 space-y-4">
                <div className="relative w-full">
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Enter a broad topic, e.g., 'urban gardening' or 'Shopify themes for fashion stores'"
                        className="w-full bg-dark-bg border border-dark-border rounded-md px-4 py-3 text-base text-white placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none pr-28"
                        rows={2}
                        disabled={isLoading}
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                        {loadingSuggestions['topic'] && (
                            <div className="bg-brand-purple rounded-md px-2 py-1 text-xs text-white animate-pulse">
                                Thinking...
                            </div>
                        )}
                        <button 
                            onClick={() => handleSuggest('topic', 'Topic to Explore', topic, 'A broad topic for finding YouTube sub-niches.')} 
                            disabled={loadingSuggestions['topic']}
                            title="Generate or refine topic with AI" 
                            className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50 transition-colors bg-dark-bg rounded-md"
                        >
                            {loadingSuggestions['topic'] ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                        </button>
                    </div>
                </div>
                 {validationError && <p className="text-yellow-400 text-xs mt-1">{validationError}</p>}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                        {saveStatus === 'unsaved' && <><div className="w-2 h-2 rounded-full bg-yellow-400"></div><span className="text-yellow-400">Unsaved changes</span></>}
                        {saveStatus === 'saving' && <><div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div><span className="text-blue-400">Saving...</span></>}
                        {saveStatus === 'saved' && <><div className="w-2 h-2 rounded-full bg-green-400"></div><span className="text-green-400">All changes saved</span></>}
                    </div>
                    <button
                        onClick={handleExplore}
                        disabled={isExploreDisabled}
                        className="bg-brand-purple text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-purple-light transition-transform transform hover:scale-105 duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <SearchIcon className="h-5 w-5"/> {isLoading ? 'Exploring...' : 'Explore'}
                    </button>
                </div>
                 <p className="text-sm text-dark-text-secondary italic text-center pt-4 border-t border-dark-border/50">
                    💡 Tip: All AI-generated content is fully editable. Click on any text to make your own changes.
                 </p>
                {error && !validationError && <p className="text-red-400 mt-2 text-sm">{error}</p>}
            </div>
            
            {isLoading && (
                 <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto"></div>
                    <p className="mt-4 text-dark-text-secondary">{loadingMessage}</p>
                </div>
            )}
            
            {results && (
                 <div ref={reportContentRef} className="space-y-6">
                    <div className="bg-dark-card p-6 rounded-lg border border-dark-border">
                        <h2 className="text-2xl font-bold text-white mb-2">Exploration Results for: <span className="text-brand-purple-light">{topic}</span></h2>
                        
                        {results.strategicInterpretation && (
                            <div className="bg-dark-bg p-4 rounded-lg border border-dark-border/50 my-4 flex items-start gap-3">
                                <LightbulbIcon className="w-6 h-6 text-brand-purple-light flex-shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-white mb-1 text-lg">Strategic Interpretation</h3>
                                    <p className="text-sm text-dark-text-secondary">{results.strategicInterpretation}</p>
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <div className="overflow-hidden">
                                <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentNicheIndex * 100}%)` }}>
                                    {results.subNiches.map((niche, index) => (
                                        <div key={index} className="w-full flex-shrink-0 px-1">
                                            <div className="bg-dark-bg p-6 rounded-lg border border-dark-border/50 space-y-4 max-w-2xl mx-auto">
                                                <div className="relative">
                                                    <input 
                                                        value={niche.name} 
                                                        onChange={e => handleNicheChange(index, 'name', e.target.value)}
                                                        className="font-bold text-xl text-white bg-transparent w-full focus:outline-none focus:bg-dark-card p-1 rounded-md pr-28"
                                                    />
                                                    <div className="absolute top-1/2 right-1 -translate-y-1/2 flex items-center gap-2">
                                                        {loadingSuggestions[`niche-${index}-name`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                                        <button onClick={() => handleSuggest(`niche-${index}-name`, 'Sub-niche Name', niche.name, `Audience: ${niche.audienceProfile}`)} disabled={loadingSuggestions[`niche-${index}-name`]} title="Suggest name" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center text-base">
                                                    <span className={`font-semibold ${getCompetitionColor(niche.competition)}`}>Competition: {niche.competition}</span>
                                                    <span className={`font-semibold ${getPotentialColor(niche.potential)}`}>Potential: {niche.potential}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-dark-text-secondary mb-1">Audience Profile</p>
                                                    <div className="relative">
                                                        <textarea 
                                                            value={niche.audienceProfile} 
                                                            onChange={e => handleNicheChange(index, 'audienceProfile', e.target.value)}
                                                            className="w-full text-base text-dark-text-secondary bg-transparent focus:outline-none focus:bg-dark-card p-1 rounded-md pr-28"
                                                            rows={3}
                                                        />
                                                        <div className="absolute top-1 right-1 flex items-center gap-2">
                                                            {loadingSuggestions[`niche-${index}-audienceProfile`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                                            <button onClick={() => handleSuggest(`niche-${index}-audienceProfile`, 'Audience Profile', niche.audienceProfile, `For a sub-niche named: ${niche.name}`)} disabled={loadingSuggestions[`niche-${index}-audienceProfile`]} title="Suggest profile" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-dark-text-secondary mb-1">Content Angles</p>
                                                    <div className="relative">
                                                        <textarea 
                                                            value={(niche.contentAngles || []).join('\n')} 
                                                            onChange={e => handleNicheChange(index, 'contentAngles', e.target.value.split('\n'))}
                                                            className="w-full text-base text-dark-text bg-transparent focus:outline-none focus:bg-dark-card p-1 rounded-md pr-28"
                                                            rows={(niche.contentAngles || []).length + 1}
                                                        />
                                                        <div className="absolute top-1 right-1 flex items-center gap-2">
                                                             {loadingSuggestions[`niche-${index}-contentAngles`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                                            <button onClick={() => handleSuggest(`niche-${index}-contentAngles`, 'Content Angles', (niche.contentAngles || []).join('\n'), `For a sub-niche named: ${niche.name}`, 'list')} disabled={loadingSuggestions[`niche-${index}-contentAngles`]} title="Suggest angles" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-4 border-t border-dark-border/30">
                                                    <button onClick={() => setSelectedNiche(niche)} className="flex-1 text-sm text-center bg-brand-purple/20 text-brand-purple-light font-semibold py-2 px-3 rounded-md hover:bg-brand-purple/40 transition-colors">
                                                        Deep Dive &rarr;
                                                    </button>
                                                    <button onClick={() => onNavigate && onNavigate('contentSeriesPlanner', { topic: niche.name })} className="flex items-center justify-center gap-1.5 flex-1 text-sm text-center bg-brand-purple/20 text-brand-purple-light font-semibold py-2 px-3 rounded-md hover:bg-brand-purple/40 transition-colors">
                                                        <ViewGridIcon className="w-4 h-4" /> Plan Series
                                                    </button>
                                                    {isWorkflowMode && <button onClick={() => onWorkflowComplete && onWorkflowComplete({ selectedNiche: niche })} className="flex-1 text-sm bg-brand-purple text-white font-semibold py-2 px-3 rounded-md hover:bg-brand-purple-light">Select & Continue</button>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {results.subNiches.length > 1 && (
                                <div className="flex items-center justify-between mt-4 max-w-2xl mx-auto">
                                    <button onClick={handlePrevNiche} className="p-2 rounded-full bg-dark-card border border-dark-border hover:bg-dark-border text-dark-text-secondary hover:text-white transition-colors">
                                        <ArrowLeftIcon className="w-6 h-6" />
                                    </button>
                                    <span className="text-sm font-mono text-dark-text-secondary">{currentNicheIndex + 1} / {results.subNiches.length}</span>
                                    <button onClick={handleNextNiche} className="p-2 rounded-full bg-dark-card border border-dark-border hover:bg-dark-border text-dark-text-secondary hover:text-white transition-colors">
                                        <ArrowRightIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TopicExplorer;