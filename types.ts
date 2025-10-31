export type View = 'dashboard' | 'onboardingTask' | 'videoBrief' | 'scriptAnalyzer' | 'ecosystem' | 'topicExplorer' | 'thumbnailTester' | 'contentSeriesPlanner' | 'researchAssistant' | 'audiencePersonaBuilder' | 'contentFunnelMapper' | 'fullAnalysisReport';

// FIX: Add WorkflowStepKey and WorkflowData types for the Guided Workflow feature.
export type WorkflowStepKey =
  | 'onboardingTask'
  | 'audiencePersonaBuilder'
  | 'contentFunnelMapper'
  | 'topicExplorer'
  | 'researchAssistant'
  | 'contentSeriesPlanner'
  | 'videoBrief'
  | 'scriptAnalyzer'
  | 'thumbnailTester';

export interface WorkflowData {
  onboardingTask?: OnboardingData;
  audiencePersonaBuilder?: AudiencePersonaResult;
  contentFunnelMapper?: ContentFunnelPlan;
  topicExplorer?: {
    selectedNiche: SubNiche | null;
  };
  researchAssistant?: WebSearchResult;
  contentSeriesPlanner?: {
    selectedEpisode: ContentSeriesPlan['episodes'][0];
  };
  videoBrief?: VideoBrief;
  scriptAnalyzer?: RetentionAnalysis;
  thumbnailTester?: ThumbnailAnalysisResult;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ShopifyApp {
  name: string;
  description: string[];
  docs?: string;
}

export interface NicheChannel {
    name: string;
    subscribers: string;
    url: string;
}

export interface MarketNiche {
    id: number;
    name: string;
    channels: NicheChannel[];
    analysis: string;
}

export interface OnboardingData {
  // Task 1
  niche1: string;
  channels1: string;
  analysis1: string;
  niche2: string;
  channels2: string;
  analysis2: string;
  summary: string;
  // Task 2
  regulationsSummary: string;
  // Task 3
  platformSummary: string;
  // Task 4
  marketPitch: string;
  // Task 5
  nicheProposal: string;
}

export interface CompetitorInsights {
  strengths: string[];
  weaknesses: string[];
}

export interface CompetitorData {
    id: number;
    name: string;
    url: string;
    subscriberCount: string;
    summary: string;
    mainTopics: string;
    videoStyles: string;
    insights?: CompetitorInsights;
    isLoading?: boolean;
    error?: string;
    loadingMessage?: string;
}

export interface PlatformElement {
  term: string;
  description: string;
}

export interface PlatformStructureInfo {
  publicFacing: PlatformElement[];
  creatorFacing: PlatformElement[];
  algorithmicImpact: PlatformElement[];
}

export interface VideoOutlineItem {
  id?: string;
  timestamp: string;
  topic: string;
  points: string[];
}

export interface VideoBrief {
  titleOptions: string[];
  hook: string;
  outline: VideoOutlineItem[];
  seoChecklist: {
    keywords: string[];
    tags: string[];
  };
  callToAction: string;
  strategicContext: {
    title: string;
    hook: string;
    outline: string;
    seo: string;
    callToAction: string;
  };
}

export interface RetentionIssue {
  id: string;
  segmentText: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  reasoning: string;
  suggestion: string;
}

export interface RetentionAnalysis {
  title: string;
  overallScore: number;
  overallFeedback: string;
  scoreContext: string;
  judgingCriteria: string[];
  issues: RetentionIssue[];
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface SocialPosts {
    twitter: string;
    linkedin: string;
    instagram: string;
    tiktok: string;
}

export interface SubNiche {
  name: string;
  competition: 'Low' | 'Medium' | 'High';
  potential: 'Low' | 'Medium' | 'High';
  audienceProfile: string;
  contentAngles: string[];
}

export interface TopicExplorationResult {
    subNiches: SubNiche[];
    strategicInterpretation: string;
}

export interface NicheDeepDiveResult {
    audienceDeepDive: {
        painPoints: string[];
        goals: string[];
        onlineHabits: string[];
    };
    contentStrategy: {
        suggestedFormats: string[];
        toneAndStyle: string;
        exampleSeries: string;
    };
    keywordOpportunities: {
        primaryKeywords: string[];
        longTailKeywords: string[];
    };
    monetizationAvenues: {
        avenue: string;
        description: string;
    }[];
}


export interface ThumbnailAnalysisResult {
    predictedWinner: 'A' | 'B' | 'Tie';
    winnerReasoning: string;
    analysisA: {
        strengths: string[];
        weaknesses: string[];
    };
    analysisB: {
        strengths: string[];
        weaknesses: string[];
    };
    ctrContext: string;
}

export interface ContentSeriesPlan {
    seriesTitle: string;
    seriesRationale: string;
    episodes: {
        episode: number;
        title: string;
        hook: string;
        description: string;
        talkingPoints: string[];
    }[];
}

export interface AudiencePersona {
    name: string;
    bio: string;
    demographics: {
        age: string;
        location: string;
        role: string;
    };
    goals: string[];
    painPoints: string[];
    onlineHangouts: string[]; // Online communities, blogs, etc.
}

export interface AudiencePersonaResult {
    personas: AudiencePersona[];
    strategicAdvice: string;
}


export interface FunnelVideoIdea {
    title: string;
    description: string;
    format: string; // e.g., 'Tutorial', 'Case Study', 'Comparison'
}

export interface ContentFunnelPlan {
    awareness: { strategicGoal: string; ideas: FunnelVideoIdea[] };
    consideration: { strategicGoal: string; ideas: FunnelVideoIdea[] };
    conversion: { strategicGoal: string; ideas: FunnelVideoIdea[] };
}

// FIX: Moved these type definitions from `geminiService.ts` to `types.ts` to resolve a circular dependency.
export interface RegulationSummary {
  summary: string;
  commonViolations: string[];
  officialLink: string;
}

export interface MarketAnalysisResult {
  trendingTopics: string[];
  emergingFormats: string[];
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

export interface WebSearchResult {
    text: string;
    sources: {
        uri: string;
        title: string;
    }[];
}
