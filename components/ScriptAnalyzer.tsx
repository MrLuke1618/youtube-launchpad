import React, { useState, useMemo, useEffect, useRef } from 'react';
import { analyzeScriptForRetention, regenerateScriptSegment, suggestTextRefinement, validateInput } from '../services/geminiService';
import { RetentionAnalysis, RetentionIssue, VideoBrief } from '../types';
import ChartIcon from './icons/ChartIcon';
import UploadIcon from './icons/UploadIcon';
import DownloadIcon from './icons/DownloadIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import TrashIcon from './icons/TrashIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import SparklesIcon from './icons/SparklesIcon';
import QuestionMarkIcon from './icons/QuestionMarkIcon';
import XIcon from './icons/XIcon';

declare const mammoth: any;

type SaveStatus = 'unsaved' | 'saving' | 'saved';
const LOCAL_STORAGE_KEY = 'yt-launchpad-script-analyzer-state';

interface ScriptAnalyzerProps {
    initialData?: { script: string } | null;
}

const MIN_SCRIPT_LENGTH = 30;

const ScriptAnalyzer: React.FC<ScriptAnalyzerProps> = ({ initialData }) => {
    const [script, setScript] = useState('');
    const [analysis, setAnalysis] = useState<RetentionAnalysis[] | null>(null);
    const [analysisHistory, setAnalysisHistory] = useState<RetentionAnalysis[]>([]);
    const [isLoading, setIsLoading] = useState<{ analyze: boolean, [key: string]: boolean }>({ analyze: false });
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [regeneratingIssueId, setRegeneratingIssueId] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const reportContentRef = useRef<HTMLDivElement>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [urlInput, setUrlInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [showPublishInfo, setShowPublishInfo] = useState(false);
    const [activeAnalysisIndex, setActiveAnalysisIndex] = useState(0);
    const [previewingIssue, setPreviewingIssue] = useState<RetentionIssue | null>(null);

    const wordCount = useMemo(() => {
        if (!script) return 0;
        return script.trim().split(/\s+/).filter(Boolean).length;
    }, [script]);


     // Load state from localStorage on mount
    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                setScript(savedState.script || '');
                setAnalysis(savedState.analysis || null);
                setAnalysisHistory(savedState.analysisHistory || []);
            } catch (e) {
                console.error("Failed to parse script analyzer state from localStorage", e);
            }
        }
    }, []);
    
    // Handle incoming data
    useEffect(() => {
        if (initialData && initialData.script) {
            setScript(initialData.script);
            // Clear previous analysis when new data is injected
            setAnalysis(null);
            setAnalysisHistory([]);
        }
    }, [initialData]);

    // Auto-save state to localStorage with debounce
    useEffect(() => {
        setSaveStatus('unsaved');
        const handler = setTimeout(() => {
            setSaveStatus('saving');
            const stateToSave = {
                script,
                analysis,
                analysisHistory,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
            setTimeout(() => setSaveStatus('saved'), 500);
        }, 1500);

        return () => {
            clearTimeout(handler);
        };
    }, [script, analysis, analysisHistory]);

    // Real-time input validation
    useEffect(() => {
        const { message } = validateInput(script, MIN_SCRIPT_LENGTH, 'script');
        setValidationError(message);
    }, [script]);


    const scriptAnalysisLoadingSteps = [
        "Initializing retention model...",
        "Detecting number of scripts...",
        "Analyzing pacing and flow for each script...",
        "Identifying potential drop-off points...",
        "Checking for clarity and jargon...",
        "Formulating actionable suggestions...",
        "Calculating final retention scores...",
    ];

    useEffect(() => {
        let interval: number | undefined;
        if (isLoading.analyze) {
            let step = 0;
            setLoadingMessage(scriptAnalysisLoadingSteps[0]);
            interval = window.setInterval(() => {
                step = (step + 1) % scriptAnalysisLoadingSteps.length;
                setLoadingMessage(scriptAnalysisLoadingSteps[step]);
            }, 1500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading.analyze]);
    
    const handleImportFromUrl = async () => {
        if (!urlInput.trim()) {
            setError("Please enter a URL.");
            return;
        }

        // We must use 'Published to web' links due to browser security (CORS) restrictions that prevent fetching standard sharing links.
        if (!urlInput.includes('docs.google.com/document/d/e/')) {
            setError("Invalid URL format. Please use a 'Published to web' link. Click the info icon for instructions.");
            return;
        }

        setIsImporting(true);
        setError(null);
        try {
            const response = await fetch(urlInput);
            if (!response.ok) {
                throw new Error(`Failed to fetch the document. Status: ${response.status}`);
            }
            const html = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const contentEl = doc.getElementById('contents');
            let text = '';
            if (contentEl) {
                const paragraphs = Array.from(contentEl.getElementsByTagName('p'));
                text = paragraphs.map(p => p.innerText).join('\n\n');
            } else {
                // Fallback for different structures
                text = doc.body.innerText || '';
            }

            if(!text.trim()){
                 throw new Error('Could not find any text content in the published document.');
            }

            setScript(text.trim());
            setUrlInput(''); // clear input on success
        } catch (e: any) {
            setError("Could not import from the link. Please ensure it's a valid 'Published to web' Google Doc link and the document has content.");
            console.error(e);
        } finally {
            setIsImporting(false);
        }
    };

    const handleSuggest = async (issueId: string, field: 'reasoning' | 'suggestion', currentValue: string, context: string) => {
        const key = `${issueId}-${field}`;
        setIsLoading(prev => ({...prev, [key]: true}));
        try {
            const { suggestion } = await suggestTextRefinement({
                fieldName: `Script Analysis ${field}`,
                currentValue,
                context,
            });
            handleIssueChange(issueId, field, suggestion as string);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(prev => ({...prev, [key]: false}));
        }
    };

    const handleReAnalyze = async (updatedScript: string) => {
        setIsLoading(prev => ({ ...prev, analyze: true }));
        setError(null);
        setAnalysis(null); // Clear old analysis to show loading state

        try {
            const result = await analyzeScriptForRetention(updatedScript);
            // Prepend the new analysis result to history
            setAnalysisHistory(prev => [...prev, ...result]);
            setAnalysis(result);
            setActiveAnalysisIndex(0);
        } catch (e: any) {
            setError(e.message || 'Failed to re-analyze script.');
            // Restore previous state on error? For now, we'll just show the error.
        } finally {
            setIsLoading(prev => ({ ...prev, analyze: false }));
        }
    };

    const handleAnalyzeScript = async () => {
        const { isValid, message } = validateInput(script, MIN_SCRIPT_LENGTH, 'script');
        if (!isValid) {
            setError(message || 'Please enter a valid script to analyze.');
            return;
        }
        // When starting a new analysis from the main button, clear history
        setAnalysisHistory([]);
        await handleReAnalyze(script);
    };
    
    const handleAnalysisChange = (field: keyof RetentionAnalysis, value: string | number) => {
        setAnalysis(prev => {
            if (!prev) return null;
            const newAnalysisArray = [...prev];
            const targetAnalysis = { ...newAnalysisArray[activeAnalysisIndex], [field]: value };
            newAnalysisArray[activeAnalysisIndex] = targetAnalysis;
            return newAnalysisArray;
        });
    };

    const handleIssueChange = (id: string, field: 'reasoning' | 'suggestion' | 'riskLevel', value: string) => {
        setAnalysis(prev => {
            if (!prev) return null;
            const newAnalysisArray = [...prev];
            const targetAnalysis = { ...newAnalysisArray[activeAnalysisIndex] };
            targetAnalysis.issues = targetAnalysis.issues.map(i => i.id === id ? { ...i, [field]: value } : i);
            newAnalysisArray[activeAnalysisIndex] = targetAnalysis;
            return newAnalysisArray;
        });
    };
    
    const handleConfirmApply = (issue: RetentionIssue) => {
        const newScript = script.replace(issue.segmentText, issue.suggestion);
        setScript(newScript);
        setPreviewingIssue(null);
        handleReAnalyze(newScript);
    };

    const handleApplyAllSuggestions = () => {
        if (!currentAnalysis || currentAnalysis.issues.length === 0) return;

        let newScript = script;
        // Create a stable list of issues to iterate over, as the state might change
        const issuesToApply = [...currentAnalysis.issues];
        issuesToApply.forEach(issue => {
            // Ensure we only replace the first instance to avoid unintended consequences
            newScript = newScript.replace(issue.segmentText, issue.suggestion);
        });
        
        setScript(newScript);
        handleReAnalyze(newScript);
    };

    
    const handleRegenerateSuggestion = async (issue: RetentionIssue) => {
        setRegeneratingIssueId(issue.id);
        try {
            const result = await regenerateScriptSegment(issue.segmentText, issue.reasoning);
            if (result.options && result.options.length > 0) {
                // Just update the suggestion in the state, don't apply it
                handleIssueChange(issue.id, 'suggestion', result.options[0]);
            }
        } catch (e) {
            console.error("Failed to regenerate", e);
        } finally {
            setRegeneratingIssueId(null);
        }
    };

    const generateReportText = (format: 'md' | 'txt'): string => {
        if (!analysis || analysis.length === 0) return '';
    
        const nl = '\n';
        const h1 = format === 'md' ? '# ' : '';
        const h2 = format === 'md' ? '## ' : '';
        const h3 = format === 'md' ? '### ' : '';
        const bold = (text: string) => format === 'md' ? `**${text}**` : text;
        const italic = (text: string) => format === 'md' ? `*${text}*` : text;
        const blockquote = (text: string) => format === 'md' ? `> ${text}` : `  "${text}"`;
    
        let report = `${h1}Script Retention Analysis Report${nl.repeat(2)}`;
    
        analysis.forEach((singleAnalysis, index) => {
            report += `${h2}Analysis for: ${singleAnalysis.title || `Script ${index + 1}`}${nl.repeat(2)}`;
            report += `${h3}Overall Score: ${singleAnalysis.overallScore} / 100${nl}`;
            report += `${italic(singleAnalysis.scoreContext)}${nl.repeat(2)}`;
            if(singleAnalysis.overallFeedback) {
                 report += `${h3}Overall Feedback${nl}${singleAnalysis.overallFeedback}${nl.repeat(2)}`;
            }
            report += `${h3}Actionable Suggestions (${singleAnalysis.issues.length})${nl.repeat(2)}`;
    
            singleAnalysis.issues.forEach(issue => {
                report += `**Risk Level: ${issue.riskLevel}**${nl}`;
                report += `${bold("Problematic Segment:")}${nl}${blockquote(issue.segmentText)}${nl.repeat(2)}`;
                report += `${bold("Reasoning:")} ${issue.reasoning}${nl.repeat(2)}`;
                report += `${bold("Suggestion:")} ${issue.suggestion}${nl.repeat(2)}`;
                report += `---${nl.repeat(2)}`;
            });
        });
    
        report += `${nl}${h2}Final Script Text${nl.repeat(2)}${script}`;

        const currentYear = new Date().getFullYear();
        const copyrightYear = currentYear > 2025 ? `2025-${currentYear}` : '2025';
        const copyrightText = `This document was generated using YT Launchpad. © ${copyrightYear} Developed by MrLuke1618. All rights reserved.`;
        report += `\n\n---\n${copyrightText}`;

        return report;
    };


    const handleExport = (format: 'md' | 'txt') => {
        const reportText = generateReportText(format);
        const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
        const blob = new Blob([reportText], { type: `${mimeType};charset=utf-8;` });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Script-Retention-Analysis.${format}`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const readFile = (file: File) => {
        setError(null);
        const reader = new FileReader();
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            reader.onload = async (event) => {
                const arrayBuffer = event.target?.result;
                if (arrayBuffer) {
                    try {
                        const result = await mammoth.extractRawText({ arrayBuffer });
                        setScript(result.value);
                    } catch (err) {
                        setError('Failed to read .docx file.');
                        console.error(err);
                    }
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
            reader.onload = (event) => setScript(event.target?.result as string);
            reader.readAsText(file);
        } else {
            setError('Unsupported file type. Please upload TXT, MD, or DOCX.');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) readFile(e.target.files[0]);
    };

    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
    };
    
    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear the script and all analysis data? This cannot be undone.")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setScript('');
            setAnalysis(null);
            setAnalysisHistory([]);
            setError(null);
        }
    };

    const riskBorderClass = (riskLevel: RetentionIssue['riskLevel']) => {
        switch (riskLevel) {
            case 'High': return 'border-l-4 border-red-500';
            case 'Medium': return 'border-l-4 border-yellow-500';
            case 'Low': return 'border-l-4 border-blue-500';
            default: return 'border-l-4 border-gray-500';
        }
    };
    
    const scoreDifference = useMemo(() => {
        if (analysisHistory.length < 2) return null;
        // Compare the first analysis of the current run with the first of the previous.
        const lastScore = analysisHistory[analysisHistory.length - 2]?.overallScore;
        const currentScore = analysisHistory[analysisHistory.length - 1]?.overallScore;
        if (lastScore === undefined || currentScore === undefined) return null;
        return currentScore - lastScore;
    }, [analysisHistory]);

    const currentAnalysis = analysis ? analysis[activeAnalysisIndex] : null;

    const renderHighlightedScript = () => {
        if (analysisHistory.length < 2) return null;
    
        const lastCompletedAnalysis = analysisHistory[analysisHistory.length - 2];
        if (!lastCompletedAnalysis || !lastCompletedAnalysis.issues) {
            return <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-dark-text">{script}</pre>;
        }
        
        const suggestions = lastCompletedAnalysis.issues.map(i => i.suggestion);
        const uniqueSuggestions = [...new Set(suggestions.filter(s => s && s.trim() !== ''))];
    
        if (uniqueSuggestions.length === 0) {
            return <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-dark-text">{script}</pre>;
        }
    
        const escapeRegex = (str: string) => {
            return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        };
    
        const regex = new RegExp(`(${uniqueSuggestions.map(escapeRegex).join('|')})`, 'g');
        const parts = script.split(regex);
    
        return (
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-dark-text">
                {parts.map((part, index) =>
                    uniqueSuggestions.includes(part) ? (
                        <span key={index} className="bg-green-900/30 text-green-300 rounded px-1">{part}</span>
                    ) : (
                        <span key={index}>{part}</span>
                    )
                )}
            </pre>
        );
    };

    const ScriptPreviewModal = () => {
        if (!previewingIssue) return null;

        const highlightRef = useRef<HTMLElement>(null);

        useEffect(() => {
            // Using a timeout to ensure the element is in the DOM and painted for smooth scrolling
            setTimeout(() => {
                if (highlightRef.current) {
                    highlightRef.current.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }
            }, 100);
        }, []); // Run only once when modal mounts

        const previewScript = script.replace(
            previewingIssue.segmentText,
            `~~~HIGHLIGHT~~~${previewingIssue.suggestion}~~~ENDHIGHLIGHT~~~`
        );
        const lines = previewScript.split('\n');
        
        const highlightLineIndex = lines.findIndex(line => line.includes('~~~HIGHLIGHT~~~'));

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setPreviewingIssue(null)}>
                <div className="bg-dark-card rounded-lg border border-dark-border shadow-xl w-full max-w-4xl text-white transform transition-all flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-dark-border flex justify-between items-center">
                        <h3 className="text-lg font-bold">Preview Suggestion</h3>
                        <button onClick={() => setPreviewingIssue(null)} className="text-dark-text-secondary hover:text-white p-1">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto text-sm leading-relaxed">
                        {lines.map((line, index) => {
                            const parts = line.split(/~~~(?:HIGHLIGHT|ENDHIGHLIGHT)~~~/);
                            const timestampRegex = /^\s*(\(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\))/;
                            const isHeading = timestampRegex.test(line);
                            
                            const content = parts.map((part, partIndex) =>
                                partIndex % 2 === 1 ? (
                                    <mark
                                        key={partIndex}
                                        ref={index === highlightLineIndex ? highlightRef : null}
                                        className="bg-brand-purple/30 text-white rounded px-1 py-0.5"
                                    >
                                        {part}
                                    </mark>
                                ) : (
                                    <span key={partIndex}>{part}</span>
                                )
                            );

                            if (line.trim() === '') {
                                return <div key={index} className="h-3" />;
                            }
                            
                            if (isHeading) {
                                return (
                                    <h4 key={index} className="text-base font-semibold text-brand-purple-light mt-4 mb-2">
                                        {content}
                                    </h4>
                                );
                            }

                            return (
                                <p key={index} className="mb-2 font-mono">
                                    {content}
                                </p>
                            );
                        })}
                    </div>
                    <div className="p-4 bg-dark-bg/50 rounded-b-lg flex justify-end gap-4">
                        <button onClick={() => setPreviewingIssue(null)} className="bg-dark-border text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">Cancel</button>
                        <button onClick={() => handleConfirmApply(previewingIssue)} className="bg-brand-purple text-white font-semibold px-6 py-2 rounded-md hover:bg-brand-purple-light transition-colors">Apply & Close</button>
                    </div>
                </div>
            </div>
        );
    };

    const isAnalyzeDisabled = isLoading.analyze || !script.trim() || !!validationError;

    return (
        <div className="space-y-8 animate-fade-in">
             <ScriptPreviewModal />
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Script Polishing Studio</h1>
                    <p className="text-lg text-dark-text-secondary">Refine your script with AI-powered suggestions to maximize audience retention.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-2 text-dark-text-secondary hover:text-white" title="Reset Progress">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    {analysis && (
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

            <div ref={reportContentRef}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div id="script-editor" className="space-y-4">
                         <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Your Video Script Editor</h2>
                            <div className="flex items-center gap-2 text-xs font-semibold">
                                {saveStatus === 'unsaved' && <><div className="w-2 h-2 rounded-full bg-yellow-400"></div><span className="text-yellow-400">Unsaved changes</span></>}
                                {saveStatus === 'saving' && <><div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div><span className="text-blue-400">Saving...</span></>}
                                {saveStatus === 'saved' && <><div className="w-2 h-2 rounded-full bg-green-400"></div><span className="text-green-400">All changes saved</span></>}
                            </div>
                         </div>

                        <label htmlFor="script-textarea" className="text-sm font-medium text-dark-text-secondary">Paste script here</label>
                        <textarea
                            id="script-textarea"
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                            placeholder="You can paste multiple versions, and the AI will analyze them separately."
                            className="w-full h-60 bg-dark-card border border-dark-border rounded-md p-4 text-white placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-purple resize-y font-mono text-sm leading-relaxed"
                            disabled={isLoading.analyze}
                        />
                        <div className="flex justify-between items-center -mt-2 pr-2">
                             {validationError && <p className="text-yellow-400 text-xs">{validationError}</p>}
                            <p className="text-right text-sm font-mono text-dark-text-secondary ml-auto">
                                Word Count: {wordCount}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <hr className="flex-grow border-dark-border"/>
                            <span className="text-sm font-semibold text-dark-text-secondary">OR UPLOAD A FILE</span>
                            <hr className="flex-grow border-dark-border"/>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div 
                                className={`relative bg-dark-card border-2 border-dashed rounded-md flex items-center justify-center p-6 transition-colors h-full ${isDragging ? 'border-brand-purple bg-dark-border' : 'border-dark-border'}`}
                                onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                            >
                                {isDragging ? (
                                    <div className="text-xl font-bold text-white z-20">Drop file to upload</div>
                                ) : (
                                    <div className="text-center text-dark-text-secondary space-y-2">
                                        <UploadIcon className="h-8 w-8 mx-auto" />
                                        <p className="font-semibold">Drag & drop a file</p>
                                        <p className="text-sm">or <button onClick={() => fileInputRef.current?.click()} className="text-brand-purple-light font-semibold hover:underline">browse</button></p>
                                        <p className="text-xs mt-1">Supported: TXT, MD, DOCX</p>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.md,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                                    </div>
                                )}
                            </div>
                            
                            <div className="bg-dark-card p-4 rounded-lg border border-dark-border/50 space-y-2 flex flex-col justify-center">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-white">Import from Google Docs</p>
                                    <button 
                                        onClick={() => setShowPublishInfo(!showPublishInfo)} 
                                        className="text-xs text-dark-text-secondary hover:text-white flex items-center gap-1"
                                    >
                                        Why this link? <QuestionMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                {showPublishInfo && (
                                    <div className="bg-dark-bg p-3 rounded-md border border-dark-border text-xs text-dark-text-secondary space-y-2 animate-fade-in">
                                        <p>Due to browser security policies (CORS), we can only import directly from a publicly published document.</p>
                                        <p className="font-semibold text-dark-text">How to get the link:</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>In Google Docs, go to <strong className="text-dark-text">File &gt; Share &gt; Publish to web</strong>.</li>
                                            <li>In the pop-up, click the <strong className="text-dark-text">Publish</strong> button.</li>
                                            <li>Copy the link provided in the 'Link' tab.</li>
                                        </ol>
                                    </div>
                                )}
                                <input 
                                    type="text" 
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    placeholder="Paste 'Published to web' doc link..."
                                    className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-white placeholder-dark-text-secondary"
                                    disabled={isImporting || isLoading.analyze}
                                />
                                <button 
                                    onClick={handleImportFromUrl}
                                    disabled={isImporting || isLoading.analyze || !urlInput.trim()}
                                    className="w-full bg-dark-border px-3 py-2 rounded-md text-sm font-semibold hover:bg-dark-border/70 disabled:opacity-50"
                                >
                                    {isImporting ? 'Importing...' : 'Import from Link'}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleAnalyzeScript}
                            disabled={isAnalyzeDisabled}
                            className="w-full bg-brand-purple text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-purple-light transition-transform transform hover:scale-105 duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {isLoading.analyze ? 'Analyzing...' : 'Analyze Script'}
                        </button>
                        <p className="text-sm text-dark-text-secondary italic text-center pt-2">
                            💡 Tip: The generated analysis is fully editable. Click any text to refine the suggestions.
                        </p>
                        {error && !validationError && <p className="text-red-400 mt-3 text-sm">{error}</p>}
                    </div>

                    <div id="suggestion-workbench" className="space-y-4">
                        <h2 className="text-xl font-bold text-white">Suggestion Workbench</h2>
                        <div className="bg-dark-card p-6 rounded-lg border border-dark-border h-[30rem] lg:h-[36rem] flex flex-col">
                            {isLoading.analyze && (
                                <div className="text-center m-auto">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto"></div>
                                    <p className="mt-4 text-dark-text-secondary">{loadingMessage}</p>
                                </div>
                            )}
                            
                            {!isLoading.analyze && !currentAnalysis && (
                                 <div className="text-center m-auto flex flex-col items-center justify-center">
                                    <ChartIcon className="h-24 w-24 text-dark-text-secondary opacity-20" />
                                    <p className="mt-4 text-base text-dark-text-secondary">Your suggestion workbench will appear here.</p>
                                </div>
                            )}

                            {analysis && analysis.length > 0 && currentAnalysis && (
                                <div className="space-y-4 h-full flex flex-col">
                                    {analysis.length > 1 && (
                                        <div className="border-b border-dark-border -mx-6 -mt-6 px-4">
                                            <div className="flex items-center gap-2 overflow-x-auto">
                                                {analysis.map((an, index) => (
                                                    <button 
                                                        key={index}
                                                        onClick={() => setActiveAnalysisIndex(index)}
                                                        className={`px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 ${activeAnalysisIndex === index ? 'border-brand-purple text-white' : 'border-transparent text-dark-text-secondary hover:text-white'}`}
                                                    >
                                                        {an.title || `Script ${index + 1}`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-start gap-4">
                                        <h3 className="font-bold text-brand-purple-light flex-shrink-0 mt-1">
                                            Overall Score:
                                        </h3>
                                        <input 
                                            type="number" 
                                            value={currentAnalysis.overallScore} 
                                            onChange={(e) => handleAnalysisChange('overallScore', parseInt(e.target.value))} 
                                            className="text-4xl font-bold text-brand-purple-light bg-transparent w-20 text-center"
                                        />
                                        <span className="font-bold text-brand-purple-light mt-1">/100</span>
                                        {scoreDifference !== null && (
                                            <span className={`ml-2 text-sm font-semibold ${scoreDifference > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {scoreDifference > 0 ? '▲' : '▼'} {Math.abs(scoreDifference)}
                                            </span>
                                        )}
                                    </div>
                                    <textarea 
                                        value={currentAnalysis.scoreContext}
                                        onChange={(e) => handleAnalysisChange('scoreContext', e.target.value)}
                                        className="w-full bg-transparent text-dark-text-secondary text-xs italic focus:outline-none p-1"
                                        rows={2}
                                    />

                                    {currentAnalysis.judgingCriteria && currentAnalysis.judgingCriteria.length > 0 && (
                                        <div className="text-xs bg-dark-bg p-2 rounded-md">
                                            <h4 className="font-semibold text-dark-text mb-1">How Your Script is Judged:</h4>
                                            <ul className="list-disc list-inside text-dark-text-secondary space-y-0.5">
                                                {currentAnalysis.judgingCriteria.map((criterion, i) => <li key={i}>{criterion}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    <div className="border-t border-dark-border pt-4 min-h-0 flex-1 flex flex-col">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-base font-bold text-brand-purple-light">Actionable Suggestions ({currentAnalysis.issues.length})</h3>
                                            {currentAnalysis.issues.length > 0 && (
                                                <button onClick={handleApplyAllSuggestions} className="text-xs bg-brand-purple text-white font-semibold py-1 px-3 rounded-md hover:bg-brand-purple-light transition-colors">Apply All</button>
                                            )}
                                        </div>
                                         {currentAnalysis.issues.length === 0 && <p className="text-sm text-green-400">No major retention risks found. Great job!</p>}
                                        <div className="space-y-3 overflow-y-auto pr-4 flex-1">
                                            {currentAnalysis.issues.map(issue => (
                                                <div key={issue.id} className={`bg-dark-bg p-3 rounded-md ${riskBorderClass(issue.riskLevel)}`}>
                                                    <p className="text-xs text-dark-text-secondary mb-1">"<span className="italic">{issue.segmentText}</span>"</p>
                                                     <div className="relative">
                                                        <textarea 
                                                            value={issue.reasoning}
                                                            onChange={(e) => handleIssueChange(issue.id, 'reasoning', e.target.value)}
                                                            className="w-full text-sm text-white font-semibold bg-transparent focus:outline-none p-1 pr-8"
                                                            rows={2}
                                                        />
                                                        <button onClick={() => handleSuggest(issue.id, 'reasoning', issue.reasoning, `Provide a better reason why this script segment has a retention risk: "${issue.segmentText}"`)} disabled={isLoading[`${issue.id}-reasoning`]} title="Refine reasoning" className="absolute top-1 right-2 text-dark-text-secondary hover:text-brand-purple-light"><SparklesIcon className="w-4 h-4" /></button>
                                                     </div>
                                                     <div className="relative">
                                                        <textarea 
                                                            value={issue.suggestion}
                                                            onChange={(e) => handleIssueChange(issue.id, 'suggestion', e.target.value)}
                                                            className="w-full text-sm text-dark-text-secondary bg-transparent focus:outline-none p-1 pr-8"
                                                            rows={3}
                                                        />
                                                        <button onClick={() => handleSuggest(issue.id, 'suggestion', issue.suggestion, `Provide a better suggestion to fix this script segment: "${issue.segmentText}"`)} disabled={isLoading[`${issue.id}-suggestion`]} title="Refine suggestion" className="absolute top-1 right-2 text-dark-text-secondary hover:text-brand-purple-light"><SparklesIcon className="w-4 h-4" /></button>
                                                    </div>
                                                    <div className="mt-2 flex gap-2">
                                                        <button onClick={() => setPreviewingIssue(issue)} className="flex-1 text-xs bg-brand-purple/20 text-brand-purple-light font-semibold py-1 px-2 rounded-md hover:bg-brand-purple/40 transition-colors">Preview Suggestion</button>
                                                        <button onClick={() => handleRegenerateSuggestion(issue)} disabled={regeneratingIssueId === issue.id} className="flex-1 text-xs bg-brand-purple/20 text-brand-purple-light font-semibold py-1 px-2 rounded-md hover:bg-brand-purple/40 transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                                                            <LightbulbIcon className="h-3 w-3" /> {regeneratingIssueId === issue.id ? 'Regenerating...' : 'Regenerate'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {analysisHistory.length >= 2 && (
                <div id="updated-script-view" className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Updated Script with Suggestions</h2>
                        <span className="text-sm font-mono text-dark-text-secondary">Word Count: {wordCount}</span>
                    </div>
                    <div className="bg-dark-card p-6 rounded-lg border border-dark-border">
                        {renderHighlightedScript()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScriptAnalyzer;