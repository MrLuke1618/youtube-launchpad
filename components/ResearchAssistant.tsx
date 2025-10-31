import React, { useState, useEffect, useRef } from 'react';
import { performWebSearch, suggestTextRefinement, validateInput } from '../services/geminiService';
// FIX: Updated import path for `WebSearchResult` to `../types` to resolve circular dependency.
import { WebSearchResult } from '../types';
import GlobeAltIcon from './icons/GlobeAltIcon';
import LinkIcon from './icons/LinkIcon';
import TrashIcon from './icons/TrashIcon';
import DownloadIcon from './icons/DownloadIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import jsPDF from 'jspdf';
import SparklesIcon from './icons/SparklesIcon';
import LightbulbIcon from './icons/LightbulbIcon';

declare const html2canvas: any;

type SaveStatus = 'unsaved' | 'saving' | 'saved';
const LOCAL_STORAGE_KEY = 'yt-launchpad-research-assistant-state';

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');

    const renderLineWithFormatting = (line: string) => {
        // Split by **bold** markers, keeping the delimiters
        const parts = line.split(/(\*\*.*?\*\*)/g).filter(part => part);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold text-dark-text">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(<ul key={`ul-${elements.length}`} className="list-disc pl-6 space-y-1 text-dark-text-secondary">{listItems}</ul>);
            listItems = [];
        }
    };

    lines.forEach((line, index) => {
        if (line.startsWith('## ')) {
            flushList();
            elements.push(<h2 key={index} className="text-2xl font-bold text-brand-purple-light mt-6 mb-3">{renderLineWithFormatting(line.substring(3))}</h2>);
        } else if (line.startsWith('### ')) {
            flushList();
            elements.push(<h3 key={index} className="text-xl font-bold text-brand-purple-light mt-4 mb-2">{renderLineWithFormatting(line.substring(4))}</h3>);
        } else if (line.startsWith('* ') || line.startsWith('- ')) {
            listItems.push(<li key={index}>{renderLineWithFormatting(line.substring(2))}</li>);
        } else if (line.trim() === '') {
            flushList();
        } else {
            flushList();
            elements.push(<p key={index} className="text-dark-text-secondary leading-relaxed my-4">{renderLineWithFormatting(line)}</p>);
        }
    });

    flushList(); // Flush any remaining list items at the end.

    return <>{elements}</>;
};

interface ResearchAssistantProps {
    isWorkflowMode?: boolean;
    onWorkflowComplete?: (data: any) => void;
    initialData?: string;
}

const MIN_QUERY_LENGTH = 5;

const ResearchAssistant: React.FC<ResearchAssistantProps> = ({ initialData }) => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<WebSearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [isExporting, setIsExporting] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);
    const [isSuggesting, setIsSuggesting] = useState(false);

    // Load state from localStorage on mount
    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                setQuery(savedState.query || '');
                setResult(savedState.result || null);
            } catch (e) {
                console.error("Failed to parse research assistant state from localStorage", e);
            }
        } else if (initialData) {
            setQuery(initialData);
        }
    }, [initialData]);

    // Auto-save state to localStorage with debounce
    useEffect(() => {
        setSaveStatus('unsaved');
        const handler = setTimeout(() => {
            setSaveStatus('saving');
            const stateToSave = {
                query,
                result,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
            setTimeout(() => setSaveStatus('saved'), 500);
        }, 1500);

        return () => {
            clearTimeout(handler);
        };
    }, [query, result]);

    // Real-time input validation
    useEffect(() => {
        const { message } = validateInput(query, MIN_QUERY_LENGTH, 'query');
        setValidationError(message);
    }, [query]);


    const loadingSteps = [
        "Sending query to Google...",
        "Analyzing top search results...",
        "Synthesizing information...",
        "Compiling sourced answer...",
        "Formatting citations...",
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

    const handleSearch = async () => {
        const { isValid, message } = validateInput(query, MIN_QUERY_LENGTH, 'query');
        if (!isValid) {
            setError(message || 'Please enter a valid query.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const data = await performWebSearch(query);
            setResult(data);
        } catch (e: any) {
             if (e.message === 'QUOTA_ERROR') {
                setError('API key is invalid or has exceeded its quota. Please add a valid key via "Manage API Key" in the sidebar.');
            } else {
                setError(e.message || 'Failed to perform research.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestQuery = async () => {
        setIsSuggesting(true);
        setError(null);
        try {
            const result = await suggestTextRefinement({
                fieldName: 'Research Query',
                currentValue: query,
                context: 'A research query for Google Search to find up-to-date information for a YouTube video about Shopify or e-commerce.'
            });
            if (typeof result.suggestion === 'string') {
                setQuery(result.suggestion);
            }
        } catch (e) {
            setError('Failed to get a suggestion.');
            console.error(e);
        } finally {
            setIsSuggesting(false);
        }
    };
    
    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear the current query and results?")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setQuery('');
            setResult(null);
            setError(null);
        }
    };

    const generateReportText = (format: 'md' | 'txt'): string => {
        if (!result) return '';
        const nl = '\n';
        const h1 = format === 'md' ? '# ' : '';
        const h2 = format === 'md' ? '## ' : '';
        const link = (title: string, uri: string) => format === 'md' ? `[${title}](${uri})` : `${title} (${uri})`;

        let report = `${h1}Research Report: ${query}${nl.repeat(2)}`;
        report += `${h2}Summary${nl}${result.text}${nl.repeat(2)}`;

        if (result.sources && result.sources.length > 0) {
            report += `${h2}Sources${nl}`;
            result.sources.forEach(source => {
                report += `- ${link(source.title || 'Untitled Source', source.uri)}${nl}`;
            });
        }
        
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
        link.download = `Research-Report-${query.replace(/\s+/g, '-') || 'Untitled'}.${format}`;
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
                backgroundColor: '#111827',
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

            doc.save(`Research-Report-${query.replace(/\s+/g, '-') || 'Untitled'}.pdf`);
    
        } catch(e) {
            console.error("Failed to generate PDF:", e);
            setError("An error occurred while generating the PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const isSearchDisabled = isLoading || !query.trim() || !!validationError;

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Research Assistant</h1>
                    <p className="text-lg text-dark-text-secondary">Get up-to-date, sourced answers to your questions, powered by Google Search.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-2 text-dark-text-secondary hover:text-white" title="Reset">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    {result && (
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


            <div className="bg-dark-card p-6 rounded-lg border border-dark-border sticky top-0 z-10 backdrop-blur-sm bg-opacity-80 space-y-4">
                <div className="relative w-full">
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ask anything, e.g., 'latest trends in digital marketing' or 'how Shopify's new AI features work'"
                        className="w-full bg-dark-bg border border-dark-border rounded-md px-4 py-3 text-base text-white placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none pr-28"
                        rows={2}
                        disabled={isLoading}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); }}}
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                        {isSuggesting && (
                            <div className="bg-brand-purple rounded-md px-2 py-1 text-xs text-white animate-pulse">
                                Thinking...
                            </div>
                        )}
                        <button 
                            onClick={handleSuggestQuery} 
                            disabled={isSuggesting}
                            title="Generate or refine query with AI" 
                            className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50 transition-colors bg-dark-bg rounded-md"
                        >
                            {isSuggesting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
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
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSearch}
                            disabled={isSearchDisabled}
                            className="bg-brand-purple text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-purple-light transition-transform transform hover:scale-105 duration-200 disabled:bg-gray-500 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <GlobeAltIcon className="h-5 w-5"/> {isLoading ? 'Researching...' : 'Research'}
                        </button>
                    </div>
                </div>
                {error && !validationError && <p className="text-red-400 mt-1 text-sm">{error}</p>}
            </div>

            {isLoading && (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto"></div>
                    <p className="mt-4 text-dark-text-secondary">{loadingMessage}</p>
                </div>
            )}
            
            {!isLoading && !result && (
                 <div className="text-center py-20 text-dark-text-secondary border-2 border-dashed border-dark-border rounded-lg">
                    <GlobeAltIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-xl font-semibold text-dark-text">Ready to discover?</h3>
                    <p>Enter a query above to start your research.</p>
                </div>
            )}

            {result && (
                <div ref={reportContentRef} className="bg-dark-card p-6 rounded-lg border border-dark-border space-y-6">
                    <div className="bg-dark-bg p-4 rounded-lg border border-dark-border/50 flex items-start gap-3">
                         <LightbulbIcon className="w-6 h-6 text-brand-purple-light flex-shrink-0 mt-0.5" />
                         <div>
                            <h3 className="font-bold text-white mb-1">Strategic Insight</h3>
                            <p className="text-sm text-dark-text-secondary">Use these sourced facts and summaries to build credibility with your audience. Citing up-to-date information establishes your authority and fosters trust, which is key to growing a loyal viewership.</p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Research Summary</h2>
                        <MarkdownRenderer content={result.text} />
                    </div>

                    {result.sources && result.sources.length > 0 && (
                        <div className="border-t border-dark-border pt-6">
                            <h3 className="text-xl font-bold text-brand-purple-light mb-3">Sources</h3>
                            <ul className="space-y-2">
                                {result.sources.map((source, index) => (
                                    <li key={index}>
                                        <a 
                                            href={source.uri} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="flex items-start gap-3 p-3 bg-dark-bg rounded-md hover:bg-dark-border transition-colors group"
                                        >
                                            <LinkIcon className="w-5 h-5 text-dark-text-secondary flex-shrink-0 mt-1 group-hover:text-brand-purple-light" />
                                            <div>
                                                <p className="text-sm font-semibold text-white group-hover:underline">{source.title || 'Untitled Source'}</p>
                                            </div>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ResearchAssistant;