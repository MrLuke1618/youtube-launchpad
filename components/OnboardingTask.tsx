import React, { useState, useCallback, useRef, useEffect } from 'react';
import { OnboardingData, ShopifyApp, RegulationSummary, PlatformStructureInfo, MarketAnalysisResult, CompetitorData, PlatformElement, MarketNiche, NicheChannel } from '../types';
import { getYouTubeRegulationInfo, getYouTubePlatformInfo, analyzeYouTubeMarket, analyzeCompetitorStrengthsWeaknesses, suggestTextRefinement, generateNicheResearch, generateCompetitorProfile, generateOnboardingSummary, summarizeRegulationReport } from '../services/geminiService';
import DownloadIcon from './icons/DownloadIcon';
import EyeIcon from './icons/EyeIcon';
import CogIcon from './icons/CogIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import ShieldExclamationIcon from './icons/ShieldExclamationIcon';
import QuestionMarkIcon from './icons/QuestionMarkIcon';
import TrashIcon from './icons/TrashIcon';
import ExplainableTerm from './ExplainableTerm';
import TrendingUpIcon from './icons/TrendingUpIcon';
import PlusIcon from './icons/PlusIcon';
import PencilIcon from './icons/PencilIcon';
import LinkIcon from './icons/LinkIcon';
import SparklesIcon from './icons/SparklesIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

type SaveStatus = 'unsaved' | 'saving' | 'saved';
const LOCAL_STORAGE_KEY = 'yt-launchpad-onboarding-state';

const initialShopifyApps: ShopifyApp[] = [
    { name: "Avada SEO Image Optimizer", description: ["Improve search visibility with AI SEO Audit, On-Page SEO Optimizer, Page Speed & Image Optimizer.", "Full technical SEO: JSON-LD, Rich snippets, Robots.txt, 404 page, 301 redirect, FAQ, Sitemap, etc.", "Track your SEO & score performance with detailed reports."], docs: "https://docs.avada.io/seo-suite-help-center" },
    { name: "SEO On: AI Product Description", description: ["Write SEO-optimized product descriptions that helps you sell more with SEO AI generation.", "Create product copy for a single product or your entire catalog instantly.", "Save time, improve SEO, and enhance sales in a minute."], docs: "https://help.seoon.io/ai-product-copy" },
    { name: "SEO On: AI Blog Post Builder", description: ["Write SEO-friendly AI blog post in a minute and drive organic traffic to your store.", "Get instant SEO suggests, improve your writing, and see your traffic thrive.", "Manage, add, delete and sync blog posts to Shopify blogs."], docs: "https://help.seoon.io/" },
    { name: "SEO On: AEO optimizer llms.txt", description: ["Enhance AEO visibility with automatic LLMs.txt generation, crawler control & updates for AI chatbots.", "Decide which bots see which content, then rely on automatic updates to keep the file current.", "Greater visibility, and qualified traffic from conversational AI search."], docs: "https://docs.avada.io/seo-on-aeo-optimizer/" }
];

const initialData: OnboardingData = {
    niche1: '', channels1: '', analysis1: '', niche2: '', channels2: '', analysis2: '', summary: '',
    regulationsSummary: '', platformSummary: '', marketPitch: '', nicheProposal: '',
};
const initialMarketNiches: MarketNiche[] = [{ id: Date.now(), name: '', channels: [], analysis: '' }];
const initialCompetitors = [{ id: 1, name: '', url: '', subscriberCount: '', summary: '', mainTopics: '', videoStyles: '' }];

interface OnboardingTaskProps {
    onHelpClick: () => void;
}

