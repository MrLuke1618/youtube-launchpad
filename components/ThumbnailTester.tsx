import React, { useState, useEffect, useRef } from 'react';
import { analyzeThumbnailTitlePair, suggestRefinedTopic, generateThumbnailImage, regenerateSingleTitle, suggestTextRefinement, validateInput } from '../services/geminiService';
import { ThumbnailAnalysisResult } from '../types';
import BeakerIcon from './icons/BeakerIcon';
import UploadIcon from './icons/UploadIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import TrashIcon from './icons/TrashIcon';
import DownloadIcon from './icons/DownloadIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import SparklesIcon from './icons/SparklesIcon';
import jsPDF from 'jspdf';
import LightbulbIcon from './icons/LightbulbIcon';
import XIcon from './icons/XIcon';

declare const html2canvas: any;

type SaveStatus = 'unsaved' | 'saving' | 'saved';
const LOCAL_STORAGE_KEY = 'yt-launchpad-thumbnail-tester-state';

// Utility to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

interface ImageDataState {
    data: string; // base64
    mimeType: string;
}

interface ThumbnailTesterProps {
    initialData?: { topic: string, titleA: string, titleB: string } | null;
    onManageApiKey: () => void;
}

const MIN_TOPIC_LENGTH = 5;

export const ThumbnailTester: React.FC<ThumbnailTesterProps> = ({ initialData, onManageApiKey }) => {
    const [topic, setTopic] = useState('');
    const [titleA, setTitleA] = useState('');
    const [titleB, setTitleB] = useState('');
    const [imageA, setImageA] = useState<ImageDataState | null>(null);
    const [imageB, setImageB] = useState<ImageDataState | null>(null);
    const [previewA, setPreviewA] = useState<string | null>(null);
    const [previewB, setPreviewB] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<ThumbnailAnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [isExporting, setIsExporting] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);
    const fileInputRefA = useRef<HTMLInputElement>(null);
    const fileInputRefB = useRef<HTMLInputElement>(null);

    // AI-specific loading states
    const [isGeneratingImageA, setIsGeneratingImageA] = useState(false);
    const [isGeneratingImageB, setIsGeneratingImageB] = useState(false);
    const [isSuggestingTopic, setIsSuggestingTopic] = useState(false);
    const [isSuggestingTitleA, setIsSuggestingTitleA] = useState(false);
    const [isSuggestingTitleB, setIsSuggestingTitleB] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: string]: boolean }>({});
    const [promptA, setPromptA] = useState<string | null>(null);
    const [promptB, setPromptB] = useState<string | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewModalData, setPreviewModalData] = useState<{ src: string; prompt: string | null; filename: string } | null>(null);
    const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);


    // Load state from localStorage on mount
    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                setTopic(savedState.topic || '');
                setTitleA(savedState.titleA || '');
                setTitleB(savedState.titleB || '');
                setAnalysis(savedState.analysis || null);
                setPromptA(savedState.promptA || null);
                setPromptB(savedState.promptB || null);
                if (savedState.imageA) {
                    setImageA(savedState.imageA);
                    setPreviewA(`data:${savedState.imageA.mimeType};base64,${savedState.imageA.data}`);
                }
                if (savedState.imageB) {
                    setImageB(savedState.imageB);
                    setPreviewB(`data:${savedState.imageB.mimeType};base64,${savedState.imageB.data}`);
                }
            } catch (e) {
                console.error("Failed to parse thumbnail tester state from localStorage", e);
            }
        }
    }, []);
    
    // Handle incoming data
    useEffect(() => {
        if (initialData) {
            setTopic(initialData.topic || '');
            setTitleA(initialData.titleA || '');
            setTitleB(initialData.titleB || '');
            // Clear previous images and analysis when new data is injected
            setImageA(null);
            setPreviewA(null);
            setImageB(null);
            setPreviewB(null);
            setAnalysis(null);
            setPromptA(null);
            setPromptB(null);
        }
    }, [initialData]);

    // Auto-save state to localStorage with debounce
    useEffect(() => {
        setSaveStatus('unsaved');
        const handler = setTimeout(() => {
            setSaveStatus('saving');
            const stateToSave = {
                topic,
                titleA,
                titleB,
                imageA,
                imageB,
                analysis,
                promptA,
                promptB,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
            setTimeout(() => setSaveStatus('saved'), 500);
        }, 1500);

        return () => {
            clearTimeout(handler);
        };
    }, [topic, titleA, titleB, imageA, imageB, analysis, promptA, promptB]);
    
    // Real-time input validation
    useEffect(() => {
        const { message } = validateInput(topic, MIN_TOPIC_LENGTH, 'topic');
        setValidationError(message);
    }, [topic]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: 'A' | 'B') => {
        const file = e.target.files?.[0];
        if (file) {
            const base64Data = await fileToBase64(file);
            const imageData = { data: base64Data, mimeType: file.type };
            if (setter === 'A') {
                setImageA(imageData);
                setPreviewA(URL.createObjectURL(file));
                setPromptA(null); // Clear AI prompt on manual upload
            } else {
                setImageB(imageData);
                setPreviewB(URL.createObjectURL(file));
                setPromptB(null); // Clear AI prompt on manual upload
            }
        }
    };

    const handleAnalyze = async () => {
        if (!topic || !titleA || !titleB || !imageA || !imageB) {
            setError('Please fill in all fields and upload or generate both thumbnails.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysis(null);

        try {
            const result = await analyzeThumbnailTitlePair(
                topic,
                titleA, { mimeType: imageA.mimeType, data: imageA.data },
                titleB, { mimeType: imageB.mimeType, data: imageB.data }
            );
            setAnalysis(result);
        } catch (e: any) {
            setError(e.message || 'Failed to analyze thumbnails.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestTopic = async () => {
        setIsSuggestingTopic(true);
        try {
            const result = await suggestRefinedTopic(topic);
            setTopic(result.topic);
        } catch (e) {
            console.error("Failed to suggest topic", e);
            setError("Failed to suggest a new topic.");
        } finally {
            setIsSuggestingTopic(false);
        }
    };
    
    const handleSuggestTitle = async (setter: 'A' | 'B') => {
        const currentTitle = setter === 'A' ? titleA : titleB;
        if (!topic) return;
        
        if (setter === 'A') setIsSuggestingTitleA(true);
        else setIsSuggestingTitleB(true);
    
        try {
            const result = await regenerateSingleTitle(topic, currentTitle);
            if (setter === 'A') setTitleA(result.title);
            else setTitleB(result.title);
        } catch (e) {
            console.error(`Failed to suggest title ${setter}`, e);
            setError(`Failed to suggest a new title for Combination ${setter}.`);
        } finally {
            if (setter === 'A') setIsSuggestingTitleA(false);
            else setIsSuggestingTitleB(false);
        }
    };
    
    const handleGenerateImage = async (setter: 'A' | 'B', isRetry: boolean = false) => {
        const { isValid, message } = validateInput(topic, MIN_TOPIC_LENGTH, 'topic');
        if (!isValid) {
            setError(message || "Please provide a valid video topic first.");
            return;
        }
        setError(null);
    
        let currentTitle = setter === 'A' ? titleA : titleB;
        const setTitle = setter === 'A' ? setTitleA : setTitleB;
        const setIsGenerating = setter === 'A' ? setIsGeneratingImageA : setIsGeneratingImageB;
        const setPreview = setter === 'A' ? setPreviewA : setPreviewB;
        const setImage = setter === 'A' ? setImageA : setImageB;
        const setPrompt = setter === 'A' ? setPromptA : setPromptB;
    
        setIsGenerating(true);
        if (!isRetry) {
            setPreview(null);
            setImage(null);
        }
        setPrompt(null);
    
        try {
            if (!currentTitle.trim()) {
                const titleResult = await regenerateSingleTitle(topic, '');
                currentTitle = titleResult.title;
                setTitle(currentTitle);
            }
    
            const imageData = await generateThumbnailImage(topic, currentTitle, isRetry);
            setImage({ data: imageData.data, mimeType: imageData.mimeType });
            setPreview(`data:${imageData.mimeType};base64,${imageData.data}`);
            setPrompt(imageData.prompt);
        } catch (e: any) {
            console.error(`Failed to generate assets for Combination ${setter}`, e);
            if (e.message === 'QUOTA_ERROR') {
                setError('API key is invalid or has exceeded its quota. Please add a valid key via the "Manage API Key" button.');
            } else {
                 setError(`An AI error occurred while generating the image for Combination ${setter}. Please try again.`);
            }
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleSuggestAnalysis = async (
        key: string,
        fieldName: string,
        currentValue: string,
        context: string,
        outputFormat: 'string' | 'list' = 'string'
    ) => {
        if (!analysis) return;
        setLoadingSuggestions(prev => ({...prev, [key]: true}));
        setError(null);
        try {
            const result = await suggestTextRefinement({ fieldName, currentValue, context, outputFormat });
            const parts = key.split('-'); // e.g., 'analysisA-strengths'
            
            if (parts[0] === 'winnerReasoning') {
                setAnalysis(prev => prev ? { ...prev, winnerReasoning: result.suggestion as string } : null);
            } else if (parts[0] === 'ctrContext') {
                 setAnalysis(prev => prev ? { ...prev, ctrContext: result.suggestion as string } : null);
            } else {
                const card = parts[0] as 'analysisA' | 'analysisB';
                const field = parts[1] as 'strengths' | 'weaknesses';
                setAnalysis(prev => prev ? { ...prev, [card]: { ...prev[card], [field]: result.suggestion as string[] } } : null);
            }
        } catch (e) {
             setError('Failed to get a suggestion.');
             console.error(e);
        } finally {
            setLoadingSuggestions(prev => ({...prev, [key]: false}));
        }
    };
    
    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear this test? All titles and images will be removed.")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setTopic('');
            setTitleA('');
            setTitleB('');
            setImageA(null);
            setImageB(null);
            setPreviewA(null);
            setPreviewB(null);
            setAnalysis(null);
            setError(null);
            setPromptA(null);
            setPromptB(null);
        }
    };

    const handleAnalysisChange = (field: keyof ThumbnailAnalysisResult, value: string) => {
        setAnalysis(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleSubAnalysisChange = (card: 'analysisA' | 'analysisB', field: 'strengths' | 'weaknesses', value: string) => {
        setAnalysis(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [card]: {
                    ...prev[card],
                    [field]: value.split('\n'),
                }
            };
        });
    };

    const generateReportText = (format: 'md' | 'txt'): string => {
        if (!analysis) return '';
        const nl = '\n';
        const h1 = format === 'md' ? '# ' : '';
        const h2 = format === 'md' ? '## ' : '';
        const h3 = format === 'md' ? '### ' : '';
        const bold = (text: string) => format === 'md' ? `**${text}**` : text;
        const listItem = (text: string) => format === 'md' ? `* ${text}` : `  - ${text}`;
    
        let report = `${h1}A/B Test Report: ${topic}${nl.repeat(2)}`;
        report += `${h2}Predicted Winner: ${analysis.predictedWinner === 'Tie' ? "It's a Tie!" : `Combination ${analysis.predictedWinner}`}${nl}`;
        report += `${bold('Reasoning:')} ${analysis.winnerReasoning}${nl.repeat(2)}`;

        if (analysis.ctrContext) {
            report += `${h2}The Power of CTR\n${analysis.ctrContext}${nl.repeat(2)}`;
        }

        const createAnalysisSection = (title: string, data: { strengths: string[], weaknesses: string[] }, originalTitle: string) => {
            let section = `${h2}${title}${nl}`;
            section += `${bold('Title:')} "${originalTitle}"${nl.repeat(2)}`;
            section += `${h3}Strengths${nl}${data.strengths.map(listItem).join(nl)}${nl.repeat(2)}`;
            section += `${h3}Weaknesses${nl}${data.weaknesses.map(listItem).join(nl)}${nl.repeat(2)}`;
            return section;
        };

        report += createAnalysisSection('Combination A Analysis', analysis.analysisA, titleA);
        report += createAnalysisSection('Combination B Analysis', analysis.analysisB, titleB);

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
        link.download = `AB-Test-Report-${topic.replace(/\s+/g, '-') || 'Untitled'}.${format}`;
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

            doc.save(`AB-Test-Report-${topic.replace(/\s+/g, '-') || 'Untitled'}.pdf`);
    
        } catch(e) {
            console.error("Failed to generate PDF:", e);
            setError("An error occurred while generating the PDF.");
        } finally {
            setIsExporting(false);
        }
    };
    
    const handleOpenPreview = (setter: 'A' | 'B') => {
        const src = setter === 'A' ? previewA : previewB;
        const prompt = setter === 'A' ? promptA : promptB;
        if (!src) return;

        setPreviewModalData({
            src,
            prompt,
            filename: `thumbnail-${setter}-${topic.replace(/\s+/g, '_')}.jpeg`
        });
        setIsPreviewModalOpen(true);
    };

    const handleCopyPrompt = (prompt: string, setter: 'A' | 'B') => {
        navigator.clipboard.writeText(prompt);
        setCopiedPrompt(setter);
        setTimeout(() => setCopiedPrompt(null), 2000);
    };
    
    const ImagePreviewModal: React.FC<{
        isOpen: boolean;
        onClose: () => void;
        data: { src: string; prompt: string | null; filename: string } | null;
    }> = ({ isOpen, onClose, data }) => {
        if (!isOpen || !data) return null;

        const handleDownload = () => {
            const link = document.createElement('a');
            link.href = data.src;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-dark-card rounded-lg border border-dark-border shadow-xl w-full max-w-4xl text-white transform transition-all flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-dark-border flex justify-between items-center">
                        <h3 className="text-lg font-bold">Image Preview</h3>
                        <button onClick={onClose} className="text-dark-text-secondary hover:text-white p-1"><XIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="p-6 overflow-auto text-center">
                        <img src={data.src} alt="Thumbnail preview" className="max-w-full max-h-[60vh] mx-auto rounded-lg" />
                    </div>
                    <div className="p-4 bg-dark-bg/50 rounded-b-lg flex justify-end gap-4">
                        <button onClick={onClose} className="bg-dark-border text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">Close</button>
                        <button onClick={handleDownload} className="bg-brand-purple text-white font-semibold px-6 py-2 rounded-md hover:bg-brand-purple-light transition-colors">Download JPEG</button>
                    </div>
                </div>
            </div>
        );
    };

    const AnalysisCard: React.FC<{
        title: string;
        analysis: { strengths: string[]; weaknesses: string[] } | undefined;
        isWinner: boolean;
        cardKey: 'analysisA' | 'analysisB';
    }> = ({ title, analysis, isWinner, cardKey }) => (
        <div className={`bg-dark-card p-4 rounded-lg border ${isWinner ? 'border-brand-purple' : 'border-dark-border'}`}>
             <h4 className={`text-lg font-bold mb-2 ${isWinner ? 'text-brand-purple-light' : 'text-white'}`}>{title}</h4>
             {analysis && (
                 <div className="space-y-3">
                     <div>
                         <div className="flex justify-between items-center">
                             <h5 className="font-semibold text-green-400 flex items-center gap-2 text-sm"><CheckCircleIcon /> Strengths</h5>
                             <button onClick={() => handleSuggestAnalysis(`${cardKey}-strengths`, `Strengths for combination ${cardKey.slice(-1)}`, analysis.strengths.join('\n'), `Video topic is ${topic}.`, 'list')} disabled={loadingSuggestions[`${cardKey}-strengths`]} title="Suggest strengths" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                         </div>
                         <textarea
                            value={analysis.strengths.join('\n')}
                            onChange={(e) => handleSubAnalysisChange(cardKey, 'strengths', e.target.value)}
                            className="w-full bg-transparent text-sm text-dark-text-secondary pl-2 mt-1 focus:outline-none focus:bg-dark-bg p-1 rounded-md"
                            rows={analysis.strengths.length + 1}
                         />
                     </div>
                     <div>
                         <div className="flex justify-between items-center">
                            <h5 className="font-semibold text-red-400 flex items-center gap-2 text-sm"><XCircleIcon /> Weaknesses</h5>
                            <button onClick={() => handleSuggestAnalysis(`${cardKey}-weaknesses`, `Weaknesses for combination ${cardKey.slice(-1)}`, analysis.weaknesses.join('\n'), `Video topic is ${topic}.`, 'list')} disabled={loadingSuggestions[`${cardKey}-weaknesses`]} title="Suggest weaknesses" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                         </div>
                         <textarea
                            value={analysis.weaknesses.join('\n')}
                            onChange={(e) => handleSubAnalysisChange(cardKey, 'weaknesses', e.target.value)}
                            className="w-full bg-transparent text-sm text-dark-text-secondary pl-2 mt-1 focus:outline-none focus:bg-dark-bg p-1 rounded-md"
                            rows={analysis.weaknesses.length + 1}
                         />
                     </div>
                 </div>
             )}
        </div>
    );
    
    const isAnalyzeButtonDisabled = isLoading || !!validationError || !titleA || !titleB || !imageA || !imageB;

    return (
        <div className="space-y-8 animate-fade-in">
            <ImagePreviewModal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} data={previewModalData} />
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">A/B Test Studio</h1>
                    <p className="text-lg text-dark-text-secondary">Simulate which title & thumbnail combination will earn the click.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-2 text-dark-text-secondary hover:text-white" title="Reset Progress">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    {analysis && (
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

            <div className="bg-dark-card p-6 rounded-lg border border-dark-border space-y-6">
                <div className="relative">
                    <label htmlFor="topic-input" className="block text-sm font-medium text-dark-text-secondary mb-1">Video Topic</label>
                    <textarea
                        id="topic-input"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., 'iPhone 15 review' or 'Shopify theme customization for beginners'"
                        className="w-full bg-dark-bg border border-dark-border rounded-md px-4 py-3 text-base text-white placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none pr-12"
                        rows={2}
                        disabled={isLoading}
                    />
                    <button 
                        onClick={handleSuggestTopic} 
                        disabled={isSuggestingTopic}
                        title="Generate or refine topic with AI" 
                        className="absolute top-9 right-3 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50 transition-colors p-1 bg-dark-bg rounded-md"
                    >
                        {isSuggestingTopic ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                    </button>
                </div>
                {validationError && <p className="text-yellow-400 text-xs mt-1">{validationError}</p>}

                <div className="bg-dark-bg p-3 rounded-lg border border-dark-border/50 flex items-center gap-3 text-xs text-dark-text-secondary">
                    <LightbulbIcon className="w-8 h-8 sm:w-5 sm:h-5 text-brand-purple-light flex-shrink-0" />
                    <span>
                        AI image generation is resource-intensive. To avoid public quota limits, we recommend <button onClick={onManageApiKey} className="font-semibold text-brand-purple-light hover:underline">adding your own API key</button>.
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(['A', 'B'] as const).map(setter => {
                        const title = setter === 'A' ? titleA : titleB;
                        const setTitle = setter === 'A' ? setTitleA : setTitleB;
                        const isSuggestingTitle = setter === 'A' ? isSuggestingTitleA : isSuggestingTitleB;
                        const preview = setter === 'A' ? previewA : previewB;
                        const image = setter === 'A' ? imageA : imageB;
                        const isGeneratingImage = setter === 'A' ? isGeneratingImageA : isGeneratingImageB;
                        const prompt = setter === 'A' ? promptA : promptB;
                        const fileInputRef = setter === 'A' ? fileInputRefA : fileInputRefB;

                        return (
                             <div key={setter} className="space-y-3">
                                <h3 className="text-lg font-bold text-white">Combination {setter}</h3>
                                <div className="relative">
                                    <label htmlFor={`title-${setter}`} className="block text-xs font-medium text-dark-text-secondary mb-1">Title {setter}</label>
                                    <input id={`title-${setter}`} type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-white pr-10"/>
                                    <button onClick={() => handleSuggestTitle(setter)} disabled={isSuggestingTitle} title="Suggest a title" className="absolute right-2 top-1/2 -translate-y-1/2 mt-2.5 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50">
                                        {isSuggestingTitle ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                    </button>
                                </div>
                                <div 
                                    className="w-full aspect-video bg-dark-bg rounded-lg border-2 border-dashed border-dark-border flex items-center justify-center relative hover:border-brand-purple transition-colors group"
                                >
                                    {isGeneratingImage ? (
                                        <div className="text-center text-dark-text-secondary">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto"></div>
                                            <p className="text-sm mt-2">Generating...</p>
                                        </div>
                                    ) : preview ? (
                                        <button onClick={() => handleOpenPreview(setter)} className="w-full h-full">
                                            <img src={preview} alt={`Thumbnail preview ${setter}`} className="object-cover w-full h-full rounded-md" />
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-white font-bold">Click to Preview</p>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="text-center text-dark-text-secondary p-4">
                                            <SparklesIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>Generate a