import React, { useState, useEffect, useRef } from 'react';
import { generateVideoBrief, generateVideoDescription, generateSocialMediaPosts, regenerateSingleTitle, regenerateHook, regenerateSeoChecklist, generateVideoBriefFromIdea, suggestTextRefinement, validateInput } from '../services/geminiService';
import { VideoBrief, SocialPosts, VideoOutlineItem, View } from '../types';
import LightbulbIcon from './icons/LightbulbIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import DownloadIcon from './icons/DownloadIcon';
import UploadIcon from './icons/UploadIcon';
import ShareIcon from './icons/ShareIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import SparklesIcon from './icons/SparklesIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import ChartIcon from './icons/ChartIcon';
import BeakerIcon from './icons/BeakerIcon';

type Tab = 'planning' | 'upload' | 'promote';
type DurationPreset = 'Under 5 min' | '5-10 min' | '10-20 min' | 'custom';
type SaveStatus = 'unsaved' | 'saving' | 'saved';

const LOCAL_STORAGE_KEY = 'yt-launchpad-video-brief-state';

interface VideoBriefGeneratorProps {
    initialData: any | null;
    onNavigate?: (view: View, payload?: any) => void;
}

const initialChecklist = [
    { id: 1, text: 'Finalize video title and description', completed: false }, { id: 2, text: 'Create a compelling, high-CTR thumbnail', completed: false }, { id: 3, text: 'Add relevant tags', completed: false }, { id: 4, text: 'Add video to a relevant playlist', completed: false }, { id: 5, text: 'Add info cards and end screens', completed: false }, { id: 6, text: 'Set visibility (e.g., Unlisted, Scheduled)', completed: false },
];
const initialPromoteChecklist = [
    { id: 1, text: 'Share on Twitter / X', completed: false },
    { id: 2, text: 'Share on LinkedIn', completed: false },
    { id: 3, text: 'Post Instagram Reel/Story', completed: false },
    { id: 4, text: 'Post TikTok video', completed: false },
    { id: 5, text: 'Share with email newsletter', completed: false },
    { id: 6, text: 'Post in relevant online communities (Reddit, Facebook Groups)', completed: false },
    { id: 7, text: 'Pin a comment to engage viewers', completed: false },
    { id: 8, text: 'Monitor analytics for the first 48 hours', completed: false },
];

interface BriefWorkflowState {
    id: string;
    seedData: any;
    brief: VideoBrief | null;
    generationStatus: 'pending' | 'generating' | 'done' | 'error';
    videoDescription: string;
    socialPosts: SocialPosts;
    uploadChecklist: any[];
    promoteChecklist: any[];
    isGeneratingDescription?: boolean;
    isGeneratingPosts?: boolean;
}

const createNewBriefState = (seedData: any): BriefWorkflowState => ({
    id: crypto.randomUUID(),
    seedData,
    brief: null,
    generationStatus: 'pending',
    videoDescription: '',
    socialPosts: { twitter: '', linkedin: '', instagram: '', tiktok: '' },
    uploadChecklist: initialChecklist.map(item => ({...item})),
    promoteChecklist: initialPromoteChecklist.map(item => ({...item})),
    isGeneratingDescription: false,
    isGeneratingPosts: false,
});

const MIN_TOPIC_LENGTH = 5;

const VideoBriefGenerator: React.FC<VideoBriefGeneratorProps> = ({ initialData, onNavigate }) => {
    const [topic, setTopic] = useState('');
    const [briefStates, setBriefStates] = useState<BriefWorkflowState[]>([]);
    const [activeBriefIndex, setActiveBriefIndex] = useState(0);
    const [isMultiMode, setIsMultiMode] = useState(false);
    
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('planning');
    
    const [durationPreset, setDurationPreset] = useState<DurationPreset>('5-10 min');
    const [customDuration, setCustomDuration] = useState(15);
    
    const [regeneratingTitleIndex, setRegeneratingTitleIndex] = useState<number | null>(null);
    const [isRegeneratingHook, setIsRegeneratingHook] = useState(false);
    const [isRegeneratingSeo, setIsRegeneratingSeo] = useState(false);
    const [copiedItem, setCopiedItem] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

    const videoBriefLoadingSteps = [ "Deconstructing the topic...", "Researching top-performing content...", "Brainstorming click-worthy titles...", "Crafting a compelling hook...", "Structuring the video outline...", "Identifying high-impact keywords...", "Assembling the final brief...", ];

    const updateCurrentBriefState = (updater: (prevState: BriefWorkflowState) => BriefWorkflowState) => {
        setBriefStates(prev => {
            if (!prev[activeBriefIndex]) return prev;
            const newStates = [...prev];
            newStates[activeBriefIndex] = updater(newStates[activeBriefIndex]);
            return newStates;
        });
    };
    
    const currentBriefState = briefStates[activeBriefIndex];
    const currentBrief = currentBriefState?.brief;
    const isLoading = currentBriefState?.generationStatus === 'generating';


    // Load state from localStorage on mount
    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                setTopic(savedState.topic || '');
                setBriefStates(savedState.briefStates || []);
                setActiveBriefIndex(savedState.activeBriefIndex || 0);
                setIsMultiMode(savedState.isMultiMode || false);
                setDurationPreset(savedState.durationPreset || '5-10 min');
                setCustomDuration(savedState.customDuration || 15);
            } catch (e) {
                console.error("Failed to parse video brief state from localStorage", e);
            }
        }
    }, []);
    
    // Handle incoming data from other tools
    useEffect(() => {
        if (initialData) {
            if (initialData.episodes && Array.isArray(initialData.episodes)) {
                setIsMultiMode(true);
                setTopic('');
                setBriefStates(initialData.episodes.map(createNewBriefState));
                setActiveBriefIndex(0);
            } else if (initialData.topic) {
                setIsMultiMode(false);
                setTopic(initialData.topic);
                setBriefStates([]);
            }
        }
    }, [initialData]);

    // Auto-save state to localStorage with debounce
    useEffect(() => {
        setSaveStatus('unsaved');
        const handler = setTimeout(() => {
            setSaveStatus('saving');
            const stateToSave = { topic, briefStates, activeBriefIndex, isMultiMode, durationPreset, customDuration };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
            setTimeout(() => setSaveStatus('saved'), 500);
        }, 1500);

        return () => clearTimeout(handler);
    }, [topic, briefStates, activeBriefIndex, isMultiMode, durationPreset, customDuration]);

     // Real-time input validation for single mode
    useEffect(() => {
        if (!isMultiMode) {
            const { message } = validateInput(topic, MIN_TOPIC_LENGTH, 'video topic');
            setValidationError(message);
        } else {
            setValidationError(null);
        }
    }, [topic, isMultiMode]);


    useEffect(() => {
        let interval: number | undefined;
        if (isLoading) {
            let step = 0;
            setLoadingMessage(videoBriefLoadingSteps[0]);
            interval = window.setInterval(() => {
                step = (step + 1) % videoBriefLoadingSteps.length;
                setLoadingMessage(videoBriefLoadingSteps[step]);
            }, 1500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading]);

    const handleGenerateBrief = async (index: number) => {
        const stateToGenerate = briefStates[index];
        if (!stateToGenerate) return;

        setBriefStates(prev => {
            const newStates = [...prev];
            newStates[index] = { ...newStates[index], generationStatus: 'generating', brief: null };
            return newStates;
        });
        setError(null);
        setActiveTab('planning');

        const finalDuration = durationPreset === 'custom' ? `${customDuration} minutes` : durationPreset;
        const seed = stateToGenerate.seedData;

        try {
            const result = await generateVideoBriefFromIdea(seed, finalDuration);
            const briefWithIds: VideoBrief = {
                ...result,
                outline: result.outline.map(item => ({ ...item, id: crypto.randomUUID() }))
            };
            setBriefStates(prev => {
                const newStates = [...prev];
                newStates[index] = { ...newStates[index], brief: briefWithIds, generationStatus: 'done' };
                return newStates;
            });
        } catch (e: any) {
            setError(e.message || 'Failed to generate brief.');
            setBriefStates(prev => {
                const newStates = [...prev];
                newStates[index] = { ...newStates[index], generationStatus: 'error' };
                return newStates;
            });
        }
    };

    const handleGenerateSingleBrief = async () => {
        const { isValid, message } = validateInput(topic, MIN_TOPIC_LENGTH, 'video topic');
        if (!isValid) {
            setError(message || 'Please enter a valid topic.');
            return;
        }
        
        const seed = { topic };
        const newState = createNewBriefState(seed);
        newState.generationStatus = 'generating';

        setBriefStates([newState]);
        setActiveBriefIndex(0);
        setIsMultiMode(true); // Switch to multimode view even for one item
        setError(null);

        const finalDuration = durationPreset === 'custom' ? `${customDuration} minutes` : durationPreset;

        try {
            const result = await generateVideoBrief(topic, finalDuration);
            const briefWithIds: VideoBrief = {
                ...result,
                outline: result.outline.map(item => ({ ...item, id: crypto.randomUUID() }))
            };
            updateCurrentBriefState(prev => ({ ...prev, brief: briefWithIds, generationStatus: 'done' }));
        } catch(e: any) {
            setError(e.message || 'Failed to generate brief.');
            updateCurrentBriefState(prev => ({ ...prev, generationStatus: 'error' }));
        }
    };
    
     const handleSuggestTopic = async () => {
        // This is only for single mode
        //setIsSuggestingTopic(true);
        try {
            const result = await suggestTextRefinement({
                fieldName: 'Video Topic',
                currentValue: topic,
                context: 'A topic for a YouTube video targeting Shopify merchants.'
            });
            setTopic(result.suggestion as string);
        } catch (e) {
            console.error("Failed to suggest topic", e);
            setError("Failed to suggest a new topic.");
        } finally {
            //setIsSuggestingTopic(false);
        }
    };
    
    const handleAddOutlineItem = () => {
        updateCurrentBriefState(prev => {
            if (!prev.brief) return prev;
            const newItem: VideoOutlineItem = { id: crypto.randomUUID(), timestamp: '00:00', topic: 'New Section', points: ['New talking point.'] };
            return { ...prev, brief: { ...prev.brief, outline: [...prev.brief.outline, newItem] } };
        });
    };
    
    const handleRemoveOutlineItem = (idToRemove: string) => {
        updateCurrentBriefState(prev => {
            if (!prev.brief) return prev;
            return { ...prev, brief: { ...prev.brief, outline: prev.brief.outline.filter(item => item.id !== idToRemove) } };
        });
    };

    const handleRegenerateTitle = async (index: number) => {
        if (!currentBrief) return;
        setRegeneratingTitleIndex(index);
        try {
            const result = await regenerateSingleTitle(currentBriefState.seedData.topic, currentBrief.titleOptions[index]);
            updateCurrentBriefState(prev => {
                if (!prev.brief) return prev;
                const newTitleOptions = [...prev.brief.titleOptions];
                newTitleOptions[index] = result.title;
                return { ...prev, brief: { ...prev.brief, titleOptions: newTitleOptions } };
            });
        } catch (e) {
            console.error(e);
        } finally {
            setRegeneratingTitleIndex(null);
        }
    };
    
    const handleRegenerateHook = async () => {
        if (!currentBrief) return;
        setIsRegeneratingHook(true);
        try {
            const result = await regenerateHook(currentBriefState.seedData.topic);
            updateCurrentBriefState(prev => prev.brief ? { ...prev, brief: { ...prev.brief, hook: result.hook } } : prev);
        } catch (e) {
            console.error(e);
        } finally {
            setIsRegeneratingHook(false);
        }
    };
    
    const handleRegenerateSeo = async () => {
        if (!currentBrief) return;
        setIsRegeneratingSeo(true);
        try {
            const result = await regenerateSeoChecklist(currentBriefState.seedData.topic);
            updateCurrentBriefState(prev => prev.brief ? { ...prev, brief: { ...prev.brief, seoChecklist: result } } : prev);
        } catch (e) {
            console.error(e);
        } finally {
            setIsRegeneratingSeo(false);
        }
    };
    
    const handleCopy = (text: string, identifier: string) => {
        navigator.clipboard.writeText(text);
        setCopiedItem(identifier);
        setTimeout(() => setCopiedItem(null), 2000);
    };

    const handleGenerateDescription = async () => {
        if (!currentBrief) return;
        updateCurrentBriefState(prev => ({ ...prev, isGeneratingDescription: true }));
        setError(null);
        try {
            const result = await generateVideoDescription(currentBrief);
            updateCurrentBriefState(prev => ({ ...prev, videoDescription: result.description, isGeneratingDescription: false }));
        } catch (e: any) {
            setError(e.message || 'Failed to generate video description.');
            console.error(e);
            updateCurrentBriefState(prev => ({ ...prev, isGeneratingDescription: false }));
        }
    };
    
    const handleGeneratePosts = async () => {
        if (!currentBrief) return;
        updateCurrentBriefState(prev => ({ ...prev, isGeneratingPosts: true }));
        setError(null);
        try {
            const result = await generateSocialMediaPosts(currentBrief);
            updateCurrentBriefState(prev => ({ ...prev, socialPosts: result, isGeneratingPosts: false }));
        } catch (e: any) {
            setError(e.message || 'Failed to generate social media posts.');
            console.error(e);
            updateCurrentBriefState(prev => ({ ...prev, isGeneratingPosts: false }));
        }
    };

    const handleToggleChecklist = (list: 'upload' | 'promote', id: number) => {
        updateCurrentBriefState(prev => {
            const listToUpdate = list === 'upload' ? prev.uploadChecklist : prev.promoteChecklist;
            const updatedList = listToUpdate.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
            return {...prev, [list === 'upload' ? 'uploadChecklist' : 'promoteChecklist']: updatedList};
        });
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset all progress for this tool? This cannot be undone.")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setTopic('');
            setBriefStates([]);
            setIsMultiMode(false);
            setError(null);
            setActiveTab('planning');
        }
    };
    
    const handleSendToScript = () => {
        if (!currentBrief || !onNavigate) return;
        const scriptText = currentBrief.outline.map(item => `## ${item.timestamp} - ${item.topic}\n\n` + (item.points || []).map(p => `- ${p}`).join('\n')).join('\n\n');
        onNavigate('scriptAnalyzer', { script: scriptText });
    };

    const handleSendToTester = () => {
        if (!currentBrief || !onNavigate) return;
        onNavigate('thumbnailTester', { 
            topic: currentBriefState.seedData.topic,
            titleA: currentBrief.titleOptions[0] || '',
            titleB: currentBrief.titleOptions[1] || ''
        });
    };

    const TabButton: React.FC<{ current: Tab; target: Tab; icon: React.ReactNode, children: React.ReactNode }> = ({ current, target, children, icon }) => (
        <button
            onClick={() => setActiveTab(target)}
            disabled={!currentBrief}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                current === target 
                ? 'border-brand-purple text-white' 
                : 'border-transparent text-dark-text-secondary hover:text-white'
            }`}
        >
            {icon}
            {children}
        </button>
    );

    const EditableCard: React.FC<{ title: string, children: React.ReactNode, actions?: React.ReactNode, id?: string }> = ({ title, children, actions, id }) => (
        <div id={id} className="bg-dark-card p-6 rounded-lg border border-dark-border">
           <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-brand-purple-light">{title}</h3>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
           {children}
       </div>
    );
    
    const ActionButton: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode, title: string }> = ({ onClick, disabled, children, title }) => (
        <button onClick={onClick} disabled={disabled} className="p-1.5 text-dark-text-secondary hover:text-white disabled:opacity-50 transition-colors" title={title}>
            {children}
        </button>
    );

    const renderBriefContent = () => {
        if (!currentBriefState) {
            return <div className="text-center py-10 text-dark-text-secondary">No video plans loaded.</div>;
        }

        switch (currentBriefState.generationStatus) {
            case 'pending':
                return (
                    <div className="text-center py-20 bg-dark-card border border-dark-border rounded-lg">
                        <h3 className="text-xl font-bold">Ready to Plan "{currentBriefState.seedData.title || currentBriefState.seedData.topic}"?</h3>
                        <p className="text-dark-text-secondary mt-2 mb-6">Generate a complete video brief for this episode.</p>
                        <button onClick={() => handleGenerateBrief(activeBriefIndex)} className="bg-brand-purple text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-purple-light transition-transform transform hover:scale-105 duration-200 flex items-center justify-center gap-2 mx-auto">
                            <LightbulbIcon className="h-5 w-5"/> Generate Plan
                        </button>
                    </div>
                );
            case 'generating':
                return (
                    <div className="text-center py-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto"></div>
                        <p className="mt-4 text-dark-text-secondary">{loadingMessage}</p>
                    </div>
                );
            case 'error':
                 return <div className="text-center py-20 bg-red-900/20 border border-red-500 rounded-lg text-red-400">Error generating brief. Please try again.</div>;
            case 'done':
                 if (!currentBrief) return null;
                 return (
                     <div>
                        <div id="brief-tabs" className="border-b border-dark-border mb-6">
                            <nav className="-mb-px flex gap-2 sm:gap-4 overflow-x-auto" aria-label="Tabs">
                               <TabButton current={activeTab} target="planning" icon={<ClipboardIcon className="w-5 h-5"/>}>1. Planning</TabButton>
                               <TabButton current={activeTab} target="upload" icon={<UploadIcon className="w-5 h-5"/>}>2. Uploading</TabButton>
                               <TabButton current={activeTab} target="promote" icon={<ShareIcon className="w-5 h-5"/>}>3. Promotion</TabButton>
                            </nav>
                        </div>
                        {activeTab === 'planning' && (
                            <div className="space-y-6">
                                <EditableCard id="planning-titles" title="Title Options">
                                    <div className="space-y-2">
                                        {(currentBrief.titleOptions || []).map((title, i) => (
                                            <div key={i} className="relative">
                                                <input type="text" value={title} onChange={e => {
                                                    const newTitle = e.target.value;
                                                    updateCurrentBriefState(prev => {
                                                        if (!prev.brief) return prev;
                                                        const newTitleOptions = [...(prev.brief.titleOptions || [])];
                                                        newTitleOptions[i] = newTitle;
                                                        return { ...prev, brief: { ...prev.brief, titleOptions: newTitleOptions } };
                                                    });
                                                }} className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-dark-text focus:ring-brand-purple focus:border-brand-purple pr-28"/>
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    {regeneratingTitleIndex === i && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Regenerating...</div>}
                                                    <button onClick={() => handleRegenerateTitle(i)} disabled={regeneratingTitleIndex === i} title="Regenerate this title" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50">
                                                        {regeneratingTitleIndex === i ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </EditableCard>
                                 <EditableCard 
                                    id="planning-hook"
                                    title="Engaging Hook (First 30s)"
                                    actions={
                                        <div className="flex items-center gap-2">
                                            {isRegeneratingHook && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Regenerating...</div>}
                                            <ActionButton onClick={handleRegenerateHook} disabled={isRegeneratingHook} title="Regenerate Hook">
                                                {isRegeneratingHook ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                            </ActionButton>
                                        </div>
                                    }
                                 >
                                    <textarea value={currentBrief.hook} onChange={e => updateCurrentBriefState(prev => prev.brief ? { ...prev, brief: { ...prev.brief, hook: e.target.value } } : prev)} rows={4} className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-dark-text-secondary focus:ring-brand-purple focus:border-brand-purple font-mono text-sm"/>
                                </EditableCard>
                                <EditableCard id="planning-outline" title="Video Outline">
                                    <div className="relative border-l-2 border-dark-border/30 pl-8 space-y-8">
                                        {(currentBrief.outline || []).map((item) => (
                                            <div key={item.id} className="relative space-y-3 group">
                                                 <div className="absolute -left-[46px] top-2 flex items-center gap-2">
                                                    <div className="w-5 h-5 bg-brand-purple rounded-full border-4 border-dark-card z-10"></div>
                                                    <button onClick={() => handleRemoveOutlineItem(item.id!)} title="Remove Section" className="opacity-0 group-hover:opacity-100 text-dark-text-secondary hover:text-red-400 transition-opacity">
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                                <div className="flex gap-4 items-center">
                                                    <input 
                                                        type="text" 
                                                        value={item.timestamp} 
                                                        onChange={e => {
                                                            const newTimestamp = e.target.value;
                                                            updateCurrentBriefState(prev => prev.brief ? { ...prev, brief: { ...prev.brief, outline: prev.brief.outline.map(o => o.id === item.id ? { ...o, timestamp: newTimestamp } : o) } } : prev);
                                                        }}
                                                        className="bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-white w-32 text-center font-semibold flex-shrink-0"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={item.topic} 
                                                        onChange={e => {
                                                            const newTopic = e.target.value;
                                                            updateCurrentBriefState(prev => prev.brief ? { ...prev, brief: { ...prev.brief, outline: prev.brief.outline.map(o => o.id === item.id ? { ...o, topic: newTopic } : o) } } : prev);
                                                        }}
                                                        className="bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-white flex-grow font-semibold"
                                                    />
                                                </div>
                                                <textarea 
                                                    value={(item.points || []).join('\n')} 
                                                    onChange={e => {
                                                        const newPoints = e.target.value.split('\n');
                                                        updateCurrentBriefState(prev => prev.brief ? { ...prev, brief: { ...prev.brief, outline: prev.brief.outline.map(o => o.id === item.id ? { ...o, points: newPoints } : o) } } : prev);
                                                    }}
                                                    rows={(item.points || []).length + 1} 
                                                    className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-dark-text-secondary text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pl-8 mt-6">
                                        <button onClick={handleAddOutlineItem} className="flex items-center gap-2 text-sm text-brand-purple-light hover:underline">
                                            <PlusIcon className="w-4 h-4" /> Add Section
                                        </button>
                                    </div>
                                </EditableCard>
                                <div id="planning-seo" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <EditableCard 
                                        title="SEO Keywords"
                                        actions={
                                            <div className="flex items-center gap-2">
                                                {isRegeneratingSeo && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Regenerating...</div>}
                                                <ActionButton onClick={() => handleCopy((currentBrief.seoChecklist?.keywords || []).join(', '), 'keywords')} title="Copy Keywords">
                                                    {copiedItem === 'keywords' ? <span className="text-xs text-green-400">Copied!</span> : <ClipboardIcon className="w-5 h-5"/>}
                                                </ActionButton>
                                                <ActionButton onClick={handleRegenerateSeo} disabled={isRegeneratingSeo} title="Try Again">
                                                    {isRegeneratingSeo ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                                </ActionButton>
                                            </div>
                                        }
                                    >
                                        <textarea value={(currentBrief.seoChecklist?.keywords || []).join(', ')} onChange={e => {
                                            const newKeywords = e.target.value.split(',').map(k => k.trim());
                                            updateCurrentBriefState(prev => prev.brief ? { ...prev, brief: { ...prev.brief, seoChecklist: { ...(prev.brief.seoChecklist || {keywords:[], tags:[]}), keywords: newKeywords } } } : prev);
                                        }} rows={3} className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-dark-text-secondary focus:ring-brand-purple focus:border-brand-purple"/>
                                    </EditableCard>
                                    <EditableCard 
                                        title="YouTube Tags"
                                        actions={
                                             <div className="flex items-center gap-2">
                                                {isRegeneratingSeo && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Regenerating...</div>}
                                                <ActionButton onClick={() => handleCopy((currentBrief.seoChecklist?.tags || []).join(', '), 'tags')} title="Copy Tags">
                                                    {copiedItem === 'tags' ? <span className="text-xs text-green-400">Copied!</span> : <ClipboardIcon className="w-5 h-5"/>}
                                                </ActionButton>
                                                <ActionButton onClick={handleRegenerateSeo} disabled={isRegeneratingSeo} title="Try Again">
                                                    {isRegeneratingSeo ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                                </ActionButton>
                                            </div>
                                        }
                                    >
                                        <textarea value={(currentBrief.seoChecklist?.tags || []).join(', ')} onChange={e => {
                                            const newTags = e.target.value.split(',').map(t => t.trim());
                                            updateCurrentBriefState(prev => prev.brief ? { ...prev, brief: { ...prev.brief, seoChecklist: { ...(prev.brief.seoChecklist || {keywords:[], tags:[]}), tags: newTags } } } : prev);
                                        }} rows={3} className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-dark-text-secondary focus:ring-brand-purple focus:border-brand-purple"/>
                                    </EditableCard>
                                </div>
                                <EditableCard 
                                    id="planning-cta"
                                    title="Call to Action"
                                    actions={<ActionButton onClick={() => handleCopy(currentBrief.callToAction, 'cta')} title="Copy Call to Action">{copiedItem === 'cta' ? <span className="text-xs text-green-400">Copied!</span> : <ClipboardIcon className="w-5 h-5"/>}</ActionButton>}
                                >
                                   <textarea value={currentBrief.callToAction} onChange={e => updateCurrentBriefState(prev => prev.brief ? { ...prev, brief: { ...prev.brief, callToAction: e.target.value } } : prev)} rows={3} className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-dark-text focus:ring-brand-purple focus:border-brand-purple"/>
                                </EditableCard>
                                <EditableCard title="Next Steps">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button onClick={handleSendToScript} className="flex-1 bg-dark-bg border border-dark-border text-white font-semibold py-3 px-4 rounded-lg hover:border-brand-purple-light hover:text-brand-purple-light transition-colors flex items-center justify-center gap-2">
                                            <ChartIcon className="w-5 h-5" /> Polish Script
                                        </button>
                                        <button onClick={handleSendToTester} className="flex-1 bg-dark-bg border border-dark-border text-white font-semibold py-3 px-4 rounded-lg hover:border-brand-purple-light hover:text-brand-purple-light transition-colors flex items-center justify-center gap-2">
                                            <BeakerIcon className="w-5 h-5" /> Test Titles & Thumbnails
                                        </button>
                                    </div>
                                </EditableCard>
                            </div>
                        )}
                        {activeTab === 'upload' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <EditableCard 
                                    id="upload-description" 
                                    title="Video Description"
                                    actions={
                                        <ActionButton onClick={() => handleCopy(currentBriefState.videoDescription, 'description')} title="Copy Description">
                                            {copiedItem === 'description' ? <span className="text-xs text-green-400">Copied!</span> : <ClipboardIcon className="w-5 h-5"/>}
                                        </ActionButton>
                                    }
                                >
                                    <div className="space-y-4">
                                        <textarea value={currentBriefState.videoDescription} onChange={e => updateCurrentBriefState(p => ({...p, videoDescription: e.target.value}))} rows={15} className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-dark-text-secondary focus:ring-brand-purple focus:border-brand-purple" placeholder="Your video description goes here..."/>
                                        <button onClick={handleGenerateDescription} disabled={currentBriefState?.isGeneratingDescription} className="w-full bg-brand-purple/20 text-brand-purple-light font-semibold py-2 px-4 rounded-lg hover:bg-brand-purple/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                            <SparklesIcon className="w-4 h-4"/> {currentBriefState?.isGeneratingDescription ? 'Generating...' : 'Generate with AI'}
                                        </button>
                                    </div>
                                </EditableCard>
                                <EditableCard id="upload-checklist" title="Upload Checklist">
                                    <ul className="space-y-2">
                                        {currentBriefState.uploadChecklist.map(item => (
                                            <li key={item.id} className="flex items-center">
                                                <input id={`upload-${item.id}`} type="checkbox" checked={item.completed} onChange={() => handleToggleChecklist('upload', item.id)} className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"/>
                                                <label htmlFor={`upload-${item.id}`} className={`ml-3 text-sm ${item.completed ? 'text-dark-text-secondary line-through' : 'text-dark-text'}`}>{item.text}</label>
                                            </li>
                                        ))}
                                    </ul>
                                </EditableCard>
                            </div>
                        )}
                        {activeTab === 'promote' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="lg:col-span-2">
                                    <EditableCard id="promote-posts" title="Social Media Posts">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-semibold text-white">Twitter / X</h4>
                                                        <ActionButton onClick={() => handleCopy(currentBriefState.socialPosts.twitter, 'social-twitter')} title="Copy Twitter Post">
                                                            {copiedItem === 'social-twitter' ? <span className="text-xs text-green-400">Copied!</span> : <ClipboardIcon className="w-5 h-5"/>}
                                                        </ActionButton>
                                                    </div>
                                                    <textarea value={currentBriefState.socialPosts.twitter} onChange={e => updateCurrentBriefState(p => ({ ...p, socialPosts: { ...p.socialPosts, twitter: e.target.value }}))} rows={5} className="w-full bg-dark-bg border border-dark-border rounded-md p-2 text-sm" />
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-semibold text-white">LinkedIn</h4>
                                                         <ActionButton onClick={() => handleCopy(currentBriefState.socialPosts.linkedin, 'social-linkedin')} title="Copy LinkedIn Post">
                                                            {copiedItem === 'social-linkedin' ? <span className="text-xs text-green-400">Copied!</span> : <ClipboardIcon className="w-5 h-5"/>}
                                                        </ActionButton>
                                                    </div>
                                                    <textarea value={currentBriefState.socialPosts.linkedin} onChange={e => updateCurrentBriefState(p => ({ ...p, socialPosts: { ...p.socialPosts, linkedin: e.target.value }}))} rows={5} className="w-full bg-dark-bg border border-dark-border rounded-md p-2 text-sm" />
                                                </div>
                                                 <div>
                                                     <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-semibold text-white">Instagram Post</h4>
                                                        <ActionButton onClick={() => handleCopy(currentBriefState.socialPosts.instagram, 'social-instagram')} title="Copy Instagram Post">
                                                            {copiedItem === 'social-instagram' ? <span className="text-xs text-green-400">Copied!</span> : <ClipboardIcon className="w-5 h-5"/>}
                                                        </ActionButton>
                                                    </div>
                                                    <textarea value={currentBriefState.socialPosts.instagram} onChange={e => updateCurrentBriefState(p => ({ ...p, socialPosts: { ...p.socialPosts, instagram: e.target.value }}))} rows={5} className="w-full bg-dark-bg border border-dark-border rounded-md p-2 text-sm" />
                                                </div>
                                                <div>
                                                     <div className="flex justify-between items-center mb-2">
                                                        <h4 className="font-semibold text-white">TikTok Video Idea</h4>
                                                        <ActionButton onClick={() => handleCopy(currentBriefState.socialPosts.tiktok, 'social-tiktok')} title="Copy TikTok Idea">
                                                            {copiedItem === 'social-tiktok' ? <span className="text-xs text-green-400">Copied!</span> : <ClipboardIcon className="w-5 h-5"/>}
                                                        </ActionButton>
                                                    </div>
                                                    <textarea value={currentBriefState.socialPosts.tiktok} onChange={e => updateCurrentBriefState(p => ({ ...p, socialPosts: { ...p.socialPosts, tiktok: e.target.value }}))} rows={5} className="w-full bg-dark-bg border border-dark-border rounded-md p-2 text-sm" />
                                                </div>
                                            </div>
                                            <button onClick={handleGeneratePosts} disabled={currentBriefState?.isGeneratingPosts} className="w-full bg-brand-purple/20 text-brand-purple-light font-semibold py-2 px-4 rounded-lg hover:bg-brand-purple/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                                <SparklesIcon className="w-4 h-4"/> {currentBriefState?.isGeneratingPosts ? 'Generating...' : 'Generate Posts with AI'}
                                            </button>
                                        </div>
                                    </EditableCard>
                                </div>
                                <EditableCard id="promote-checklist" title="Promotion Checklist">
                                    <ul className="space-y-2">
                                        {currentBriefState.promoteChecklist.map(item => (
                                            <li key={item.id} className="flex items-center">
                                                <input id={`promote-${item.id}`} type="checkbox" checked={item.completed} onChange={() => handleToggleChecklist('promote', item.id)} className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"/>
                                                <label htmlFor={`promote-${item.id}`} className={`ml-3 text-sm ${item.completed ? 'text-dark-text-secondary line-through' : 'text-dark-text'}`}>{item.text}</label>
                                            </li>
                                        ))}
                                    </ul>
                                </EditableCard>
                            </div>
                        )}
                    </div>
                 );
        }
    }

    const isGenerateDisabled = isLoading || !topic.trim() || !!validationError;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Video Workflow Assistant</h1>
                    <p className="text-lg text-dark-text-secondary">From idea to promotion, a complete workspace for your next video.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-2 text-dark-text-secondary hover:text-white" title="Reset Progress">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {!isMultiMode ? (
                <div className="bg-dark-card p-6 rounded-lg border border-dark-border space-y-4">
                     <div className="relative w-full">
                        <textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter a video topic, e.g., 'how to bake sourdough bread' or 'how to optimize Shopify product images'" className="w-full bg-dark-bg border border-dark-border rounded-md px-4 py-3 text-base text-white placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none pr-28" rows={2} disabled={isLoading} />
                         <div className="absolute top-3 right-3 flex items-center gap-2">
                            <button onClick={handleSuggestTopic} title="Generate or refine topic with AI" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50 transition-colors bg-dark-bg rounded-md">
                                <SparklesIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                     {validationError && <p className="text-yellow-400 text-xs mt-1">{validationError}</p>}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-dark-text-secondary font-semibold">Video Duration:</span>
                            {(['Under 5 min', '5-10 min', '10-20 min', 'custom'] as DurationPreset[]).map(p => (
                                 <button key={p} onClick={() => setDurationPreset(p)} className={`px-3 py-1 rounded-full ${durationPreset === p ? 'bg-brand-purple text-white' : 'bg-dark-bg hover:bg-dark-border'}`}>
                                    {p === 'custom' ? 'Custom' : p}
                                </button>
                            ))}
                            {durationPreset === 'custom' && (
                                <div className="flex items-center gap-2 bg-dark-bg rounded-full px-3 py-1">
                                    <input type="number" value={customDuration} onChange={e => setCustomDuration(parseInt(e.target.value, 10))} className="w-16 bg-transparent focus:outline-none text-center" />
                                    <span>min</span>
                                </div>
                            )}
                        </div>
                         <div className="flex items-center gap-4">
                            <button 
                                onClick={handleGenerateSingleBrief} 
                                disabled={isGenerateDisabled}
                                className="bg-brand-purple text-white font-bold py-3 px-6 sm:px-8 rounded-lg hover:bg-brand-purple-light transition-transform transform hover:scale-105 duration-200 disabled:bg-gray-500 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <LightbulbIcon className="h-5 w-5"/> {isLoading ? 'Generating...' : 'Generate Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-dark-card p-2 rounded-lg border border-dark-border">
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {briefStates.map((state, index) => (
                            <button
                                key={state.id}
                                onClick={() => setActiveBriefIndex(index)}
                                className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${activeBriefIndex === index ? 'bg-brand-purple text-white' : 'text-dark-text-secondary hover:bg-dark-border hover:text-white'}`}
                            >
                                {state.seedData.title || state.seedData.topic || `Video ${index + 1}`}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex justify-end">
                <div className="flex items-center gap-2 text-xs font-semibold">
                    {saveStatus === 'unsaved' && <><div className="w-2 h-2 rounded-full bg-yellow-400"></div><span className="text-yellow-400">Unsaved changes</span></>}
                    {saveStatus === 'saving' && <><div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div><span className="text-blue-400">Saving...</span></>}
                    {saveStatus === 'saved' && <><div className="w-2 h-2 rounded-full bg-green-400"></div><span className="text-green-400">All changes saved</span></>}
                </div>
            </div>
             <p className="text-sm text-dark-text-secondary italic text-center">
                💡 Tip: All AI-generated content in the tabs below is fully editable. Click on any text to make your own changes.
             </p>
            {error && !validationError && <p className="text-red-400 mt-3 text-sm">{error}</p>}

            {isMultiMode && (
                <div id="brief-content">
                    {renderBriefContent()}
                </div>
            )}
        </div>
    );
};

export default VideoBriefGenerator;
