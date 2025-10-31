import React, { useState, useEffect, useRef } from 'react';
import { generateContentFunnelMap, suggestTextRefinement, validateInput } from '../services/geminiService';
import { ContentFunnelPlan, FunnelVideoIdea } from '../types';
import FunnelIcon from './icons/FunnelIcon';
import GlobeAltIcon from './icons/GlobeAltIcon';
import UsersIcon from './icons/UsersIcon';
import TargetIcon from './icons/TargetIcon';
import TrashIcon from './icons/TrashIcon';
import DownloadIcon from './icons/DownloadIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import jsPDF from 'jspdf';
import SparklesIcon from './icons/SparklesIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

declare const html2canvas: any;

type SaveStatus = 'unsaved' | 'saving' | 'saved';
const LOCAL_STORAGE_KEY = 'yt-launchpad-funnel-mapper-state';

interface ContentFunnelMapperProps {
    isWorkflowMode?: boolean;
    onWorkflowComplete?: (data: any) => void;
    initialData?: { topic: string };
}

const MIN_TOPIC_LENGTH = 5;

const ContentFunnelMapper: React.FC<ContentFunnelMapperProps> = ({ initialData }) => {
    const [topic, setTopic] = useState('');
    const [plan, setPlan] = useState<ContentFunnelPlan | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [isExporting, setIsExporting] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: string]: boolean }>({});
    const [currentStageIndex, setCurrentStageIndex] = useState(0);

    // Load state from localStorage on mount
    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                setTopic(savedState.topic || '');
                setPlan(savedState.plan || null);
            } catch (e) {
                console.error("Failed to parse funnel mapper state from localStorage", e);
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
                plan,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
            setTimeout(() => setSaveStatus('saved'), 500);
        }, 1500);

        return () => {
            clearTimeout(handler);
        };
    }, [topic, plan]);
    
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
    ) => {
        setLoadingSuggestions(prev => ({ ...prev, [key]: true }));
        setError(null);
        try {
            const result = await suggestTextRefinement({ fieldName, currentValue, context });
            
            const parts = key.split('-');
            if (parts[0] === 'topic') {
                setTopic(result.suggestion as string);
            } else if (plan) {
                const stage = parts[0] as keyof ContentFunnelPlan;
                const index = parseInt(parts[1], 10);
                const field = parts[2] as keyof FunnelVideoIdea;

                const newStageIdeas = [...plan[stage].ideas];
                (newStageIdeas[index] as any)[field] = result.suggestion;
                
                const newStage = {...plan[stage], ideas: newStageIdeas };
                setPlan({ ...plan, [stage]: newStage });
            }

        } catch (e) {
            setError('Failed to get a suggestion.');
            console.error(e);
        } finally {
            setLoadingSuggestions(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleGenerate = async () => {
        const { isValid, message } = validateInput(topic, MIN_TOPIC_LENGTH, 'topic');
        if (!isValid) {
            setError(message || 'Please enter a valid topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setPlan(null);
        try {
            const result = await generateContentFunnelMap(topic);
            setPlan(result);
            setCurrentStageIndex(0);
        } catch (e: any) {
            setError(e.message || 'Failed to generate funnel map.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePlanChange = (stage: keyof ContentFunnelPlan, index: number, field: keyof FunnelVideoIdea, value: string) => {
        setPlan(prevPlan => {
            if (!prevPlan) return null;
            const newStageIdeas = [...prevPlan[stage].ideas];
            newStageIdeas[index] = { ...newStageIdeas[index], [field]: value };
            const newStage = {...prevPlan[stage], ideas: newStageIdeas };
            return { ...prevPlan, [stage]: newStage };
        });
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear the current topic and funnel plan? This cannot be undone.")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setTopic('');
            setPlan(null);
            setError(null);
        }
    };

    const generateReportText = (format: 'md' | 'txt'): string => {
        if (!plan) return '';
        const nl = '\n';
        const h1 = format === 'md' ? '# ' : '';
        const h2 = format === 'md' ? '## ' : '';
        const h3 = format === 'md' ? '### ' : '';
        const italic = (text: string) => format === 'md' ? `*${text}*` : text;

        let report = `${h1}Content Funnel Map: ${topic}${nl.repeat(2)}`;
        
        const createStageSection = (title: string, stageData: { strategicGoal: string; ideas: FunnelVideoIdea[] }) => {
            let section = `${h2}${title}${nl}`;
            section += `${italic(stageData.strategicGoal)}${nl.repeat(2)}`;
            stageData.ideas.forEach(idea => {
                section += `${h3}${idea.title} (${idea.format})${nl}`;
                section += `${italic(idea.description)}${nl.repeat(2)}`;
            });
            return section;
        };

        report += createStageSection('Awareness', plan.awareness);
        report += createStageSection('Consideration', plan.consideration);
        report += createStageSection('Conversion', plan.conversion);

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
        link.download = `Content-Funnel-Map-${topic.replace(/\s+/g, '-') || 'Untitled'}.${format}`;
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
            const canvas = await html2canvas(content, {
                backgroundColor: '#131221',
                scale: 2,
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const imgProps = doc.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);

            const currentYear = new Date().getFullYear();
            const copyrightYear = currentYear > 2025 ? `2025-${currentYear}` : '2025';
            const copyrightText = `This document was generated using YT Launchpad. © ${copyrightYear} Developed by MrLuke1618. All rights reserved.`;

            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.setFont('helvetica', 'normal');
            
            doc.text(copyrightText, margin, pdfHeight - 10, { align: 'left' });
            doc.text(`Page 1 of 1`, pdfWidth - margin, pdfHeight - 10, { align: 'right' });
            
            doc.save(`Content-Funnel-Map-${topic.replace(/\s+/g, '-') || 'Untitled'}.pdf`);
    
        } catch(e) {
            console.error("Failed to generate PDF:", e);
            setError("An error occurred while generating the PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const stageKeys: (keyof ContentFunnelPlan)[] = ['awareness', 'consideration', 'conversion'];
    const stageDetails = {
        awareness: { icon: <GlobeAltIcon className="w-8 h-8 text-blue-400" />, title: "Awareness" },
        consideration: { icon: <UsersIcon className="w-8 h-8 text-yellow-400" />, title: "Consideration" },
        conversion: { icon: <TargetIcon className="w-8 h-8 text-green-400" />, title: "Conversion" }
    };

    const handlePrevStage = () => {
        setCurrentStageIndex(prev => (prev - 1 + stageKeys.length) % stageKeys.length);
    };

    const handleNextStage = () => {
        setCurrentStageIndex(prev => (prev + 1) % stageKeys.length);
    };

    const isGenerateDisabled = isLoading || !topic.trim() || !!validationError;

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Content Funnel Mapper</h1>
                    <p className="text-lg text-dark-text-secondary">Plan videos for each stage of the marketing funnel.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-2 text-dark-text-secondary hover:text-white" title="Reset Progress">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    {plan && (
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

            <div className="bg-dark-card p-6 rounded-lg border border-dark-border space-y-4">
                <div className="relative">
                     <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Enter your core channel topic, e.g., 'vintage camera reviews' or 'Shopify theme customization'"
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
                            onClick={() => handleSuggest('topic', 'Content Funnel Topic', topic, 'A high-level topic for mapping content to a marketing funnel.')} 
                            disabled={loadingSuggestions['topic']}
                            title="Generate or refine topic" 
                            className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50 transition-colors bg-dark-bg rounded-md"
                        >
                            {loadingSuggestions['topic'] ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                        </button>
                    </div>
                </div>
                {validationError && <p className="text-yellow-400 text-xs mt-1">{validationError}</p>}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                     <div className="flex items-center gap-2 text-xs font-semibold">
                        {saveStatus === 'unsaved' && <><div className="w-2 h-2 rounded-full bg-yellow-400"></div><span className="text-yellow-400">Unsaved changes</span></>}
                        {saveStatus === 'saving' && <><div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div><span className="text-blue-400">Saving...</span></>}
                        {saveStatus === 'saved' && <><div className="w-2 h-2 rounded-full bg-green-400"></div><span className="text-green-400">All changes saved</span></>}
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerateDisabled}
                        className="w-full sm:w-auto bg-brand-purple text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-purple-light transition-colors duration-200 disabled:bg-gray-500 flex items-center justify-center gap-2"
                    >
                        <FunnelIcon className="w-5 h-5" /> {isLoading ? 'Generating...' : 'Generate Map'}
                    </button>
                </div>
                <p className="text-sm text-dark-text-secondary italic text-center pt-4 border-t border-dark-border/50">
                    💡 Tip: All AI-generated content is fully editable. Click on any text to make your own changes.
                </p>
                {error && !validationError && <p className="text-red-400 mt-2 text-sm text-center">{error}</p>}
            </div>

            {isLoading && (
                 <div className="text-center py-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto"></div><p className="mt-4 text-dark-text-secondary">Mapping content to your funnel...</p></div>
            )}
            
            {plan && (
                <div ref={reportContentRef} className="space-y-6">
                    <div className="relative max-w-3xl mx-auto">
                        {stageKeys.length > 1 && (
                            <>
                                <button onClick={handlePrevStage} className="absolute top-1/2 -left-4 md:-left-12 transform -translate-y-1/2 z-10 p-2 rounded-full bg-dark-card border border-dark-border hover:bg-dark-border text-dark-text-secondary hover:text-white transition-colors">
                                    <ArrowLeftIcon className="w-6 h-6" />
                                </button>
                                <button onClick={handleNextStage} className="absolute top-1/2 -right-4 md:-right-12 transform -translate-y-1/2 z-10 p-2 rounded-full bg-dark-card border border-dark-border hover:bg-dark-border text-dark-text-secondary hover:text-white transition-colors">
                                    <ArrowRightIcon className="w-6 h-6" />
                                </button>
                            </>
                        )}
                        <div className="overflow-hidden">
                             <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentStageIndex * 100}%)` }}>
                                {stageKeys.map(stage => (
                                    <div key={stage} className="w-full flex-shrink-0 px-1">
                                         <div className="bg-dark-card p-6 rounded-lg border border-dark-border flex flex-col min-h-[400px]">
                                            <div className="flex items-center gap-4 mb-3">
                                                {stageDetails[stage].icon}
                                                <h2 className="text-3xl font-bold">{stageDetails[stage].title}</h2>
                                            </div>
                                            <p className="text-sm text-dark-text-secondary italic mb-6">{plan[stage].strategicGoal}</p>
                                            
                                            <div className="space-y-4">
                                                {(plan[stage].ideas || []).map((idea, index) => (
                                                    <div key={index} className="bg-dark-bg p-4 rounded-lg border border-dark-border/50">
                                                        <div className="relative">
                                                            <input type="text" value={idea.title} onChange={e => handlePlanChange(stage, index, 'title', e.target.value)} className="font-semibold bg-transparent w-full focus:outline-none pr-28" />
                                                            <div className="absolute top-1/2 right-1 -translate-y-1/2 flex items-center gap-2">
                                                                {loadingSuggestions[`${String(stage)}-${index}-title`] && <div className="bg-dark-card border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                                                <button onClick={() => handleSuggest(`${String(stage)}-${index}-title`, 'Video Title', idea.title, `For the ${String(stage)} stage of a content funnel.`)} disabled={loadingSuggestions[`${String(stage)}-${index}-title`]} title="Suggest title" className="text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                                            </div>
                                                        </div>
                                                         <div className="relative">
                                                            <textarea value={idea.description} onChange={e => handlePlanChange(stage, index, 'description', e.target.value)} className="text-xs text-dark-text-secondary w-full bg-transparent mt-1 focus:outline-none pr-28" rows={2}/>
                                                            <div className="absolute top-0 right-1 flex items-center gap-2">
                                                                {loadingSuggestions[`${String(stage)}-${index}-description`] && <div className="bg-dark-card border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                                                <button onClick={() => handleSuggest(`${String(stage)}-${index}-description`, 'Video Description', idea.description, `For a video titled '${idea.title}'.`)} disabled={loadingSuggestions[`${String(stage)}-${index}-description`]} title="Suggest description" className="text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                                            </div>
                                                        </div>
                                                        <div className="relative mt-2">
                                                            <input type="text" value={idea.format} onChange={e => handlePlanChange(stage, index, 'format', e.target.value)} className="text-xs font-semibold bg-dark-border px-2 py-1 rounded-full w-auto focus:outline-none" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                     <div className="text-center text-sm text-dark-text-secondary font-mono mt-4">
                        {currentStageIndex + 1} / {stageKeys.length}
                    </div>
                </div>
            )}
        </div>
    );
};
export default ContentFunnelMapper;