const OnboardingTask: React.FC<OnboardingTaskProps> = ({ onHelpClick }) => {
    const [data, setData] = useState<OnboardingData>(initialData);
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
    const [error, setError] = useState<{ [key: string]: string | null }>({});
    const reportContentRef = useRef<HTMLDivElement>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

    // Editable state for dynamic sections
    const [editableShopifyApps, setEditableShopifyApps] = useState<ShopifyApp[]>(initialShopifyApps);
    const [editingApp, setEditingApp] = useState<ShopifyApp | null>(null);

    const [marketNiches, setMarketNiches] = useState<MarketNiche[]>(initialMarketNiches);

    const [editableRegulations, setEditableRegulations] = useState<RegulationSummary | null>(null);
    const [editablePlatform, setEditablePlatform] = useState<PlatformStructureInfo | null>(null);
    const [editableMarket, setEditableMarket] = useState<MarketAnalysisResult | null>(null);
    
    const [regulationQuery, setRegulationQuery] = useState('YouTube Community Guidelines');
    const [marketTopics, setMarketTopics] = useState('Shopify SEO, CRO, Email Marketing');
    const [competitors, setCompetitors] = useState<CompetitorData[]>(initialCompetitors);
    const competitorIntervals = useRef<Record<number, number>>({});
    const nicheIntervals = useRef<Record<number, number>>({});
    const [loadingMessages, setLoadingMessages] = useState<{ [key: string]: string }>({});
    const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: string]: boolean }>({});
    const [platformCarouselIndex, setPlatformCarouselIndex] = useState(0);
    
    // Load state from localStorage on mount
    useEffect(() => {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                setData(savedState.data || initialData);
                setEditableShopifyApps(savedState.editableShopifyApps || initialShopifyApps);
                setMarketNiches(savedState.marketNiches && savedState.marketNiches.length > 0 ? savedState.marketNiches : initialMarketNiches);
                setEditableRegulations(savedState.editableRegulations || null);
                setEditablePlatform(savedState.editablePlatform || null);
                setEditableMarket(savedState.editableMarket || null);
                setRegulationQuery(savedState.regulationQuery || 'YouTube Community Guidelines');
                setMarketTopics(savedState.marketTopics || 'Shopify SEO, CRO, Email Marketing');
                setCompetitors(savedState.competitors && savedState.competitors.length > 0 ? savedState.competitors : initialCompetitors);
            } catch (e) {
                console.error("Failed to parse onboarding state from localStorage", e);
            }
        }
    }, []);

    // Auto-save state to localStorage with debounce
    useEffect(() => {
        setSaveStatus('unsaved');
        const handler = setTimeout(() => {
            setSaveStatus('saving');
            const stateToSave = {
                data,
                editableShopifyApps,
                marketNiches,
                editableRegulations,
                editablePlatform,
                editableMarket,
                regulationQuery,
                marketTopics,
                competitors,
            };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
            setTimeout(() => setSaveStatus('saved'), 500);
        }, 1500);

        return () => {
            clearTimeout(handler);
        };
    }, [data, editableShopifyApps, marketNiches, editableRegulations, editablePlatform, editableMarket, regulationQuery, marketTopics, competitors]);

    // Loading message effects
    const regulationLoadingSteps = [ "Accessing YouTube policy database...", `Analyzing specific query: "${regulationQuery}"...`, "Identifying common pitfalls...", "Summarizing key takeaways...", ];
    const marketLoadingSteps = [ `Scanning market for keywords: "${marketTopics}"...`, "Identifying trending video formats...", "Conducting SWOT analysis...", "Compiling strategic insights...", ];
    const nicheResearchLoadingSteps = [
        "Defining niche parameters...",
        "Searching for representative channels...",
        "Analyzing subscriber counts...",
        "Evaluating content strategies...",
        "Identifying potential content gaps...",
        "Compiling research card...",
    ];

    useEffect(() => {
        const intervals: Record<string, number> = {};
        const setupInterval = (key: 'regulations' | 'market', steps: string[]) => {
            let step = 0; setLoadingMessages(prev => ({ ...prev, [key]: steps[0] }));
            intervals[key] = window.setInterval(() => { step = (step + 1) % steps.length; setLoadingMessages(prev => ({ ...prev, [key]: steps[step] })); }, 1800);
        };
        if (isLoading.regulations) setupInterval('regulations', regulationLoadingSteps);
        if (isLoading.market) setupInterval('market', marketLoadingSteps);
        return () => { Object.values(intervals).forEach(clearInterval); };
    }, [isLoading.regulations, isLoading.market, regulationQuery, marketTopics]);

     const handleSuggest = async (
        key: string,
        fieldName: string,
        currentValue: string,
        context: string,
    ) => {
        setLoadingSuggestions(prev => ({ ...prev, [key]: true }));
        setError(prev => ({ ...prev, [key]: null }));
        try {
            const { suggestion } = await suggestTextRefinement({ fieldName, currentValue, context });
            const parts = key.split('-');
            const type = parts[0];

            switch (type) {
                case 'market': {
                    if (parts[1] === 'topics') {
                        setMarketTopics(suggestion as string);
                    }
                    break;
                }
                default: { // For simple data state
                    setData(prev => ({ ...prev, [key]: suggestion as string }));
                    break;
                }
            }
        } catch (e: any) {
            setError(prev => ({ ...prev, [key]: e.message || 'Failed to get suggestion.' }));
        } finally {
            setLoadingSuggestions(prev => ({ ...prev, [key]: false }));
        }
    };


    const handleDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
    };

    // --- Dynamic Section Handlers ---

    // Shopify Apps
    const handleStartEditApp = (app: ShopifyApp) => setEditingApp({ ...app });
    const handleCancelEditApp = () => setEditingApp(null);
    const handleSaveApp = () => {
        if (!editingApp) return;
        const isNew = !editableShopifyApps.some(app => app.name === editingApp.name);
        if (isNew) {
            setEditableShopifyApps(prev => [...prev, editingApp]);
        } else {
            setEditableShopifyApps(prev => prev.map(app => app.name === editingApp.name ? editingApp : app));
        }
        setEditingApp(null);
    };
    const handleUpdateEditingApp = (field: keyof ShopifyApp, value: string) => {
        if (!editingApp) return;
        if (field === 'description') {
            setEditingApp(prev => prev ? { ...prev, [field]: value.split('\n') } : null);
        } else {
            setEditingApp(prev => prev ? { ...prev, [field]: value } : null);
        }
    };
    const handleAddApp = () => setEditingApp({ name: '', description: [], docs: '' });
    const handleDeleteApp = (appName: string) => setEditableShopifyApps(prev => prev.filter(app => app.name !== appName));

    // Market Niches
    const handleAddNiche = () => setMarketNiches(prev => [...prev, { id: Date.now(), name: '', channels: [], analysis: '' }]);
    const handleRemoveNiche = (id: number) => setMarketNiches(prev => prev.filter(niche => niche.id !== id));
    const handleNicheChange = (id: number, field: keyof Omit<MarketNiche, 'id' | 'channels'>, value: string) => {
        setMarketNiches(prev => prev.map(niche => niche.id === id ? { ...niche, [field]: value } : niche));
    };

    const handleChannelChange = (nicheId: number, channelIndex: number, field: keyof NicheChannel, value: string) => {
        setMarketNiches(prev => prev.map(niche => {
            if (niche.id === nicheId) {
                const newChannels = [...niche.channels];
                newChannels[channelIndex] = { ...newChannels[channelIndex], [field]: value };
                return { ...niche, channels: newChannels };
            }
            return niche;
        }));
    };
    
    const handleAddChannel = (nicheId: number) => {
        setMarketNiches(prev => prev.map(niche => {
            if (niche.id === nicheId) {
                const newChannels = [...niche.channels, { name: '', subscribers: '', url: '' }];
                return { ...niche, channels: newChannels };
            }
            return niche;
        }));
    };
    
    const handleRemoveChannel = (nicheId: number, channelIndex: number) => {
         setMarketNiches(prev => prev.map(niche => {
            if (niche.id === nicheId) {
                const newChannels = niche.channels.filter((_, i) => i !== channelIndex);
                return { ...niche, channels: newChannels };
            }
            return niche;
        }));
    };

    const handlePlatformItemChange = (key: keyof PlatformStructureInfo, index: number, field: 'term' | 'description', value: string) => {
        setEditablePlatform(prev => {
            if (!prev) return null;
            const list = prev[key];
            const newList = list.map((item, i) => {
                if (i === index) {
                    return { ...item, [field]: value };
                }
                return item;
            });
            return { ...prev, [key]: newList };
        });
    };
    
    // Competitors
    const handleAddCompetitor = () => setCompetitors(prev => [...prev, { id: Date.now(), name: '', url: '', subscriberCount: '', summary: '', mainTopics: '', videoStyles: '' }]);
    const handleRemoveCompetitor = (id: number) => setCompetitors(prev => prev.filter(c => c.id !== id));
    const handleCompetitorInputChange = (id: number, field: keyof Omit<CompetitorData, 'id' | 'insights' | 'isLoading' | 'error'>, value: string) => {
        setCompetitors(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };
    
    // --- AI Query ---
    const handleAiQuery = useCallback(async (type: 'regulations' | 'platform' | 'market') => {
        setIsLoading(prev => ({ ...prev, [type]: true }));
        setError(prev => ({ ...prev, [type]: null }));

        try {
            if (type === 'regulations') {
                if (!regulationQuery) throw new Error("Regulation topic is empty.");
                const result = await getYouTubeRegulationInfo(regulationQuery);
                setEditableRegulations(result);
            } else if (type === 'platform') {
                const result = await getYouTubePlatformInfo();
                setEditablePlatform(result);
            } else if (type === 'market') {
                const topicList = marketTopics.split(',').map(t => t.trim()).filter(t => t);
                if (topicList.length === 0) throw new Error("Market topics are empty.");
                const result = await analyzeYouTubeMarket(topicList);
                setEditableMarket(result);
            }
        } catch (e: any) {
            setError(prev => ({ ...prev, [type]: e.message || `Failed to fetch ${type}.` }));
        } finally {
            setIsLoading(prev => ({ ...prev, [type]: false }));
        }
    }, [regulationQuery, marketTopics]);
    

    // --- Report Generation & Export ---
    const generateReportText = () => {
        let report = `# YouTube Channel Strategy Report\n\n`;
        report += `## Part 1: Initial Research\n\n### Learning Resources: Shopify Apps\n`;
        editableShopifyApps.forEach(app => {
            report += `- **${app.name}**: ${(app.description || []).join(' ')}\n`;
        });
        report += `\n### Market Research Niches\n`;
        marketNiches.forEach((niche, i) => {
            report += `**Niche ${i+1}: ${niche.name || 'N/A'}**\n`;
            report += `- Top Channels:\n`;
            if (niche.channels && niche.channels.length > 0) {
                niche.channels.forEach(ch => {
                    report += `  - ${ch.name} (${ch.subscribers}) - ${ch.url}\n`;
                });
            } else {
                report += `  - N/A\n`;
            }
            report += `- Analysis: ${niche.analysis || 'N/A'}\n\n`;
        });
        report += `### Summary & Gap Analysis:\n${data.summary || 'N/A'}\n\n`;

        report += `## Part 2: YouTube Regulations\n\n`;
        if (editableRegulations) {
            report += `**Summary**: ${editableRegulations.summary}\n\n**Common Violations**:\n`;
            (editableRegulations.commonViolations || []).forEach(v => report += `- ${v}\n`);
        } else {
            report += 'No regulation analysis generated.\n';
        }
        report += `\n**My Summary**:\n${data.regulationsSummary || 'N/A'}\n\n`;
        
        report += `## Part 3: Platform Structure\n\n`;
        if (editablePlatform) {
            report += '### Public Facing Elements\n';
            (editablePlatform.publicFacing || []).forEach(p => report += `- **${p.term}**: ${p.description}\n`);
            report += '\n### Creator Facing Elements\n';
            (editablePlatform.creatorFacing || []).forEach(p => report += `- **${p.term}**: ${p.description}\n`);
            report += '\n### Algorithmic Impact Factors\n';
            (editablePlatform.algorithmicImpact || []).forEach(p => report += `- **${p.term}**: ${p.description}\n`);
        } else {
            report += 'No platform structure analysis generated.\n';
        }
        report += `\n**My Summary**:\n${data.platformSummary || 'N/A'}\n\n`;

        report += `## Part 4: Market Analysis\n\n`;
        if (editableMarket) {
            report += '### Trending Topics\n';
            (editableMarket.trendingTopics || []).forEach(t => report += `- ${t}\n`);
            report += '\n### Emerging Formats\n';
            (editableMarket.emergingFormats || []).forEach(f => report += `- ${f}\n`);
            report += '\n### SWOT Analysis\n';
            report += '- **Strengths**: ' + (editableMarket.swotAnalysis.strengths || []).join(', ') + '\n';
            report += '- **Weaknesses**: ' + (editableMarket.swotAnalysis.weaknesses || []).join(', ') + '\n';
            report += '- **Opportunities**: ' + (editableMarket.swotAnalysis.opportunities || []).join(', ') + '\n';
            report += '- **Threats**: ' + (editableMarket.swotAnalysis.threats || []).join(', ') + '\n';
        } else {
            report += 'No market analysis generated.\n';
        }
        report += `\n**Proposed Direction & Pitch**:\n${data.marketPitch || 'N/A'}\n\n`;

        report += `## Part 5: Competitor Deep-Dive & Niche Pitch\n\n`;
        competitors.forEach((c, i) => {
            report += `### Competitor #${i + 1}: ${c.name || 'N/A'}\n`;
            report += `- URL: ${c.url || 'N/A'}\n`;
            report += `- Subscribers: ${c.subscriberCount || 'N/A'}\n`;
            report += `- Summary: ${c.summary || 'N/A'}\n`;
            report += `- Topics: ${c.mainTopics || 'N/A'}\n`;
            report += `- Styles: ${c.videoStyles || 'N/A'}\n`;
            if (c.insights) {
                report += '- **Strengths**: ' + (c.insights.strengths || []).join(', ') + '\n';
                report += '- **Weaknesses**: ' + (c.insights.weaknesses || []).join(', ') + '\n';
            }
            report += '\n';
        });
        report += `### Final Proposal:\n${data.nicheProposal || 'N/A'}\n\n`;
        
        const currentYear = new Date().getFullYear();
        const copyrightYear = currentYear > 2025 ? `2025-${currentYear}` : '2025';
        const copyrightText = `This document was generated using YT Launchpad. © ${copyrightYear} Developed by MrLuke1618. All rights reserved.`;
        report += `\n---\n${copyrightText}`;

        return report;
    };
    
    const handleExportMd = () => {
        const report = generateReportText();
        const blob = new Blob([report.trim()], { type: 'text/markdown;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'YT-Strategy-Report.md';
        link.click();
    };
    
    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset all progress on this onboarding task? This action cannot be undone.")) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setData(initialData);
            setEditableShopifyApps(initialShopifyApps);
            setMarketNiches(initialMarketNiches);
            setEditableRegulations(null);
            setEditablePlatform(null);
            setEditableMarket(null);
            setRegulationQuery('YouTube Community Guidelines');
            setMarketTopics('Shopify SEO, CRO, Email Marketing');
            setCompetitors(initialCompetitors);
            setError({});
        }
    };

    const handleGenerateNicheData = async (nicheId: number) => {
        const key = `niche-research-${nicheId}`;
        setIsLoading(prev => ({...prev, [key]: true}));
        setError(prev => ({...prev, [key]: null}));

        // Start loading messages
        let step = 0;
        setLoadingMessages(prev => ({ ...prev, [key]: nicheResearchLoadingSteps[step] }));
        const intervalId = window.setInterval(() => {
            step = (step + 1) % nicheResearchLoadingSteps.length;
            setLoadingMessages(prev => ({ ...prev, [key]: nicheResearchLoadingSteps[step] }));
        }, 1800);
        nicheIntervals.current[nicheId] = intervalId;

        try {
            const niche = marketNiches.find(n => n.id === nicheId);
            const existingNiches = marketNiches
                .filter(n => n.id !== nicheId && n.name.trim() !== '')
                .map(n => n.name);
            
            const result = await generateNicheResearch(niche?.name || 'Shopify SEO', existingNiches);
            setMarketNiches(prev => prev.map(n => n.id === nicheId ? {...n, ...result} : n));
        } catch (e: any) {
            setError(prev => ({...prev, [key]: e.message || 'Failed to auto-fill niche.'}));
        } finally {
            setIsLoading(prev => ({...prev, [key]: false}));
            clearInterval(nicheIntervals.current[nicheId]);
            delete nicheIntervals.current[nicheId];
        }
    };

    const handleGenerateSummary = async () => {
        const key = 'summary-generation';
        setLoadingSuggestions(prev => ({ ...prev, summary: true }));
        setError(prev => ({...prev, [key]: null}));
        
        const filledNiches = marketNiches.filter(n => n.name && n.channels && n.analysis);
    
        if (filledNiches.length === 0) {
            const errorMsg = "Please complete at least one niche research card before generating a summary.";
            setError(prev => ({ ...prev, [key]: errorMsg }));
            setLoadingSuggestions(prev => ({ ...prev, summary: false }));
            setTimeout(() => setError(prev => ({ ...prev, [key]: null })), 4000);
            return;
        }
    
        try {
            const result = await generateOnboardingSummary(filledNiches);
            setData(prev => ({ ...prev, summary: result.summary }));
        } catch (e: any) {
            setError(prev => ({ ...prev, [key]: e.message || 'Failed to generate summary.' }));
        } finally {
            setLoadingSuggestions(prev => ({ ...prev, summary: false }));
        }
    };

    const handleGenerateRegulationSummary = async () => {
        if (!editableRegulations) {
            setError(prev => ({ ...prev, regulationsSummary: 'Please generate the expert report first.' }));
            setTimeout(() => setError(prev => ({...prev, regulationsSummary: null})), 3000);
            return;
        }
    
        const key = 'regulationsSummary';
        setLoadingSuggestions(prev => ({ ...prev, [key]: true }));
        setError(prev => ({...prev, [key]: null}));
    
        try {
            const result = await summarizeRegulationReport(editableRegulations);
            setData(prev => ({ ...prev, regulationsSummary: result.summary }));
        } catch (e: any) {
            setError(prev => ({ ...prev, [key]: e.message || 'Failed to generate summary.' }));
        } finally {
            setLoadingSuggestions(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleGenerateCompetitorData = async (competitorId: number) => {
        const key = `competitor-research-${competitorId}`;
        setIsLoading(prev => ({...prev, [key]: true}));
        setError(prev => ({...prev, [key]: null}));
        try {
            const competitor = competitors.find(c => c.id === competitorId);
            if (!competitor || !competitor.name) {
                throw new Error("Please provide a competitor name first.");
            }
            const result = await generateCompetitorProfile(competitor.name, competitor.url);
            setCompetitors(prev => prev.map(c => c.id === competitorId ? {...c, ...result} : c));

        } catch (e: any) {
             setError(prev => ({...prev, [key]: e.message || 'Failed to auto-fill competitor data.'}));
        } finally {
            setIsLoading(prev => ({...prev, [key]: false}));
        }
    };

    // --- Render Helpers ---
    const renderCard = (title: string, description: string, children: React.ReactNode, strategicPurpose?: string) => (
        <div id={title.toLowerCase().replace(/\s+/g, '-')} className="bg-dark-card p-6 rounded-lg border border-dark-border scroll-mt-20">
            <h3 className="text-xl font-bold text-brand-purple-light mb-2">{title}</h3>
            <p className="text-dark-text-secondary mb-6">{description}</p>
            {strategicPurpose && (
                <div className="bg-dark-bg p-4 rounded-lg border border-dark-border/50 text-sm text-dark-text-secondary mb-6 flex items-start gap-3">
                    <LightbulbIcon className="w-5 h-5 text-brand-purple-light flex-shrink-0 mt-0.5" />
                    <div>
                        <strong className="text-dark-text">Strategic Purpose:</strong> {strategicPurpose}
                    </div>
                </div>
            )}
            {children}
        </div>
    );
     const renderAiSection = (title: string, children: React.ReactNode) => (
        <div className="mt-4 bg-dark-bg p-4 rounded-lg border border-dark-border">
            <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
            {children}
        </div>
    );

    const handleAnalyzeSingleCompetitor = async (id: number) => {
        const competitor = competitors.find(c => c.id === id);
        if (!competitor) return;
        setCompetitors(prev => prev.map(c => c.id === id ? { ...c, isLoading: true, error: undefined } : c));
        const competitorAnalysisLoadingSteps = [ "Accessing channel data...", "Analyzing content themes...", "Evaluating strategic positioning...", "Identifying key strengths...", "Pinpointing potential weaknesses...", "Finalizing competitive insights...", ];
        let step = 0;
        setCompetitors(prev => prev.map(c => c.id === id ? { ...c, loadingMessage: competitorAnalysisLoadingSteps[step] } : c));
        const intervalId = window.setInterval(() => { step = (step + 1) % competitorAnalysisLoadingSteps.length; setCompetitors(prev => prev.map(c => c.id === id ? { ...c, loadingMessage: competitorAnalysisLoadingSteps[step] } : c)); }, 1500);
        competitorIntervals.current[id] = intervalId;
        try {
            if (!competitor.name || !competitor.summary || !competitor.subscriberCount || !competitor.mainTopics || !competitor.videoStyles) {
                throw new Error("Please fill out all research fields before analyzing.");
            }
            const insights = await analyzeCompetitorStrengthsWeaknesses(competitor);
            setCompetitors(prev => prev.map(c => c.id === id ? { ...c, insights, isLoading: false } : c));
        } catch (e: any) {
            setCompetitors(prev => prev.map(c => c.id === id ? { ...c, isLoading: false, error: e.message || "Failed to analyze." } : c));
        } finally {
            clearInterval(competitorIntervals.current[id]);
            delete competitorIntervals.current[id];
            setCompetitors(prev => prev.map(c => c.id === id ? { ...c, isLoading: false, loadingMessage: undefined } : c));
        }
    };

    const platformKeys = ['publicFacing', 'creatorFacing', 'algorithmicImpact'] as const;
    const handlePrevPlatform = () => {
        setPlatformCarouselIndex(prev => (prev - 1 + platformKeys.length) % platformKeys.length);
    };
    const handleNextPlatform = () => {
        setPlatformCarouselIndex(prev => (prev + 1) % platformKeys.length);
    };


    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Onboarding Task</h2>
                    <p className="text-dark-text-secondary">Complete all 5 parts to build your channel strategy and export your final report.</p>
                    <p className="text-sm text-dark-text-secondary italic mt-2">Inspired by a challenge from Zelda, who set the original high standards for these strategic tasks.</p>
                </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                        {saveStatus === 'unsaved' && <><div className="w-2 h-2 rounded-full bg-yellow-400"></div><span className="text-yellow-400">Unsaved changes</span></>}
                        {saveStatus === 'saving' && <><div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div><span className="text-blue-400">Saving...</span></>}
                        {saveStatus === 'saved' && <><div className="w-2 h-2 rounded-full bg-green-400"></div><span className="text-green-400">All changes saved</span></>}
                    </div>
                    <button onClick={handleReset} className="p-2 text-dark-text-secondary hover:text-white" title="Reset Progress">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    <button onClick={handleExportMd} className="flex items-center gap-2 bg-dark-border text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">
                        <DownloadIcon /> Export MD
                    </button>
                     <button onClick={onHelpClick} className="bg-brand-purple text-white p-2 rounded-full shadow-lg hover:bg-brand-purple-light transition-colors" aria-label="Help">
                        <QuestionMarkIcon />
                    </button>
                </div>
            </div>
            
             <div className="bg-dark-card p-4 rounded-lg border border-dark-border/50 text-center">
                <p className="text-sm text-dark-text-secondary italic">
                    💡 Tip: All AI-generated content in this task is fully editable. Click on any text to refine the strategy to your needs.
                </p>
            </div>

            <div ref={reportContentRef} className="space-y-8">
                {/* Part 1 */}
                {renderCard("Part 1: Initial Research", "Familiarize yourself with the product ecosystem and conduct initial market research.", (
                    <>
                        <div className="mb-6">
                            <h4 className="font-semibold text-white mb-4">Learning Resources: Shopify Apps</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {editableShopifyApps.map(app => (
                                    <div key={app.name} className="bg-dark-bg p-4 rounded-lg border-dark-border border flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-semibold text-white pr-4">{app.name}</h5>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {app.docs && (
                                                    <a href={app.docs} target="_blank" rel="noopener noreferrer" title="View Docs" className="p-1.5 text-dark-text-secondary hover:text-white transition-colors">
                                                        <LinkIcon className="w-5 h-5" />
                                                    </a>
                                                )}
                                                <button onClick={() => handleStartEditApp(app)} title="Edit App" className="p-1.5 text-dark-text-secondary hover:text-white transition-colors">
                                                    <PencilIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteApp(app.name)} title="Delete App" className="p-1.5 text-dark-text-secondary hover:text-red-400 transition-colors">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-dark-text-secondary flex-grow">
                                            {(app.description || []).map((d, i) => <li key={i}>{d}</li>)}
                                        </ul>
                                    </div>
                                ))}
                                
                            </div>
                            <div className="flex justify-center mt-6">
                                    <button onClick={handleAddApp} className="bg-brand-purple text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center hover:bg-brand-purple-light transition-colors">
                                        <PlusIcon className="w-6 h-6 mr-2" /> Add New App
                                    </button>
                            </div>
                            {editingApp && (
                                <div className="fixed inset-0 bg-black/70 z-20 flex items-center justify-center" onClick={handleCancelEditApp}>
                                    <div className="bg-dark-card p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                                        <h4 className="text-lg font-bold mb-4">{editingApp.name ? 'Edit App' : 'Add New App'}</h4>
                                        <div className="space-y-3">
                                            <input type="text" placeholder="App Name" value={editingApp.name} onChange={e => handleUpdateEditingApp('name', e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2"/>
                                            <textarea placeholder="Description (one per line)" value={(editingApp.description || []).join('\n')} onChange={e => handleUpdateEditingApp('description', e.target.value)} rows={4} className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2"/>
                                            <input type="text" placeholder="Docs URL" value={editingApp.docs || ''} onChange={e => handleUpdateEditingApp('docs', e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2"/>
                                        </div>
                                        <div className="flex justify-end gap-3 mt-4">
                                            <button onClick={handleCancelEditApp} className="bg-dark-border px-4 py-2 rounded-md text-sm">Cancel</button>
                                            <button onClick={handleSaveApp} className="bg-brand-purple px-4 py-2 rounded-md text-sm font-semibold">Save</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-4">Market Research Workspace</h4>
                            <div className="bg-yellow-900/30 border border-yellow-600 text-yellow-300 text-xs p-3 rounded-md flex items-start gap-2 my-4">
                                <ShieldExclamationIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span>
                                    <strong>Data Accuracy Note:</strong> YouTube subscriber counts are sourced from Google Search results and may not be real-time. We recommend manually verifying these numbers for the most accurate data.
                                </span>
                            </div>
                            <div className="space-y-6 mb-6">
                            {marketNiches.map((niche, index) => (
                                <div key={niche.id} className="bg-dark-bg p-4 rounded-lg border border-dark-border/50 relative">
                                    <div className="flex justify-between items-center mb-3">
                                        <h5 className="font-semibold text-brand-purple-light">Niche #{index + 1}</h5>
                                        <button onClick={() => handleRemoveNiche(niche.id)} className="text-dark-text-secondary hover:text-red-400"><TrashIcon /></button>
                                    </div>
                                    <div className="space-y-3">
                                        <input type="text" value={niche.name} onChange={e => handleNicheChange(niche.id, 'name', e.target.value)} placeholder="Enter Niche Name or Idea" className="w-full bg-dark-card border border-dark-border rounded-md px-4 py-2"/>
                                        <div>
                                            <h6 className="text-sm font-semibold text-dark-text-secondary mb-2">Top YouTube Channels</h6>
                                            <div className="space-y-3">
                                                {(niche.channels || []).map((channel, channelIndex) => (
                                                    <div key={channelIndex} className="bg-dark-card p-3 rounded-md border border-dark-border/50 relative">
                                                        <button 
                                                            onClick={() => handleRemoveChannel(niche.id, channelIndex)}
                                                            className="absolute top-2 right-2 text-dark-text-secondary hover:text-red-400"
                                                            title="Remove Channel"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            <input 
                                                                type="text" 
                                                                value={channel.name} 
                                                                onChange={e => handleChannelChange(niche.id, channelIndex, 'name', e.target.value)} 
                                                                placeholder="Channel Name"
                                                                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-1.5 text-sm"
                                                            />
                                                            <input 
                                                                type="text" 
                                                                value={channel.subscribers} 
                                                                onChange={e => handleChannelChange(niche.id, channelIndex, 'subscribers', e.target.value)} 
                                                                placeholder="Subscribers (e.g., 1.2M)"
                                                                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-1.5 text-sm"
                                                            />
                                                            <input 
                                                                type="text" 
                                                                value={channel.url} 
                                                                onChange={e => handleChannelChange(niche.id, channelIndex, 'url', e.target.value)} 
                                                                placeholder="Channel URL"
                                                                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-1.5 text-sm sm:col-span-2"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                                <button 
                                                    onClick={() => handleAddChannel(niche.id)}
                                                    className="text-xs text-brand-purple-light hover:underline"
                                                >
                                                    + Add Channel
                                                </button>
                                            </div>
                                        </div>
                                        <textarea value={niche.analysis} onChange={e => handleNicheChange(niche.id, 'analysis', e.target.value)} placeholder="Your analysis on their content strategy..." className="w-full h-32 bg-dark-card border border-dark-border rounded-md px-4 py-2"/>
                                    </div>
                                    <div className="mt-4 flex justify-center">
                                        <button onClick={() => handleGenerateNicheData(niche.id)} disabled={isLoading[`niche-research-${niche.id}`]} className="bg-brand-purple text-white font-semibold px-4 py-2 rounded-md hover:bg-brand-purple-light transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                            <SparklesIcon className="w-4 h-4" /> {isLoading[`niche-research-${niche.id}`] ? loadingMessages[`niche-research-${niche.id}`] : 'Auto-fill Niche Research with AI'}
                                        </button>
                                    </div>
                                    {error[`niche-research-${niche.id}`] && <p className="text-red-400 text-xs mt-2 text-center">{error[`niche-research-${niche.id}`]}</p>}
                                </div>
                            ))}
                            </div>
                            <button onClick={handleAddNiche} className="text-sm text-brand-purple-light hover:underline">+ Add Another Niche</button>
                            
                            <h4 className="font-semibold text-white mb-2 mt-6">Summary & Gap Analysis</h4>
                            <div className="relative">
                                <textarea name="summary" value={data.summary} onChange={handleDataChange} placeholder="Summarize your data and identify a potential gap..." className="w-full h-32 bg-dark-bg border border-dark-border rounded-md px-4 py-2 pr-28"/>
                                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                    {loadingSuggestions['summary'] && <div className="bg-brand-purple rounded-md px-2 py-1 text-xs text-white animate-pulse">Thinking...</div>}
                                    <button onClick={handleGenerateSummary} disabled={loadingSuggestions['summary']} title="Generate summary from all niches" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50">
                                        {loadingSuggestions['summary'] ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                    </button>
                                </div>
                            </div>
                             {error['summary-generation'] && <p className="text-red-400 text-xs mt-1">{error['summary-generation']}</p>}
                        </div>
                    </>
                ), "To define your market position by understanding the product ecosystem and identifying potential content gaps in the Shopify space.")}

                {/* Part 2 */}
                {renderCard("Part 2: YouTube Regulations", "Use the AI expert to research YouTube's rules and ensure content compliance.", (
                    <>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <select value={regulationQuery} onChange={e => setRegulationQuery(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-md px-4 py-2 flex-grow">
                                <option value="YouTube Community Guidelines">Community Guidelines (Overall)</option>
                                <option value="Copyright">Copyright Policy</option>
                                <option value="Fair Use">Fair Use Policy</option>
                                <option value="YouTube Partner Program policies">Monetization Policies</option>
                                <option value="Spam, deceptive practices, and scams policies">Spam & Deceptive Practices</option>
                                <option value="Nudity and sexual content policies">Nudity & Sexual Content</option>
                                <option value="Child safety policies">Child Safety</option>
                                <option value="Hate speech policy">Hate Speech</option>
                                <option value="Harassment and cyberbullying policies">Harassment & Cyberbullying</option>
                                <option value="Harmful or dangerous content policies">Harmful or Dangerous Content</option>
                                <option value="Misinformation policies">Misinformation</option>
                            </select>
                            <button onClick={() => handleAiQuery('regulations')} disabled={isLoading.regulations} className="bg-brand-purple text-white font-semibold px-4 py-2 rounded-md hover:bg-brand-purple-light transition-colors whitespace-nowrap">{isLoading.regulations ? 'Analyzing...': 'Ask Expert'}</button>
                        </div>
                        {error.regulations && <p className="text-red-400 mt-2 text-sm">{error.regulations}</p>}
                        
                        {isLoading.regulations && <div className="text-center py-6 mt-4 bg-dark-bg rounded-lg border border-dark-border"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto"></div><p className="mt-3 text-dark-text-secondary text-sm">{loadingMessages.regulations}</p></div>}
                        {!isLoading.regulations && editableRegulations && renderAiSection("Expert Report", (
                        <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-bold text-brand-purple-light mb-1">Summary</h4>
                                    <textarea value={editableRegulations.summary} onChange={e => setEditableRegulations(p => p ? {...p, summary: e.target.value} : null)} className="w-full bg-dark-bg/50 border border-dark-border rounded-md px-3 py-2 text-dark-text-secondary resize-y" rows={8}/>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-brand-purple-light mb-2">Common Violations</h4>
                                    <div className="space-y-2">
                                        {(editableRegulations.commonViolations || []).map((violation, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <textarea value={violation} onChange={e => {
                                                    const newValue = e.target.value;
                                                    setEditableRegulations(prev => {
                                                        if (!prev) return null;
                                                        const newViolations = [...(prev.commonViolations || [])];
                                                        newViolations[i] = newValue;
                                                        return { ...prev, commonViolations: newViolations };
                                                    });
                                                }} className="flex-grow bg-dark-bg/50 border border-dark-border rounded-md px-3 py-2 text-dark-text-secondary text-sm resize-y" rows={3}/>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {editableRegulations.officialLink && (
                                    <div className="pt-4 border-t border-dark-border/50">
                                        <h4 className="text-lg font-bold text-brand-purple-light mb-1">Official Resource</h4>
                                        <a 
                                            href={editableRegulations.officialLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center gap-2 text-sm text-brand-purple-light hover:underline bg-dark-bg/50 px-3 py-2 rounded-md border border-dark-border hover:border-brand-purple-light transition-colors"
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                            Read the official policy on YouTube
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                        <h4 className="font-semibold text-white mb-2 mt-6">My Summary Report</h4>
                        <div className="relative">
                            <textarea name="regulationsSummary" value={data.regulationsSummary} onChange={handleDataChange} placeholder="Synthesize the key points in your own words..." className="w-full h-32 bg-dark-bg border border-dark-border rounded-md px-4 py-2 pr-28"/>
                            <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                {loadingSuggestions.regulationsSummary && <div className="bg-brand-purple rounded-md px-2 py-1 text-xs text-white animate-pulse">Thinking...</div>}
                                <button onClick={handleGenerateRegulationSummary} disabled={loadingSuggestions.regulationsSummary} title="Suggest summary from expert report" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50">
                                    {loadingSuggestions.regulationsSummary ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                </button>
                            </div>
                        </div>
                        {error.regulationsSummary && <p className="text-red-400 text-xs mt-1">{error.regulationsSummary}</p>}
                    </>
                ), "To build a sustainable channel by understanding and complying with platform rules, avoiding costly mistakes and strikes.")}

                {/* Part 3 */}
                {renderCard("Part 3: Platform Structure", "Understand the platform to optimize for viewer experience and channel performance.", (
                    <>
                        {isLoading.platform && (
                            <div className="text-center py-6 mt-4 bg-dark-bg rounded-lg border border-dark-border">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto"></div>
                                <p className="mt-3 text-dark-text-secondary text-sm">Analyzing platform structure...</p>
                            </div>
                        )}
                        
                        {!isLoading.platform && error.platform && <p className="text-red-400 mt-2 text-sm">{error.platform}</p>}

                        {!isLoading.platform && !editablePlatform && (
                            <div className="text-center p-6 bg-dark-bg rounded-lg border border-dark-border">
                                <CogIcon className="h-12 w-12 mx-auto text-dark-text-secondary mb-4" />
                                <h4 className="text-lg font-semibold text-white">Unlock Platform Insights</h4>
                                <p className="text-dark-text-secondary mb-4 max-w-md mx-auto">Get an AI-powered breakdown of YouTube's public, creator, and algorithmic elements to inform your strategy.</p>
                                <button 
                                    onClick={() => handleAiQuery('platform')}
                                    className="bg-brand-purple text-white font-semibold px-6 py-2 rounded-md hover:bg-brand-purple-light transition-colors"
                                >
                                    Analyze Platform Structure
                                </button>
                            </div>
                        )}

                        {!isLoading.platform && editablePlatform && renderAiSection("Expert Analysis", (
                            <div className="relative">
                                <div className="overflow-hidden">
                                    <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${platformCarouselIndex * 100}%)` }}>
                                        {platformKeys.map((key) => (
                                            <div key={key} className="w-full flex-shrink-0 px-1">
                                                <div className="bg-dark-bg/50 p-4 rounded-lg min-h-[500px]">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        {key === 'publicFacing' ? <EyeIcon className="h-5 w-5 text-brand-purple-light" /> : key === 'creatorFacing' ? <CogIcon className="h-5 w-5 text-brand-purple-light" /> : <TrendingUpIcon className="h-5 w-5 text-brand-purple-light" />}
                                                        <h5 className="font-semibold text-brand-purple-light"><ExplainableTerm term={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} /></h5>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(editablePlatform[key] || []).map((item, i) => (
                                                            <div key={i} className="space-y-1 p-2 border-b border-dark-border/50 last:border-b-0">
                                                                <input type="text" value={item.term} onChange={e => handlePlatformItemChange(key, i, 'term', e.target.value)} className="w-full bg-transparent font-semibold text-brand-purple-light p-1 rounded-md focus:bg-dark-bg"/>
                                                                <textarea value={item.description} onChange={e => handlePlatformItemChange(key, i, 'description', e.target.value)} rows={5} className="w-full bg-transparent p-1 rounded-md focus:bg-dark-bg text-dark-text-secondary text-xs"/>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {platformKeys.length > 1 && (
                                    <>
                                        <button onClick={handlePrevPlatform} className="absolute top-1/2 -left-4 md:-left-8 transform -translate-y-1/2 z-10 p-2 rounded-full bg-dark-card border border-dark-border hover:bg-dark-border text-dark-text-secondary hover:text-white transition-colors">
                                            <ArrowLeftIcon className="w-6 h-6" />
                                        </button>
                                        <button onClick={handleNextPlatform} className="absolute top-1/2 -right-4 md:-right-8 transform -translate-y-1/2 z-10 p-2 rounded-full bg-dark-card border border-dark-border hover:bg-dark-border text-dark-text-secondary hover:text-white transition-colors">
                                            <ArrowRightIcon className="w-6 h-6" />
                                        </button>
                                    </>
                                )}
                                <div className="flex justify-center gap-2 mt-4">
                                    {platformKeys.map((_, index) => (
                                        <button key={index} onClick={() => setPlatformCarouselIndex(index)} className={`w-2.5 h-2.5 rounded-full transition-colors ${platformCarouselIndex === index ? 'bg-brand-purple' : 'bg-dark-border hover:bg-dark-border/70'}`} />
                                    ))}
                                </div>
                            </div>
                        ))}
                        <h4 className="font-semibold text-white mb-2 mt-6">My Summary Report</h4>
                        <div className="relative">
                            <textarea name="platformSummary" value={data.platformSummary} onChange={handleDataChange} placeholder="Document your insights on visibility and priorities..." className="w-full h-32 bg-dark-bg border border-dark-border rounded-md px-4 py-2 pr-28"/>
                             <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                {loadingSuggestions.platformSummary && <div className="bg-brand-purple rounded-md px-2 py-1 text-xs text-white animate-pulse">Thinking...</div>}
                                <button onClick={() => handleSuggest('platformSummary', 'My Platform Summary', data.platformSummary, 'A summary of the key takeaways about YouTube\'s platform structure.')} disabled={loadingSuggestions.platformSummary} title="Suggest summary" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50">
                                    {loadingSuggestions.platformSummary ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                </button>
                            </div>
                        </div>
                    </>
                ), "To create content that succeeds by understanding how YouTube's public, creator, and algorithmic elements work together.")}

                {/* Part 4 */}
                {renderCard("Part 4: Market Analysis", "Analyze the landscape for SEO-related content to identify trends and opportunities.", (
                    <>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-grow">
                                <input type="text" value={marketTopics} onChange={e => setMarketTopics(e.target.value)} placeholder="Enter market topics, comma-separated" className="w-full bg-dark-bg border border-dark-border rounded-md px-4 py-2 pr-28" />
                                <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center gap-2">
                                    {loadingSuggestions['market-topics'] && <div className="bg-brand-purple rounded-md px-2 py-1 text-xs text-white animate-pulse">Thinking...</div>}
                                    <button onClick={() => handleSuggest('market-topics', 'Market Topics', marketTopics, 'A comma-separated list of topics for YouTube market analysis.')} disabled={loadingSuggestions['market-topics']} title="Suggest topics" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50">
                                        {loadingSuggestions['market-topics'] ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => handleAiQuery('market')} disabled={isLoading.market} className="bg-brand-purple text-white font-semibold px-4 py-2 rounded-md hover:bg-brand-purple-light transition-colors">{isLoading.market ? 'Analyzing...': 'Analyze'}</button>
                        </div>
                        {error.market && <p className="text-red-400 mt-2 text-sm">{error.market}</p>}
                        {isLoading.market && <div className="text-center py-6 mt-4 bg-dark-bg rounded-lg border border-dark-border"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto"></div><p className="mt-3 text-dark-text-secondary text-sm">{loadingMessages.market}</p></div>}
                        {!isLoading.market && editableMarket && renderAiSection("Market Landscape Analysis", (
                            <div className="space-y-6 text-sm">
                                <div>
                                    <h5 className="font-semibold text-brand-purple-light mb-2 flex items-center gap-2"><TrendingUpIcon className="w-5 h-5" /> Trending Topics</h5>
                                    <div className="bg-dark-bg/50 p-3 rounded-lg">
                                        <ul className="space-y-2 mt-2 text-sm text-dark-text-secondary list-disc list-inside">
                                            {(editableMarket.trendingTopics || []).map((point, index) => {
                                                const parts = point.split(/:(.*)/s);
                                                if (parts.length > 1) {
                                                    const keyPoint = parts[0];
                                                    const description = parts[1].trim();
                                                    return (
                                                        <li key={index}>
                                                            <strong className="text-dark-text">{keyPoint}:</strong> {description}
                                                        </li>
                                                    );
                                                }
                                                return <li key={index}>{point}</li>;
                                            })}
                                        </ul>
                                    </div>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-brand-purple-light mb-2 flex items-center gap-2"><LightbulbIcon className="w-5 h-5" /> Emerging Formats</h5>
                                    <div className="bg-dark-bg/50 p-3 rounded-lg">
                                        <ul className="space-y-2 mt-2 text-sm text-dark-text-secondary list-disc list-inside">
                                            {(editableMarket.emergingFormats || []).map((point, index) => {
                                                const parts = point.split(/:(.*)/s);
                                                if (parts.length > 1) {
                                                    const keyPoint = parts[0];
                                                    const description = parts[1].trim();
                                                    return (
                                                        <li key={index}>
                                                            <strong className="text-dark-text">{keyPoint}:</strong> {description}
                                                        </li>
                                                    );
                                                }
                                                return <li key={index}>{point}</li>;
                                            })}
                                        </ul>
                                    </div>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-brand-purple-light mb-2">SWOT Analysis</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(['strengths', 'weaknesses', 'opportunities', 'threats'] as const).map(key => (
                                            <div key={key} className="bg-dark-bg/50 p-3 rounded-lg">
                                                <h6 className={`font-semibold mb-1 flex items-center gap-2 ${ key === 'strengths' ? 'text-green-400' : key === 'weaknesses' ? 'text-red-400' : key === 'opportunities' ? 'text-blue-400' : 'text-yellow-400' }`}>
                                                    {key === 'strengths' ? <CheckCircleIcon /> : key === 'weaknesses' ? <XCircleIcon /> : key === 'opportunities' ? <EyeIcon /> : <ShieldExclamationIcon />}
                                                    {key.charAt(0).toUpperCase() + key.slice(1)}
                                                </h6>
                                                <ul className="space-y-2 mt-2 text-sm text-dark-text-secondary list-disc list-inside">
                                                    {(editableMarket.swotAnalysis?.[key] || []).map((point, index) => {
                                                        const parts = point.split(/:(.*)/s);
                                                        if (parts.length > 1) {
                                                            const keyPoint = parts[0];
                                                            const description = parts[1].trim();
                                                            return (
                                                                <li key={index}>
                                                                    <strong className="text-dark-text">{keyPoint}:</strong> {description}
                                                                </li>
                                                            );
                                                        }
                                                        return <li key={index}>{point}</li>;
                                                    })}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <h4 className="font-semibold text-white mb-2 mt-6">Proposed Direction & Pitch</h4>
                        <div className="relative">
                            <textarea name="marketPitch" value={data.marketPitch} onChange={handleDataChange} placeholder="Based on the analysis, shortlist 1-2 niches and prepare a pitch..." className="w-full h-32 bg-dark-bg border border-dark-border rounded-md px-4 py-2 pr-28"/>
                             <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                {loadingSuggestions.marketPitch && <div className="bg-brand-purple rounded-md px-2 py-1 text-xs text-white animate-pulse">Thinking...</div>}
                                <button onClick={() => handleSuggest('marketPitch', 'Proposed Direction & Pitch', data.marketPitch, `Based on a market analysis of ${marketTopics}.`)} disabled={loadingSuggestions.marketPitch} title="Suggest pitch" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50">
                                    {loadingSuggestions.marketPitch ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                </button>
                            </div>
                        </div>
                    </>
                ), "To identify a clear strategic direction for the channel by analyzing market trends and your unique position within it.")}
                
                {/* Part 5 */}
                {renderCard("Part 5: Competitor Deep-Dive & Niche Pitch", "Research key competitors to understand their strategies and finalize your own unique value proposition.", (
                    <>
                        <h4 className="font-semibold text-white mb-4">Competitor Research</h4>
                        <div className="bg-yellow-900/30 border border-yellow-600 text-yellow-300 text-xs p-3 rounded-md flex items-start gap-2 my-4">
                            <ShieldExclamationIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>
                                <strong>Data Accuracy Note:</strong> YouTube subscriber counts are sourced from Google Search results and may not be real-time. We recommend manually verifying these numbers for the most accurate data.
                            </span>
                        </div>
                        <div className="space-y-6">
                            {competitors.map((c, index) => (
                                <div key={c.id} className="bg-dark-bg p-4 rounded-lg border border-dark-border/50 relative">
                                    <div className="flex justify-between items-center mb-3">
                                        <h5 className="font-semibold text-brand-purple-light">Competitor #{index + 1}</h5>
                                        <button onClick={() => handleRemoveCompetitor(c.id)} className="text-dark-text-secondary hover:text-red-400"><TrashIcon /></button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <input type="text" value={c.name} onChange={e => handleCompetitorInputChange(c.id, 'name', e.target.value)} placeholder="Channel Name" className="w-full bg-dark-card border border-dark-border rounded-md px-4 py-2"/>
                                        <input type="text" value={c.url} onChange={e => handleCompetitorInputChange(c.id, 'url', e.target.value)} placeholder="Channel URL (Optional)" className="w-full bg-dark-card border border-dark-border rounded-md px-4 py-2"/>
                                        <input type="text" value={c.subscriberCount} onChange={e => handleCompetitorInputChange(c.id, 'subscriberCount', e.target.value)} placeholder="Subscriber Count" className="w-full bg-dark-card border border-dark-border rounded-md px-4 py-2"/>
                                        <textarea value={c.summary} onChange={e => handleCompetitorInputChange(c.id, 'summary', e.target.value)} placeholder="Brief summary of their channel..." className="w-full sm:col-span-2 bg-dark-card border border-dark-border rounded-md px-4 py-2" rows={3}/>
                                        <textarea value={c.mainTopics} onChange={e => handleCompetitorInputChange(c.id, 'mainTopics', e.target.value)} placeholder="Main topics covered (comma-separated)..." className="w-full bg-dark-card border border-dark-border rounded-md px-4 py-2" rows={2}/>
                                        <textarea value={c.videoStyles} onChange={e => handleCompetitorInputChange(c.id, 'videoStyles', e.target.value)} placeholder="Common video styles (comma-separated)..." className="w-full bg-dark-card border border-dark-border rounded-md px-4 py-2" rows={2}/>
                                    </div>
                                    
                                    <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                                        <button onClick={() => handleGenerateCompetitorData(c.id)} disabled={isLoading[`competitor-research-${c.id}`]} className="bg-brand-purple text-white font-semibold px-4 py-2 rounded-md hover:bg-brand-purple-light transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                            <SparklesIcon className="w-4 h-4" /> {isLoading[`competitor-research-${c.id}`] ? 'Auto-filling...' : 'Auto-fill Research'}
                                        </button>
                                        <button onClick={() => handleAnalyzeSingleCompetitor(c.id)} disabled={c.isLoading} className="bg-dark-border text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors flex items-center justify-center">
                                            {c.isLoading ? (c.loadingMessage || 'Analyzing...') : (c.insights ? 'Re-analyze' : 'Analyze Strengths & Weaknesses')}
                                        </button>
                                    </div>

                                    {error[`competitor-research-${c.id}`] && <p className="text-red-400 text-xs mt-2 text-center">{error[`competitor-research-${c.id}`]}</p>}
                                    {c.error && !c.insights && <p className="text-red-400 text-xs mt-2 text-center">{c.error}</p>}
                                    
                                    {c.insights && (
                                        <div className="mt-4 p-3 bg-dark-bg/50 rounded-lg">
                                            <h5 className="font-semibold text-brand-purple-light mb-2">Analysis</h5>
                                            <div className="space-y-2 text-sm">
                                                <div>
                                                    <strong className="text-green-400">Strengths:</strong>
                                                    <ul className="list-disc pl-5 text-dark-text-secondary">
                                                        {(c.insights.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <strong className="text-red-400">Weaknesses:</strong>
                                                    <ul className="list-disc pl-5 text-dark-text-secondary">
                                                        {(c.insights.weaknesses || []).map((w, i) => <li key={i}>{w}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddCompetitor} className="mt-4 text-sm text-brand-purple-light hover:underline">+ Add Another Competitor</button>

                        <h4 className="font-semibold text-white mb-2 mt-6">Final Proposal</h4>
                        <div className="relative">
                            <textarea name="nicheProposal" value={data.nicheProposal} onChange={handleDataChange} placeholder="Based on all research, articulate your final channel proposal and unique value proposition..." className="w-full h-40 bg-dark-bg border border-dark-border rounded-md px-4 py-2 pr-28"/>
                             <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                {loadingSuggestions.nicheProposal && <div className="bg-brand-purple rounded-md px-2 py-1 text-xs text-white animate-pulse">Thinking...</div>}
                                <button onClick={() => handleSuggest('nicheProposal', 'Final Proposal', data.nicheProposal, `Based on all prior market and competitor research.`)} disabled={loadingSuggestions.nicheProposal} title="Suggest proposal" className="p-1 text-dark-text-secondary hover:text-brand-purple-light disabled:opacity-50">
                                    {loadingSuggestions.nicheProposal ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div> : <SparklesIcon className="w-5 h-5"/>}
                                </button>
                            </div>
                        </div>
                    </>
                ), "To finalize your strategic position by identifying gaps in the competitor landscape and articulating your channel's unique value.")}
            </div>
        </div>
    );
};

export default OnboardingTask;