import React, { useState, useEffect, useRef } from 'react';
import { generateAudiencePersonas, suggestTextRefinement, validateInput } from '../services/geminiService';
import { AudiencePersona, AudiencePersonaResult } from '../types';
import UserCircleIcon from './icons/UserCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import GlobeAltIcon from './icons/GlobeAltIcon';
import TrashIcon from './icons/TrashIcon';
import DownloadIcon from './icons/DownloadIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import jsPDF from 'jspdf';
import SparklesIcon from './icons/SparklesIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';


declare const html2canvas: any;

type SaveStatus = 'unsaved' | 'saving' | 'saved';
const LOCAL_STORAGE_KEY = 'yt-launchpad-persona-builder-state';

interface AudiencePersonaBuilderProps {
    isWorkflowMode?: boolean;
    onWorkflowComplete?: (data: any) => void;
    initialData?: string;
}

const MIN_DESC_LENGTH = 15;

const AudiencePersonaBuilder: React.FC<AudiencePersonaBuilderProps> = ({ initialData }) => {
    const [description, setDescription] = useState('');
    const [result, setResult] = useState<AudiencePersonaResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
    const [isExporting, setIsExporting] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: string]: boolean }>({});
    const [currentPersonaIndex, setCurrentPersonaIndex] = useState(0);


    // Load state from localStorage on mount
    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                setDescription(savedState.description || '');
                setResult(savedState.result || null);
            } catch (e) {
                console.error("Failed to parse persona builder state from localStorage", e);
            }
        } else if (initialData) {
            setDescription(initialData);
        }
    }, [initialData]);

    // Auto-save state to localStorage with debounce
    useEffect(() => {
        setSaveStatus('unsaved');
        const handler = setTimeout(() => {
            setSaveStatus('saving');
            const stateToSave = {
                description,
                result,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
            setTimeout(() => setSaveStatus('saved'), 500);
        }, 1500);

        return () => {
            clearTimeout(handler);
        };
    }, [description, result]);

    // Real-time input validation
    useEffect(() => {
        const { message } = validateInput(description, MIN_DESC_LENGTH, 'audience description');
        setValidationError(message);
    }, [description]);


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
            const res = await suggestTextRefinement({ fieldName, currentValue, context, outputFormat });
            
            const parts = key.split('-');
            if (parts[0] === 'description') {
                setDescription(res.suggestion as string);
            } else if (parts[0] === 'persona' && result) {
                const index = parseInt(parts[1], 10);
                const field = parts[2] as keyof AudiencePersona;
                const newPersonas = [...result.personas];

                if (parts[3]) { // Demographic field
                    const demoField = parts[3] as keyof AudiencePersona['demographics'];
                    newPersonas[index].demographics[demoField] = res.suggestion as string;
                } else {
                     (newPersonas[index] as any)[field] = res.suggestion;
                }

                setResult({...result, personas: newPersonas});
            } else if (parts[0] === 'strategicAdvice' && result) {
                setResult({...result, strategicAdvice: res.suggestion as string});
            }

        } catch (e) {
            setError('Failed to get a suggestion.');
            console.error(e);
        } finally {
            setLoadingSuggestions(prev => ({ ...prev, [key]: false }));
        }
    };


    const handleGenerate = async () => {
        const { isValid, message } = validateInput(description, MIN_DESC_LENGTH, 'audience description');
        if (!isValid) {
            setError(message || 'Please provide a clear description of your channel or audience.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const apiResult = await generateAudiencePersonas(description);
            setResult(apiResult);
            setCurrentPersonaIndex(0);
        } catch (e: any) {
            setError(e.message || 'Failed to generate personas.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePersonaChange = (index: number, field: keyof AudiencePersona, value: any) => {
        setResult(prev => {
            if (!prev) return null;
            const newPersonas = [...prev.personas];
            const newPersona = { ...newPersonas[index], [field]: value };
            newPersonas[index] = newPersona;
            return {...prev, personas: newPersonas};
        });
    };
    
    const handleDemographicsChange = (index: number, field: keyof AudiencePersona['demographics'], value: string) => {
        setResult(prev => {
            if (!prev) return null;
            const newPersonas = [...prev.personas];
            const newPersona = { ...newPersonas[index], demographics: { ...newPersonas[index].demographics, [field]: value }};
            newPersonas[index] = newPersona;
            return {...prev, personas: newPersonas};
        });
    };
    
    const handleDeletePersona = (index: number) => {
        if (window.confirm(`Are you sure you want to delete the persona "${result?.personas?.[index]?.name}"?`)) {
            setResult(prev => {
                if (!prev) return null;
                const newPersonas = prev.personas.filter((_, i) => i !== index);
                if (currentPersonaIndex >= newPersonas.length) {
                    setCurrentPersonaIndex(Math.max(0, newPersonas.length - 1));
                }
                return {...prev, personas: newPersonas};
            });
        }
    };


    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear the description and all personas? This cannot be undone.")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setDescription('');
            setResult(null);
            setError(null);
        }
    };

    const generateReportText = (format: 'md' | 'txt'): string => {
        if (!result || !result.personas || result.personas.length === 0) return '';
        const nl = '\n';
        const h1 = format === 'md' ? '# ' : '';
        const h2 = format === 'md' ? '## ' : '';
        const listItem = (text: string) => format === 'md' ? `* ${text}` : `  - ${text}`;
        const bold = (text: string) => format === 'md' ? `**${text}**` : text;

        let report = `${h1}Audience Personas Report${nl.repeat(2)}`;
        
        if(result.strategicAdvice) {
            report += `${h2}Strategic Application\n${result.strategicAdvice}${nl.repeat(2)}`;
        }

        result.personas.forEach((persona, index) => {
            if (index > 0) {
                report += `---${nl.repeat(2)}`;
            }
            report += `${h1}Audience Persona: ${persona.name}${nl.repeat(2)}`;
            report += `${persona.bio}${nl.repeat(2)}`;

            report += `${h2}Demographics${nl}`;
            report += `${bold('Age:')} ${persona.demographics.age}${nl}`;
            report += `${bold('Location:')} ${persona.demographics.location}${nl}`;
            report += `${bold('Role:')} ${persona.demographics.role}${nl.repeat(2)}`;
            
            report += `${h2}Goals${nl}${(persona.goals || []).map(listItem).join(nl)}${nl.repeat(2)}`;
            report += `${h2}Pain Points${nl}${(persona.painPoints || []).map(listItem).join(nl)}${nl.repeat(2)}`;
            report += `${h2}Online Hangouts${nl}${(persona.onlineHangouts || []).map(listItem).join(nl)}${nl.repeat(2)}`;
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
        link.download = `Audience-Personas.md`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleExportPdf = async () => {
        // For PDF export, we need to render all personas vertically in a temporary element
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
                backgroundColor: '#131221', scale: 2, useCORS: true,
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
                heightLeft -= (pdfHeight - margin * 2);
            }
            
            const pageCount = (doc as any).internal.getNumberOfPages();
            const currentYear = new Date().getFullYear();
            const copyrightYear = currentYear > 2025 ? `2025-${currentYear}` : '2025';
            const copyrightText = `This document was generated using YT Launchpad. © ${copyrightYear} Developed by MrLuke1618. All rights reserved.`;

            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(156, 163, 175);
                doc.text(copyrightText, margin, pdfHeight - 10, { align: 'left' });
                doc.text(`Page ${i} of ${pageCount}`, pdfWidth - margin, pdfHeight - 10, { align: 'right' });
            }
            
            doc.save(`Audience-Personas.pdf`);
    
        } catch(e) {
            console.error("Failed to generate PDF:", e);
            setError("An error occurred while generating the PDF.");
        } finally {
            setIsExporting(false);
        }
    };


    // FIX: Made the `icon` prop optional to support cards where the icon is external, resolving TypeScript errors.
    const InfoCard: React.FC<{ icon?: React.ReactNode; title: string; children: React.ReactNode; suggestionButton?: React.ReactNode }> = ({ icon, title, children, suggestionButton }) => (
        <div className="bg-dark-bg p-4 rounded-lg">
            <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                    {icon}
                    <h4 className="text-base font-semibold text-brand-purple-light">{title}</h4>
                </div>
                {suggestionButton}
            </div>
            {children}
        </div>
    );
    
    const handlePrevPersona = () => {
        if (!result) return;
        setCurrentPersonaIndex(prev => (prev - 1 + result.personas.length) % result.personas.length);
    };

    const handleNextPersona = () => {
        if (!result) return;
        setCurrentPersonaIndex(prev => (prev + 1) % result.personas.length);
    };

    const isGenerateDisabled = isLoading || !description.trim() || !!validationError;

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Audience Persona Builder</h1>
                    <p className="text-lg text-dark-text-secondary">Develop detailed, AI-generated audience personas to deeply understand who you're creating for.</p>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-2 text-dark-text-secondary hover:text-white" title="Reset Progress">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                     {result && result.personas.length > 0 && (
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
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your channel, ideal viewer, or video topic. The more detail you provide, the better the personas will be."
                        className="w-full h-28 bg-dark-bg border border-dark-border rounded-md px-4 py-3 text-base text-white placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none pr-28"
                        disabled={isLoading}
                    />
                     <div className="absolute top-3 right-3 flex items-center gap-2">
                        {loadingSuggestions['description'] && (
                            <div className="bg-brand-purple rounded-md px-2 py-1 text-xs text-white animate-pulse">
                                Thinking...
                            </div>
                        )}
                        <button 
                            onClick={() => handleSuggest('description', 'Channel Description', description, 'A high-level description of a YouTube channel to attract a specific audience.')} 
                            disabled={loadingSuggestions['description']}
                            title="Generate or refine description" 
                            className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50 transition-colors bg-dark-bg rounded-md"
                        >
                            {loadingSuggestions['description'] ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
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
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerateDisabled}
                            className="w-full sm:w-auto bg-brand-purple text-white font-bold py-3 px-8 rounded-lg hover:bg-brand-purple-light transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <UserCircleIcon className="w-5 h-5" /> {isLoading ? 'Generating...' : 'Generate'}
                        </button>
                    </div>
                </div>
                <p className="text-sm text-dark-text-secondary italic text-center pt-4 border-t border-dark-border/50">
                    💡 Tip: All AI-generated content is fully editable. Click on any text to make your own changes.
                </p>
                {error && !validationError && <p className="text-red-400 mt-2 text-sm text-center">{error}</p>}
            </div>

            {isLoading && (
                 <div className="text-center py-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto"></div><p className="mt-4 text-dark-text-secondary">Crafting your ideal viewer profiles...</p></div>
            )}

            {result && result.personas.length > 0 && (
                <div className="space-y-6">
                    <div className="relative max-w-3xl mx-auto">
                         {result.personas.length > 1 && (
                            <>
                                <button onClick={handlePrevPersona} className="absolute top-1/2 -left-4 md:-left-12 transform -translate-y-1/2 z-10 p-2 rounded-full bg-dark-card border border-dark-border hover:bg-dark-border text-dark-text-secondary hover:text-white transition-colors">
                                    <ArrowLeftIcon className="w-6 h-6" />
                                </button>
                                <button onClick={handleNextPersona} className="absolute top-1/2 -right-4 md:-right-12 transform -translate-y-1/2 z-10 p-2 rounded-full bg-dark-card border border-dark-border hover:bg-dark-border text-dark-text-secondary hover:text-white transition-colors">
                                    <ArrowRightIcon className="w-6 h-6" />
                                </button>
                            </>
                        )}
                        <div ref={reportContentRef} className="overflow-hidden">
                             <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentPersonaIndex * 100}%)` }}>
                                {result.personas.map((persona, index) => (
                                    <div key={index} className="w-full flex-shrink-0 px-1">
                                         <div className="bg-dark-card p-6 rounded-lg border border-dark-border flex flex-col">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-4 w-full">
                                                    <UserCircleIcon className="w-12 h-12 text-brand-purple-light flex-shrink-0" />
                                                    <InfoCard title="Name & Bio" suggestionButton={
                                                        <div className="flex items-center gap-2">
                                                            {loadingSuggestions[`persona-${index}-name`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                                            <button onClick={() => handleSuggest(`persona-${index}-name`, 'Persona Name', persona.name, `Based on bio: ${persona.bio}`)} disabled={loadingSuggestions[`persona-${index}-name`]} title="Suggest name" className="text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                                        </div>
                                                    }>
                                                        <input
                                                            type="text"
                                                            value={persona.name}
                                                            onChange={(e) => handlePersonaChange(index, 'name', e.target.value)}
                                                            className="text-2xl font-bold text-white bg-transparent w-full focus:outline-none focus:bg-dark-bg p-1 rounded-md"
                                                        />
                                                        <textarea
                                                            value={persona.bio}
                                                            onChange={(e) => handlePersonaChange(index, 'bio', e.target.value)}
                                                            className="w-full bg-transparent text-sm text-dark-text-secondary italic text-left focus:outline-none focus:bg-dark-bg p-1 rounded-md"
                                                            rows={4}
                                                        />
                                                    </InfoCard>
                                                </div>
                                                <button onClick={() => handleDeletePersona(index)} className="p-1 text-dark-text-secondary hover:text-red-400 flex-shrink-0 ml-2" title="Delete Persona">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <InfoCard icon={<UserCircleIcon className="h-5 w-5" />} title="Demographics">
                                                    <div className="text-sm text-dark-text-secondary space-y-2">
                                                        {(Object.keys(persona.demographics) as (keyof AudiencePersona['demographics'])[]).map((key) => (
                                                            <div key={key} className="relative flex items-center gap-2">
                                                                <strong className="capitalize flex-shrink-0 w-16">{key}:</strong>
                                                                <input type="text" value={persona.demographics[key]} onChange={(e) => handleDemographicsChange(index, key, e.target.value)} className="w-full bg-transparent focus:outline-none focus:bg-dark-bg p-1 rounded-md" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </InfoCard>
                                                <InfoCard icon={<CheckCircleIcon className="h-5 w-5 text-green-400" />} title="Goals" suggestionButton={
                                                    <div className="flex items-center gap-2">
                                                        {loadingSuggestions[`persona-${index}-goals`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                                        <button onClick={() => handleSuggest(`persona-${index}-goals`, 'Persona Goals', (persona.goals || []).join('\n'), `For a persona named '${persona.name}'.`, 'list')} disabled={loadingSuggestions[`persona-${index}-goals`]} title="Suggest goals" className="text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                                    </div>
                                                }>
                                                    <textarea value={(persona.goals || []).join('\n')} onChange={e => handlePersonaChange(index, 'goals', e.target.value.split('\n'))} className="w-full text-sm text-dark-text-secondary bg-transparent focus:outline-none focus:bg-dark-bg p-1 rounded-md" rows={(persona.goals || []).length + 1} />
                                                </InfoCard>
                                                <InfoCard icon={<XCircleIcon className="h-5 w-5 text-red-400" />} title="Pain Points" suggestionButton={
                                                    <div className="flex items-center gap-2">
                                                        {loadingSuggestions[`persona-${index}-painPoints`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                                        <button onClick={() => handleSuggest(`persona-${index}-painPoints`, 'Persona Pain Points', (persona.painPoints || []).join('\n'), `For a persona named '${persona.name}'.`, 'list')} disabled={loadingSuggestions[`persona-${index}-painPoints`]} title="Suggest pain points" className="text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                                    </div>
                                                }>
                                                    <textarea value={(persona.painPoints || []).join('\n')} onChange={e => handlePersonaChange(index, 'painPoints', e.target.value.split('\n'))} className="w-full text-sm text-dark-text-secondary bg-transparent focus:outline-none focus:bg-dark-bg p-1 rounded-md" rows={(persona.painPoints || []).length + 1} />
                                                </InfoCard>
                                                <InfoCard icon={<GlobeAltIcon className="h-5 w-5 text-blue-400" />} title="Online Hangouts" suggestionButton={
                                                     <div className="flex items-center gap-2">
                                                        {loadingSuggestions[`persona-${index}-onlineHangouts`] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                                        <button onClick={() => handleSuggest(`persona-${index}-onlineHangouts`, 'Online Hangouts', (persona.onlineHangouts || []).join('\n'), `For a persona named '${persona.name}'.`, 'list')} disabled={loadingSuggestions[`persona-${index}-onlineHangouts`]} title="Suggest online hangouts" className="text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                                    </div>
                                                }>
                                                    <textarea value={(persona.onlineHangouts || []).join('\n')} onChange={e => handlePersonaChange(index, 'onlineHangouts', e.target.value.split('\n'))} className="w-full text-sm text-dark-text-secondary bg-transparent focus:outline-none focus:bg-dark-bg p-1 rounded-md" rows={(persona.onlineHangouts || []).length + 1} />
                                                </InfoCard>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                    <div className="text-center text-sm text-dark-text-secondary font-mono">
                        {currentPersonaIndex + 1} / {result.personas.length}
                    </div>
                     {result.strategicAdvice && (
                         <div className="bg-dark-card p-6 rounded-lg border border-dark-border flex items-start gap-4 max-w-3xl mx-auto">
                            <LightbulbIcon className="w-8 h-8 text-brand-purple-light flex-shrink-0 mt-1" />
                            <div className="w-full">
                                <InfoCard title="Strategic Application" suggestionButton={
                                    <div className="flex items-center gap-2">
                                        {loadingSuggestions['strategicAdvice'] && <div className="bg-dark-bg border border-dark-border rounded-md px-2 py-1 text-xs text-dark-text-secondary animate-pulse">Thinking...</div>}
                                        <button onClick={() => handleSuggest('strategicAdvice', 'Strategic Advice', result.strategicAdvice, `Based on personas for a channel about ${description}`)} disabled={loadingSuggestions['strategicAdvice']} title="Suggest advice" className="text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50"><SparklesIcon className="w-5 h-5"/></button>
                                    </div>
                                }>
                                    <textarea
                                        value={result.strategicAdvice}
                                        onChange={(e) => setResult(prev => prev ? {...prev, strategicAdvice: e.target.value} : null)}
                                        className="w-full bg-transparent text-sm text-dark-text-secondary focus:outline-none focus:bg-dark-bg p-1 rounded-md"
                                        rows={5}
                                    />
                                </InfoCard>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AudiencePersonaBuilder;