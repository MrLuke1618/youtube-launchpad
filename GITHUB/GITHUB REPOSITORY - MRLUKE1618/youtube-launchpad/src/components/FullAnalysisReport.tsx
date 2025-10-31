import React, { useState, useEffect, useRef } from 'react';
import { 
    OnboardingData, ShopifyApp, RegulationSummary, PlatformStructureInfo, MarketAnalysisResult, CompetitorData,
    AudiencePersona, ContentFunnelPlan, TopicExplorationResult, WebSearchResult, ContentSeriesPlan, VideoBrief,
    RetentionAnalysis, ThumbnailAnalysisResult, View, FunnelVideoIdea
} from '../types';
import DownloadIcon from './icons/DownloadIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import jsPDF from 'jspdf';
import GlobeAltIcon from './icons/GlobeAltIcon';
import UsersIcon from './icons/UsersIcon';
import TargetIcon from './icons/TargetIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import TrendingUpIcon from './icons/TrendingUpIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import EyeIcon from './icons/EyeIcon';
import ShieldExclamationIcon from './icons/ShieldExclamationIcon';

declare const html2canvas: any;

const LOCAL_STORAGE_KEYS = {
    onboarding: 'yt-launchpad-onboarding-state',
    personas: 'yt-launchpad-persona-builder-state',
    funnel: 'yt-launchpad-funnel-mapper-state',
    topicExplorer: 'yt-launchpad-topic-explorer-state',
    research: 'yt-launchpad-research-assistant-state',
    seriesPlanner: 'yt-launchpad-series-planner-state',
    videoBrief: 'yt-launchpad-video-brief-state',
    scriptAnalyzer: 'yt-launchpad-script-analyzer-state',
    thumbnailTester: 'yt-launchpad-thumbnail-tester-state',
};

interface FullReportData {
    onboarding: { data: OnboardingData, editableShopifyApps: ShopifyApp[], marketNiches: any[], editableRegulations: RegulationSummary, editablePlatform: PlatformStructureInfo, editableMarket: MarketAnalysisResult, competitors: CompetitorData[], regulationQuery: string, marketTopics: string } | null;
    personas: { result: { personas: AudiencePersona[], strategicAdvice: string }, description: string } | null;
    funnel: { topic: string, plan: ContentFunnelPlan } | null;
    topicExplorer: { topic: string, results: TopicExplorationResult } | null;
    research: { query: string, result: WebSearchResult } | null;
    seriesPlanner: { topic: string, plan: ContentSeriesPlan } | null;
    videoBrief: { briefStates: { brief: VideoBrief, seedData: { topic: string, title: string }}[] } | null;
    scriptAnalyzer: { script: string, analysis: RetentionAnalysis[] } | null;
    thumbnailTester: { topic: string, titleA: string, titleB: string, imageA: any, imageB: any, analysis: ThumbnailAnalysisResult, promptA?: string | null, promptB?: string | null } | null;
}

interface FullAnalysisReportProps {
    onNavigate: (view: View) => void;
}

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');

    const renderLineWithFormatting = (line: string) => {
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

    flushList(); 

    return <>{elements}</>;
};

