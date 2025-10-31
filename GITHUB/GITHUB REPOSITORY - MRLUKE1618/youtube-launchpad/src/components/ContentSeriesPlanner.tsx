import React, { useState, useEffect, useRef } from 'react';
import { generateContentSeries, suggestTextRefinement, validateInput } from '../services/geminiService';
import { ContentSeriesPlan, View } from '../types';
import ViewGridIcon from './icons/ViewGridIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import TrashIcon from './icons/TrashIcon';
import DownloadIcon from './icons/DownloadIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import SparklesIcon from './icons/SparklesIcon';

type SaveStatus = 'unsaved' | 'saving' | 'saved';
const LOCAL_STORAGE_KEY = 'yt-launchpad-series-planner-state';

interface ContentSeriesPlannerProps {
    onNavigate: (view: View, payload?: any) => void;
    initialData?: { topic: string } | null;
}

const MIN_TOPIC_LENGTH = 5;

const ContentSeriesPlanner: React.FC<ContentSeriesPlannerProps> = ({ onNavigate, initialData }) => {
    const [topic, setTopic] = useState('');
    const [videoCount, setVideoCount] = useState(4);
    const [plan, setPlan] = useState<ContentSeriesPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [openEpisodeIndex, setOpenEpisodeIndex] = useState<number | null>(0);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const reportContentRef = useRef<HTMLDivElement>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: string]: boolean }>({});
    const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set());

    // Load state from localStorage on mount
    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                setTopic(savedState.topic || '');
                setVideoCount(savedState.videoCount || 4);
                setPlan(savedState.plan || null);
                if (savedState.plan) {
                    setOpenEpisodeIndex(0);
                }
            } catch (e) {
                console.error("Failed to parse series planner state from localStorage", e);
            }
        }
    }, []);

    // Handle incoming data from other tools
    useEffect(() => {
        if (initialData && initialData.topic && !plan) {
            setTopic(initialData.topic);
            // Optionally auto-generate plan when topic is received
            // handleGeneratePlan(initialData.topic); 
        }
    }, [initialData]);

    // Auto-save state to localStorage with debounce
    useEffect(() => {
        setSaveStatus('unsaved');
        const handler = setTimeout(() => {
            setSaveStatus('saving');
            const stateToSave = {
                topic,
                videoCount,
                plan,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
            setTimeout(() => setSaveStatus('saved'), 500);
        }, 1500);

        return () => {
            clearTimeout(handler);
        };
    }, [topic, videoCount, plan]);

     // Real-time input validation
    useEffect(() => {
        const { message } = validateInput(topic, MIN_TOPIC_LENGTH, 'series topic');
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
            
            const parts = key.split('-');
            if (parts[0] === 'topic') {
                setTopic(result.suggestion as string);
            } else if (parts[0] === 'seriesTitle' && plan) {
                setPlan({ ...plan, seriesTitle: result.suggestion as string });
            } else if (parts[0] === 'seriesRationale' && plan) {
                setPlan({ ...plan, seriesRationale: result.suggestion as string });
            } else if (parts[0] === 'episode' && plan) {
                const index = parseInt(parts[1], 10);
                const field = parts[2] as keyof ContentSeriesPlan['episodes'][0];
                
                const newEpisodes = [...plan.episodes];
                (newEpisodes[index] as any)[field] = result.suggestion;

                setPlan({ ...plan, episodes: newEpisodes });
            }

        } catch (e) {
            setError('Failed to get a suggestion.');
            console.error(e);
        } finally {
            setLoadingSuggestions(prev => ({ ...prev, [key]: false }));
        }
    };


    const handleGeneratePlan = async (topicToGenerate = topic) => {
        const { isValid, message } = validateInput(topicToGenerate, MIN_TOPIC_LENGTH, 'series topic');
        if (!isValid) {
            setError(message || 'Please enter a valid topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setPlan(null);
        setSelectedEpisodes(new Set());
        try {
            const result = await generateContentSeries(topicToGenerate, videoCount);
            setPlan(result);
            setOpenEpisodeIndex(0); // Open the first episode by default
        } catch (e: any) {
            setError(e.message || 'Failed to generate content series.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePlanChange = (field: string, value: any, episodeIndex?: number) => {
        setPlan(prevPlan => {
            if (!prevPlan) return null;
            if (episodeIndex !== undefined) {
                const newEpisodes = [...prevPlan.episodes];
                const episodeToUpdate = { ...newEpisodes[episodeIndex] } as any;
                episodeToUpdate[field] = value;
                newEpisodes[episodeIndex] = episodeToUpdate;
                return { ...prevPlan, episodes: newEpisodes };
            }
            return { ...prevPlan, [field]: value };
        });
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear the current series plan? This cannot be undone.")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setTopic('');
            setVideoCount(4);
            setPlan(null);
            setError(null);
            setOpenEpisodeIndex(0);
            setSelectedEpisodes(new Set());
        }
    };

    const generateReportText = (format: 'md' | 'txt'): string => {
        if (!plan) return '';
        const nl = '\n';
        const h1 = format === 'md' ? '# ' : '';
        const h2 = format === 'md' ? '## ' : '';
        const h3 = format === 'md' ? '### ' : '';
        const listItem = (text: string) => format === 'md' ? `* ${text}` : `  - ${text}`;
    
        let report = `${h1}Content Series Plan: ${plan.seriesTitle}${nl.repeat(2)}`;
        
        if (plan.seriesRationale) {
            report += `${h2}Strategic Rationale\n${plan.seriesRationale}${nl.repeat(2)}`;
        }

        plan.episodes.forEach(ep => {
            report += `${h2}Episode ${ep.episode}: ${ep.title}${nl}`;
            report += `${h3}Hook${nl}${ep.hook}${nl.repeat(2)}`;
            report += `${h3}Description${nl}${ep.description}${nl.repeat(2)}`;
            report += `${h3}Talking Points${nl}${(ep.talkingPoints || []).map(listItem).join(nl)}${nl.repeat(2)}`;
        });

        const currentYear = new Date().getFullYear();
        const copyrightYear = currentYear > 2025 ? `2025-${currentYear}` : '2025';
        const copyrightText = `This document was generated using YT Launchpad. © ${copyrightYear} Developed by MrLuke1618. All rights reserved.`;
        report += `\n---\n${copyrightText}`;

        return report;
    };

    const handleExport = (format: 'md' | 'txt') => {
        const reportText = generateReportText(format);
        const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
        const blob = new Blob([reportText], { type: `${mimeType};charset=utf-8;` });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Content-Series-Plan-${topic.replace(/\s+/g, '-') || 'Untitled'}.${format}`;
        link.click();
        URL.revokeObjectURL(link.href);
    };
    
    const handleDevelopEpisode = (episode: ContentSeriesPlan['episodes'][0]) => {
        onNavigate('videoBrief', { episodes: [episode] });
    };

    const handleDevelopSelected = () => {
        if (!plan || selectedEpisodes.size === 0) return;
        const selectedEpisodeData = Array.from(selectedEpisodes).map(index => plan.episodes[index]);
        onNavigate('videoBrief', { episodes: selectedEpisodeData });
    };

    const handleToggleEpisodeSelection = (index: number) => {
        setSelectedEpisodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const currentEpisode = (plan && openEpisodeIndex !== null) ? plan.episodes[openEpisodeIndex] : null;

    const isGenerateDisabled = isLoading || !topic.trim() || !!validationError;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Content Series Planner</h1>
                    <p className="text-lg text-dark-text-secondary">Turn one great idea into a binge-worthy video series.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-2 text-dark-text-secondary hover:text-white" title="Reset Progress">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    {plan && (
                         <div className="group relative inline-block">
                            <button className="bg-dark-border text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 flex-shrink-0 group-hover:rounded-b-none transition-all">
                                <DownloadIcon/> Export
                            </button>
                             <div className="absolute right-0 mt-0 w-full bg-dark-card border border-dark-border rounded-b-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                <a onClick={() => handleExport('md')} className="flex items-center gap-3 px-4 py-2 text-sm text-dark-text-secondary hover:bg-dark-border hover:text-white cursor-pointer"><ClipboardIcon className="w-4 h-4" /> MD</a>
                                <a onClick={() => handleExport('txt')} className="flex items-center gap-3 px-4 py-2 text-sm text-dark-text-secondary hover:bg-dark-border hover:text-white cursor-pointer"><DocumentTextIcon className="w-4 h-4" /> TXT</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>


            <div className="bg-dark-card p-6 rounded-lg border border-dark-border space-y-4">
                 <div className="relative w-full">
                    <textarea
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="Enter a broad series topic, e.g., 'learning to code for beginners' or 'A/B testing strategies'"
                        className="w-full bg-dark-bg border border-dark-border rounded-md px-4 py-3 text-base text-white placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none pr-28"
                        rows={2}
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                        {loadingSuggestions['topic'] && <div className="bg-brand-purple rounded-md px-2 py-1 text-xs text-white animate-pulse">Thinking...</div>}
                        <button 
                            onClick={() => handleSuggest('topic', 'Series Topic', topic, 'A broad topic for a multi-part YouTube series.')} 
                            disabled={loadingSuggestions['topic']}
                            title="Generate or refine topic with AI" 
                            className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50 transition-colors bg-dark-bg rounded-md"
                        >
                            {loadingSuggestions['topic'] ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                        </button>
                    </div>
                </div>
                 {validationError && <p className="text-yellow-400 text-xs mt-1">{validationError}</p>}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <label htmlFor="videoCount" className="text-sm text-dark-text-secondary font-medium">Number of Videos:</label>
                         <input
                            id="videoCount"
                            type="number"
                            min="2"
                            max="12"
                            value={videoCount}
                            onChange={e => setVideoCount(Number(e.target.value))}
                            className="w-20 bg-dark-bg border border-dark-border rounded-md px-3 py-1 text-center text-white"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => handleGeneratePlan()}
                            disabled={isGenerateDisabled}
                            className="bg-brand-purple text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-purple-light transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <ViewGridIcon className="w-5 h-5" /> {isLoading ? 'Planning...' : 'Generate Plan'}
                        </button>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-dark-border/50">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                        {saveStatus === 'unsaved' && <><div className="w-2 h-2 rounded-full bg-yellow-400"></div><span className="text-yellow-400">Unsaved changes</span></>}
                        {saveStatus === 'saving' && <><div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div><span className="text-blue-400">Saving...</span></>}
                        {saveStatus === 'saved' && <><div className="w-2 h-2 rounded-full bg-green-400"></div><span className="text-green-400">All changes saved</span></>}
                    </div>
                </div>
                 <p className="text-sm text-dark-text-secondary italic text-center">
                    💡 Tip: All AI-generated content is fully editable. Click on any text to make your own changes.
                 </p>
                {error && !validationError && <p className="text-red-400 mt-2 text-sm text-center">{error}</p>}
            </div>
            
            {isLoading && (
                 <div className="text-center py-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto"></div><p className="mt-4 text-dark-text-secondary">Building your content roadmap...</p></div>
            )}

            {plan && (
                <div ref={reportContentRef} className="space-y-4">
                     <div className="bg-dark-card p-6 rounded-lg border border-dark-border">
                        <h2 className="text-sm font-semibold uppercase text-dark-text-secondary">Series Title</h2>
                        <div className="relative">
                            <input
                                type="text"
                                value={plan.seriesTitle}
                                onChange={e => handlePlanChange('seriesTitle', e.target.value)}
                                className="w-full text-2xl sm:text-3xl font-bold text-brand-purple-light bg-transparent focus:outline-none p-1 pr-28"
                            />
                             <div className="absolute top-1/2 right-1 -translate-y-1/2 flex items-center gap-2">
                                {loadingSuggestions['seriesTitle'] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                <button 
                                    onClick={() => handleSuggest('seriesTitle', 'Series Title', plan.seriesTitle, `For a series about: ${topic}.`)} 
                                    disabled={loadingSuggestions['seriesTitle']}
                                    title="Suggest a better series title" 
                                    className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"
                                >
                                    {loadingSuggestions['seriesTitle'] ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-6 h-6"/>}
                                </button>
                            </div>
                        </div>
                        {plan.seriesRationale && (
                            <div className="mt-4 relative">
                                <label className="text-xs font-semibold text-dark-text-secondary">The Power of a Series (Strategic Rationale)</label>
                                 <textarea
                                    value={plan.seriesRationale}
                                    onChange={e => handlePlanChange('seriesRationale', e.target.value)}
                                    className="w-full text-sm text-dark-text-secondary bg-dark-bg border border-dark-border/50 focus:outline-none focus:bg-dark-card p-2 rounded-md pr-28"
                                    rows={3}
                                />
                                <div className="absolute top-7 right-1 flex items-center gap-2">
                                    {loadingSuggestions['seriesRationale'] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                    <button onClick={() => handleSuggest('seriesRationale', 'Series Rationale', plan.seriesRationale, `For a series named: ${plan.seriesTitle}.`)} disabled={loadingSuggestions['seriesRationale']} title="Suggest rationale" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="bg-dark-card border border-dark-border rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            {plan.episodes.map((episode, index) => (
                                <div key={index} 
                                     onClick={() => setOpenEpisodeIndex(index)}
                                     className={`flex items-start gap-3 text-left p-3 rounded-md transition-colors text-sm cursor-pointer ${openEpisodeIndex === index ? 'bg-brand-purple text-white' : 'bg-dark-bg hover:bg-dark-border text-dark-text-secondary hover:text-white'}`}
                                >
                                    <input 
                                        type="checkbox"
                                        checked={selectedEpisodes.has(index)}
                                        onChange={() => handleToggleEpisodeSelection(index)}
                                        onClick={(e) => e.stopPropagation()}
                                        className={`mt-1 h-4 w-4 rounded-sm border-gray-300 focus:ring-brand-purple ${openEpisodeIndex === index ? 'bg-white/30 text-brand-purple' : 'bg-dark-card text-brand-purple'}`}
                                    />
                                    <div>
                                        <span className="font-bold">Ep {episode.episode}:</span> {episode.title}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {currentEpisode && (
                            <div className="bg-dark-bg p-6 rounded-lg border border-dark-border/50 space-y-6 animate-fade-in">
                                <div>
                                    <h3 className="text-sm font-semibold text-dark-text-secondary">Episode {currentEpisode.episode} Title</h3>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={currentEpisode.title}
                                            onChange={e => handlePlanChange('title', e.target.value, openEpisodeIndex!)}
                                            className="font-bold text-xl text-white bg-transparent w-full focus:outline-none focus:bg-dark-card p-1 rounded-md pr-28"
                                        />
                                        <div className="absolute top-1/2 right-1 -translate-y-1/2 flex items-center gap-2">
                                            {loadingSuggestions[`episode-${openEpisodeIndex}-title`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleSuggest(`episode-${openEpisodeIndex}-title`, 'Episode Title', currentEpisode.title, `For a series named '${plan.seriesTitle}'. Episode description: ${currentEpisode.description}`) }}
                                                disabled={loadingSuggestions[`episode-${openEpisodeIndex}-title`]}
                                                title="Suggest a better episode title" 
                                                className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"
                                            >
                                                {loadingSuggestions[`episode-${openEpisodeIndex}-title`] ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-brand-purple-light mb-1">Episode Summary</h4>
                                    <div className="relative">
                                        <textarea
                                            value={currentEpisode.description}
                                            onChange={e => handlePlanChange('description', e.target.value, openEpisodeIndex!)}
                                            className="w-full text-sm text-dark-text-secondary bg-transparent focus:outline-none focus:bg-dark-card p-1 rounded-md pr-28"
                                            rows={3}
                                        />
                                        <div className="absolute top-1 right-1 flex items-center gap-2">
                                            {loadingSuggestions[`episode-${openEpisodeIndex}-description`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                            <button onClick={() => handleSuggest(`episode-${openEpisodeIndex}-description`, 'Episode Description', currentEpisode.description, `For an episode titled: ${currentEpisode.title}.`)} disabled={loadingSuggestions[`episode-${openEpisodeIndex}-description`]} title="Suggest a better description" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-brand-purple-light mb-1">Engaging Hook (First 30s)</h4>
                                    <div className="relative">
                                        <textarea
                                            value={currentEpisode.hook}
                                            onChange={e => handlePlanChange('hook', e.target.value, openEpisodeIndex!)}
                                            className="w-full text-sm text-dark-text font-mono bg-transparent focus:outline-none focus:bg-dark-card p-1 rounded-md pr-28"
                                            rows={4}
                                        />
                                        <div className="absolute top-1 right-1 flex items-center gap-2">
                                            {loadingSuggestions[`episode-${openEpisodeIndex}-hook`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                            <button onClick={() => handleSuggest(`episode-${openEpisodeIndex}-hook`, 'Episode Hook', currentEpisode.hook, `For an episode titled: ${currentEpisode.title}.`)} disabled={loadingSuggestions[`episode-${openEpisodeIndex}-hook`]} title="Suggest a better hook" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-brand-purple-light mb-1">Key Talking Points</h4>
                                    <div className="relative">
                                        <textarea
                                            value={(currentEpisode.talkingPoints || []).join('\n')}
                                            onChange={e => handlePlanChange('talkingPoints', e.target.value.split('\n'), openEpisodeIndex!)}
                                            className="w-full text-sm text-dark-text space-y-1 bg-transparent focus:outline-none focus:bg-dark-card p-1 rounded-md pr-28"
                                            rows={(currentEpisode.talkingPoints || []).length + 1}
                                        />
                                        <div className="absolute top-1 right-1 flex items-center gap-2">
                                            {loadingSuggestions[`episode-${openEpisodeIndex}-talkingPoints`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                            <button onClick={() => handleSuggest(`episode-${openEpisodeIndex}-talkingPoints`, 'Talking Points', (currentEpisode.talkingPoints || []).join('\n'), `For an episode titled: ${currentEpisode.title}.`, 'list')} disabled={loadingSuggestions[`episode-${openEpisodeIndex}-talkingPoints`]} title="Suggest new talking points" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-dark-border/50 pt-4">
                                    <button onClick={() => handleDevelopEpisode(currentEpisode)} className="w-full sm:w-auto bg-brand-purple/20 text-brand-purple-light font-semibold py-2 px-4 rounded-lg hover:bg-brand-purple/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                        <LightbulbIcon className="w-5 h-5"/> Develop This Episode
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                     {selectedEpisodes.size > 0 && (
                        <div className="mt-4 p-4 bg-dark-bg rounded-lg border border-dark-border/50 flex items-center justify-center">
                            <button 
                                onClick={handleDevelopSelected}
                                className="bg-brand-purple text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-purple-light transition-transform transform hover:scale-105 duration-200 flex items-center justify-center gap-2"
                            >
                                <LightbulbIcon className="w-5 h-5"/> Develop {selectedEpisodes.size} Selected Videos
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ContentSeriesPlanner;