export const FullAnalysisReport: React.FC<FullAnalysisReportProps> = ({ onNavigate }) => {
    const [reportData, setReportData] = useState<FullReportData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const reportContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadAllData = () => {
            try {
                const allData: any = {};
                for (const [key, storageKey] of Object.entries(LOCAL_STORAGE_KEYS)) {
                    const item = localStorage.getItem(storageKey);
                    allData[key] = item ? JSON.parse(item) : null;
                }
                setReportData(allData as FullReportData);
            } catch (err) {
                console.error("Failed to load report data:", err);
                setError("Could not load all report data. Some information might be missing or corrupted.");
            } finally {
                setIsLoading(false);
            }
        };
        loadAllData();
    }, []);

    const generateReportText = (format: 'md' | 'txt'): string => {
        if (!reportData) return "No data available.";
        let report = `# YT Launchpad: Full Analysis Report\n\n`;

        const nl = '\n';
        const h2 = format === 'md' ? '## ' : '';
        const h3 = format === 'md' ? '### ' : '';
        const bold = (text: string) => format === 'md' ? `**${text}**` : text;

        if (reportData.onboarding) {
            report += `${h2}Onboarding: Channel Strategy\n\n`;
            if ((reportData.onboarding.marketNiches || []).length > 0 && reportData.onboarding.marketNiches.some(n => n.name)) {
                report += `${h3}Market Research Niches\n\n`;
                reportData.onboarding.marketNiches.forEach((niche, i) => {
                    if (!niche.name) return;
                    report += `${bold(`Niche #${i + 1}: ${niche.name}`)}\n`;
                    report += `- Analysis: ${niche.analysis}\n\n`;
                });
            }
            report += `${h3}Summary & Gap Analysis:\n${reportData.onboarding.data.summary || 'N/A'}\n\n`;
            report += `${h3}Proposed Direction & Pitch:\n${reportData.onboarding.data.marketPitch || 'N/A'}\n\n`;
            report += `${h3}Final Proposal:\n${reportData.onboarding.data.nicheProposal || 'N/A'}\n\n`;
        }
        
        if (reportData.personas?.result?.personas) {
            report += `${h2}Audience Personas\n\n`;
            report += `${bold('Strategic Advice:')} ${reportData.personas.result.strategicAdvice}\n\n`;
            reportData.personas.result.personas.forEach(p => {
                report += `${h3}${p.name}\n`;
                report += `- Bio: ${p.bio}\n`;
                report += `- Goals: ${(p.goals || []).join(', ')}\n`;
                report += `- Pain Points: ${(p.painPoints || []).join(', ')}\n\n`;
            });
        }
        
        if (reportData.topicExplorer?.results) {
            report += `${h2}Topic Exploration: ${reportData.topicExplorer.topic}\n\n`;
            report += `${bold('Strategic Interpretation:')} ${reportData.topicExplorer.results.strategicInterpretation}\n\n`;
            reportData.topicExplorer.results.subNiches.forEach(niche => {
                 report += `${h3}${niche.name}\n`;
                 report += `- Competition: ${niche.competition}, Potential: ${niche.potential}\n`;
                 report += `- Audience: ${niche.audienceProfile}\n\n`;
            });
        }
        
        if (reportData.seriesPlanner?.plan) {
            report += `${h2}Content Series: ${reportData.seriesPlanner.plan.seriesTitle}\n\n`;
            reportData.seriesPlanner.plan.episodes.forEach(ep => {
                report += `${h3}Episode ${ep.episode}: ${ep.title}\n`;
                report += `- Talking Points: ${(ep.talkingPoints || []).join(', ')}\n\n`;
            });
        }
        
        if (reportData.videoBrief?.briefStates) {
            report += `${h2}Video Workflow Plans\n\n`;
            reportData.videoBrief.briefStates.forEach((state, i) => {
                if (state.brief) {
                    report += `${h3}Video Plan ${i + 1}: ${state.seedData.title || state.seedData.topic}\n`;
                    report += `- Title: ${state.brief.titleOptions[0]}\n`;
                    report += `- Hook: ${state.brief.hook}\n\n`;
                }
            });
        }
        
        if (reportData.thumbnailTester?.analysis) {
             report += `${h2}A/B Test: ${reportData.thumbnailTester.topic}\n\n`;
             report += `Predicted Winner: Combination ${reportData.thumbnailTester.analysis.predictedWinner}\n`;
             report += `Reasoning: ${reportData.thumbnailTester.analysis.winnerReasoning}\n\n`;
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
        link.download = `YT-Launchpad-Full-Report.${format}`;
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
                backgroundColor: '#1D1B2E', scale: 2, useCORS: true,
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
                doc.text(copyrightText, margin, pdfHeight - 10, { align: 'left' });
                doc.text(`Page ${i} of ${pageCount}`, pdfWidth - margin, pdfHeight - 10, { align: 'right' });
            }
            
            doc.save(`YT-Launchpad-Full-Report.pdf`);
    
        } catch(e) {
            console.error("Failed to generate PDF:", e);
            setError("An error occurred while generating the PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const renderSection = (title: string, view: View, hasData: boolean) => (
        <div 
            onClick={() => onNavigate(view)}
            className={`bg-dark-bg p-4 rounded-lg border cursor-pointer transition-colors ${hasData ? 'border-dark-border hover:border-brand-purple' : 'border-dashed border-dark-border opacity-60 hover:opacity-100'}`}
        >
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-white">{title}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${hasData ? 'bg-green-900/50 text-green-400' : 'bg-gray-700/50 text-gray-400'}`}>
                    {hasData ? 'COMPLETE' : 'NO DATA'}
                </span>
            </div>
             <p className="text-xs text-dark-text-secondary mt-1">Click to view or edit this section.</p>
        </div>
    );
    
    const ReportPreviewSection: React.FC<{title: string, children: React.ReactNode, id?: string}> = ({title, children, id}) => (
        <div className="mb-8" id={id} style={{ pageBreakInside: 'avoid' }}>
            <h2 className="text-2xl font-bold text-brand-purple-light mb-4 border-b border-dark-border pb-2">{title}</h2>
            {children}
        </div>
    );
    
    const ReportSubSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
        <div className="pl-4 border-l-2 border-dark-border space-y-4">
          {children}
        </div>
      </div>
    );

    const DetailCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
      <div>
        <h4 className="text-lg font-semibold text-brand-purple-light mb-2">{title}</h4>
        <div className="text-sm text-dark-text-secondary space-y-2">{children}</div>
      </div>
    );

    const FormattedList: React.FC<{ items: string[], title: string, icon?: React.ReactNode }> = ({ items, title, icon }) => (
        <div>
            <h5 className="font-semibold text-brand-purple-light mb-2 flex items-center gap-2">{icon}{title}</h5>
            <div className="bg-dark-bg/50 p-3 rounded-lg">
                <ul className="space-y-2 text-sm text-dark-text-secondary list-disc list-inside">
                    {(items || []).map((point, index) => {
                        const parts = point.split(/:(.*)/s);
                        if (parts.length > 1) {
                            return <li key={index}><strong className="text-dark-text">{parts[0]}:</strong> {parts[1].trim()}</li>;
                        }
                        return <li key={index}>{point}</li>;
                    })}
                </ul>
            </div>
        </div>
    );
    
    const SWOTList: React.FC<{ items: string[], title: string, icon: React.ReactNode, color: string }> = ({ items, title, icon, color }) => (
        <div className="bg-dark-bg/50 p-3 rounded-lg">
            <h6 className={`font-semibold mb-1 flex items-center gap-2 ${color}`}>
                {icon}
                {title}
            </h6>
            <ul className="space-y-2 mt-2 text-sm text-dark-text-secondary list-disc list-inside">
                {(items || []).map((point, index) => {
                    const parts = point.split(/:(.*)/s);
                    if (parts.length > 1) {
                        return <li key={index}><strong className="text-dark-text">{parts[0]}:</strong> {parts[1].trim()}</li>;
                    }
                    return <li key={index}>{point}</li>;
                })}
            </ul>
        </div>
    );


    const hasAnyData = reportData && Object.values(reportData).some(v => v !== null);

    if (isLoading) {
        return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto"></div><p className="mt-4 text-dark-text-secondary">Compiling full project report...</p></div>;
    }
    
    if (error) {
        return <p className="text-red-400 text-center py-20">{error}</p>
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Full Analysis Report</h1>
                    <p className="text-lg text-dark-text-secondary">Your project's single source of truth. All your work, in one place.</p>
                </div>
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
            </div>

            <div className="bg-dark-card p-6 rounded-lg border border-dark-border space-y-4">
                <h2 className="text-xl font-bold text-brand-purple-light">Report Sections</h2>
                <p className="text-sm text-dark-text-secondary">This report automatically compiles saved data from each tool. Click any section to jump to that tool and make changes.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {renderSection('Onboarding Task', 'onboardingTask', !!(reportData?.onboarding?.data?.summary || reportData?.onboarding?.data?.nicheProposal))}
                    {renderSection('Audience Personas', 'audiencePersonaBuilder', !!(reportData?.personas?.result?.personas && reportData.personas.result.personas.length > 0))}
                    {renderSection('Content Funnel', 'contentFunnelMapper', !!reportData?.funnel?.plan)}
                    {renderSection('Topic Explorer', 'topicExplorer', !!reportData?.topicExplorer?.results)}
                    {renderSection('Research Assistant', 'researchAssistant', !!reportData?.research?.result)}
                    {renderSection('Series Plan', 'contentSeriesPlanner', !!reportData?.seriesPlanner?.plan)}
                    {renderSection('Video Workflow', 'videoBrief', !!(reportData?.videoBrief?.briefStates && reportData.videoBrief.briefStates.some(s => s.brief)))}
                    {renderSection('Script Analysis', 'scriptAnalyzer', !!(reportData?.scriptAnalyzer?.analysis && reportData.scriptAnalyzer.analysis.length > 0))}
                    {renderSection('A/B Test', 'thumbnailTester', !!reportData?.thumbnailTester?.analysis)}
                </div>
            </div>
            
             <div className="bg-dark-card p-6 rounded-lg border border-dark-border space-y-4">
                <h2 className="text-xl font-bold text-brand-purple-light">Report Preview</h2>
                <p className="text-sm text-dark-text-secondary">A live preview of your full analysis report. Use the export button above to save as a PDF or other formats.</p>

                <div ref={reportContentRef} className="pt-4 border-t border-dark-border/50 bg-dark-bg p-6 rounded-lg text-white">
                    {!hasAnyData ? (
                        <p className="text-center text-dark-text-secondary py-10">No data found. Complete modules to see your report build here.</p>
                    ) : (
                        <div className="space-y-10 report-content">
                            {reportData?.onboarding && (
                                <ReportPreviewSection title="Onboarding: Channel Strategy">
                                    <ReportSubSection title="Part 1: Initial Research">
                                        <DetailCard title="Market Research Workspace">
                                            {(reportData.onboarding.marketNiches || []).map((niche, i) => (
                                                niche.name && <div key={i} className="p-3 bg-dark-card/50 rounded mt-2 border border-dark-border/50">
                                                    <p className="font-semibold text-dark-text">Niche #{i + 1}: {niche.name}</p>
                                                    <p className="text-xs whitespace-pre-wrap mt-1">{niche.analysis}</p>
                                                </div>
                                            ))}
                                        </DetailCard>
                                        <DetailCard title="Summary & Gap Analysis">
                                            <p className="whitespace-pre-wrap">{reportData.onboarding.data.summary || 'Not completed.'}</p>
                                        </DetailCard>
                                    </ReportSubSection>

                                    <ReportSubSection title="Part 2: YouTube Regulations">
                                        {reportData.onboarding.editableRegulations && <>
                                            <DetailCard title={`Expert Report on "${reportData.onboarding.regulationQuery}"`}>
                                                <p className="whitespace-pre-wrap">{reportData.onboarding.editableRegulations.summary}</p>
                                            </DetailCard>
                                        </>}
                                        <DetailCard title="My Summary Report">
                                            <p className="whitespace-pre-wrap">{reportData.onboarding.data.regulationsSummary || 'Not completed.'}</p>
                                        </DetailCard>
                                    </ReportSubSection>

                                    <ReportSubSection title="Part 3: Platform Structure">
                                        <DetailCard title="My Summary Report">
                                            <p className="whitespace-pre-wrap">{reportData.onboarding.data.platformSummary || 'Not completed.'}</p>
                                        </DetailCard>
                                    </ReportSubSection>

                                    <ReportSubSection title="Part 4: Market Analysis">
                                        {reportData.onboarding.editableMarket && (
                                            <div className="space-y-4">
                                                <FormattedList items={reportData.onboarding.editableMarket.trendingTopics} title="Trending Topics" icon={<TrendingUpIcon className="w-5 h-5"/>} />
                                                <FormattedList items={reportData.onboarding.editableMarket.emergingFormats} title="Emerging Formats" icon={<LightbulbIcon className="w-5 h-5"/>} />
                                                <div>
                                                    <h5 className="font-semibold text-brand-purple-light mb-2">SWOT Analysis</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <SWOTList items={reportData.onboarding.editableMarket.swotAnalysis.strengths} title="Strengths" icon={<CheckCircleIcon />} color="text-green-400" />
                                                        <SWOTList items={reportData.onboarding.editableMarket.swotAnalysis.weaknesses} title="Weaknesses" icon={<XCircleIcon />} color="text-red-400" />
                                                        <SWOTList items={reportData.onboarding.editableMarket.swotAnalysis.opportunities} title="Opportunities" icon={<EyeIcon />} color="text-blue-400" />
                                                        <SWOTList items={reportData.onboarding.editableMarket.swotAnalysis.threats} title="Threats" icon={<ShieldExclamationIcon />} color="text-yellow-400" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <DetailCard title="Proposed Direction & Pitch">
                                            <p className="whitespace-pre-wrap">{reportData.onboarding.data.marketPitch || 'Not completed.'}</p>
                                        </DetailCard>
                                    </ReportSubSection>
                                     
                                    <ReportSubSection title="Part 5: Competitor Deep-Dive & Niche Pitch">
                                        <DetailCard title="Final Proposal">
                                            <p className="whitespace-pre-wrap">{reportData.onboarding.data.nicheProposal || 'Not completed.'}</p>
                                        </DetailCard>
                                    </ReportSubSection>
                                </ReportPreviewSection>
                            )}
                            
                            {reportData?.personas?.result?.personas?.length && (
                                <ReportPreviewSection title="Audience Personas">
                                     <DetailCard title="User Input: Channel Description">
                                        <p className="whitespace-pre-wrap italic">"{reportData.personas.description}"</p>
                                    </DetailCard>
                                    <div className="space-y-4 mt-4">
                                        {reportData.personas.result.personas.map((p, i) => (
                                            <div key={i} className="p-4 bg-dark-card rounded-lg border border-dark-border/50">
                                                <h3 className="text-lg font-semibold">{p.name}</h3>
                                                <p className="text-sm text-dark-text-secondary italic mt-1">{p.bio}</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs border-t border-dark-border/50 pt-3">
                                                    <div><strong className="text-dark-text">Goals:</strong> <span className="text-dark-text-secondary">{(p.goals || []).join(', ')}</span></div>
                                                    <div><strong className="text-dark-text">Pain Points:</strong> <span className="text-dark-text-secondary">{(p.painPoints || []).join(', ')}</span></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <h3 className="text-lg font-semibold mt-6 mb-2">Strategic Advice</h3>
                                    <p className="text-sm text-dark-text-secondary whitespace-pre-wrap">{reportData.personas.result.strategicAdvice}</p>
                                </ReportPreviewSection>
                            )}

                            {reportData?.funnel?.plan && (
                                <ReportPreviewSection title={`Content Funnel: ${reportData.funnel.topic}`}>
                                    <div className="space-y-6">
                                        {(['awareness', 'consideration', 'conversion'] as const).map(stage => (
                                            <div key={stage}>
                                                <div className="flex items-center gap-3 mb-2">
                                                    {stage === 'awareness' ? <GlobeAltIcon className="w-7 h-7 text-blue-400" /> : stage === 'consideration' ? <UsersIcon className="w-7 h-7 text-yellow-400" /> : <TargetIcon className="w-7 h-7 text-green-400" />}
                                                    <h3 className="text-xl font-semibold capitalize">{stage}</h3>
                                                </div>
                                                <div className="pl-4 border-l-2 border-dark-border space-y-3">
                                                    <p className="text-sm text-dark-text-secondary italic">{reportData.funnel!.plan[stage].strategicGoal}</p>
                                                    {(reportData.funnel!.plan[stage].ideas || []).map((idea, i) => 
                                                        <div key={i} className="p-3 bg-dark-card/50 rounded border border-dark-border/50">
                                                            <p className="font-semibold text-dark-text">{idea.title} <span className="text-xs font-normal bg-dark-border px-2 py-0.5 rounded-full ml-2">{idea.format}</span></p>
                                                            <p className="text-xs text-dark-text-secondary mt-1">{idea.description}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ReportPreviewSection>
                            )}

                            {reportData?.topicExplorer?.results && (
                                <ReportPreviewSection title={`Topic Explorer: ${reportData.topicExplorer.topic}`}>
                                    <DetailCard title="Strategic Interpretation">
                                        <p>{reportData.topicExplorer.results.strategicInterpretation}</p>
                                    </DetailCard>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        {reportData.topicExplorer.results.subNiches.map((niche, i) => (
                                            <div key={i} className="p-3 bg-dark-card/50 rounded border border-dark-border/50">
                                                <p className="font-semibold text-dark-text">{niche.name}</p>
                                                <p className="text-xs mt-1"><strong className="text-dark-text-secondary">Competition:</strong> {niche.competition}, <strong className="text-dark-text-secondary">Potential:</strong> {niche.potential}</p>
                                                <p className="text-xs mt-1"><strong className="text-dark-text-secondary">Audience:</strong> {niche.audienceProfile}</p>
                                            </div>
                                        ))}
                                    </div>
                                </ReportPreviewSection>
                            )}

                             {reportData?.research?.result && (
                                <ReportPreviewSection title={`Research Assistant: ${reportData.research.query}`}>
                                    <MarkdownRenderer content={reportData.research.result.text} />
                                </ReportPreviewSection>
                            )}

                             {reportData?.seriesPlanner?.plan && (
                                <ReportPreviewSection title={`Content Series: ${reportData.seriesPlanner.plan.seriesTitle}`}>
                                    <DetailCard title="Strategic Rationale"><p>{reportData.seriesPlanner.plan.seriesRationale}</p></DetailCard>
                                    <div className="space-y-4 mt-4">
                                        {reportData.seriesPlanner.plan.episodes.map(ep => (
                                            <div key={ep.episode} className="p-3 bg-dark-card/50 rounded border border-dark-border/50">
                                                <p className="font-semibold text-dark-text">Ep {ep.episode}: {ep.title}</p>
                                                <p className="text-xs text-dark-text-secondary mt-1">{ep.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </ReportPreviewSection>
                            )}

                            {reportData?.videoBrief?.briefStates?.some(s => s.brief) && (
                                <ReportPreviewSection title="Video Workflow">
                                    {reportData.videoBrief.briefStates.map((state, i) => state.brief && (
                                        <ReportSubSection key={i} title={state.seedData.title || state.seedData.topic}>
                                            <DetailCard title="Title"><p>{state.brief.titleOptions[0]}</p></DetailCard>
                                            