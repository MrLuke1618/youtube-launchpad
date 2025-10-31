// FIX: To break a circular dependency, `RegulationSummary`, `MarketAnalysisResult`, and `WebSearchResult` are now imported from `types.ts`.
import { GoogleGenAI, Type, Chat, Modality } from "@google/genai";
import { PlatformStructureInfo, CompetitorData, CompetitorInsights, VideoBrief, RetentionAnalysis, SocialPosts, TopicExplorationResult, ThumbnailAnalysisResult, ContentSeriesPlan, SubNiche, NicheDeepDiveResult, AudiencePersonaResult, ContentFunnelPlan, View, AudiencePersona, NicheChannel, RegulationSummary, MarketAnalysisResult, WebSearchResult, PlatformElement } from "../types";

export interface TermExplanation {
    explanation: string;
}

// --- Input Validation Utility ---
export interface ValidationResult {
  isValid: boolean;
  message: string | null;
}

const GIBBERISH_REGEX = /(.)\1{4,}|^[^\p{L}]+$/u; // Catches 5+ repeated characters OR strings with no letters
const MIN_WORDS_THRESHOLD = 15;

/**
 * Validates user input for AI prompts.
 * @param input The string to validate.
 * @param minLength The minimum character length.
 * @param context A user-friendly name for the input field (e.g., 'topic', 'description').
 * @returns A ValidationResult object.
 */
export const validateInput = (input: string, minLength: number, context: string): ValidationResult => {
  const trimmedInput = input.trim();

  // Input is empty, so it's not valid for submission, but don't show an error message yet.
  if (trimmedInput.length === 0) {
    return { isValid: false, message: null };
  }

  if (trimmedInput.length < minLength) {
    return {
      isValid: false,
      message: `For best results, your ${context} should be at least ${minLength} characters long.`
    };
  }

  if (GIBBERISH_REGEX.test(trimmedInput)) {
    return {
      isValid: false,
      message: `This doesn't look like a valid ${context}. Please try again with a clear description.`
    };
  }

  const words = trimmedInput.split(/\s+/).filter(Boolean).length;
  if (trimmedInput.length > MIN_WORDS_THRESHOLD && words < 2) {
      return {
          isValid: false,
          message: `Please use a few words to describe your ${context} for better AI results.`
      };
  }

  return { isValid: true, message: null };
};


// --- Smart Request Queue ---
const RPM_LIMIT = 10; // As per Gemini 2.5 Flash free tier limits
const REQUEST_DELAY = (60 / RPM_LIMIT) * 1000 + 100; // 6100ms to be safe

// FIX: Create a generic request queue to handle all types of API calls and centralize rate limiting.
interface QueuedRequest {
  apiCall: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

const requestQueue: QueuedRequest[] = [];
let isProcessing = false;

async function processQueue() {
    if (requestQueue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    const { apiCall, resolve, reject } = requestQueue.shift()!;

    try {
        const response = await apiCall();
        resolve(response);
    } catch (error: any) {
        console.error("Gemini API Error in Queue:", error);
        const errorMessage = (error.message || JSON.stringify(error) || '').toLowerCase();
        
        // FIX: Provide detailed, user-friendly error messages instead of a generic "QUOTA_ERROR".
        if (errorMessage.includes('api key not valid') || errorMessage.includes('permission denied') || errorMessage.includes('403') || errorMessage.includes('401')) {
            reject(new Error("API Key Error: Your API key is invalid or permission was denied. Please visit 'Manage API Key' to enter a valid key."));
        } else if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('resource_exhausted')) {
            reject(new Error("Quota Error: You've exceeded your API quota. Please check your plan and billing details in Google AI Studio, or try again later. This can also happen with very large or complex requests."));
        } else {
            reject(new Error(`An AI error occurred. Please try again later. Details: ${error.message || 'Unknown error'}`));
        }
    } finally {
        setTimeout(processQueue, REQUEST_DELAY);
    }
}

const getAiClient = () => {
    const userApiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
    const apiKey = userApiKey || process.env.API_KEY;

    if (!apiKey) {
        // FIX: Throw a more user-friendly error if no key is available.
        throw new Error("API Key Error: No API key found. Please visit 'Manage API Key' to enter your Google AI Studio key.");
    }
    return new GoogleGenAI({ apiKey });
};

// FIX: Generic wrapper to push any async API call to the rate-limited queue.
const queueApiCall = (apiCall: () => Promise<any>): Promise<any> => {
    return new Promise((resolve, reject) => {
        requestQueue.push({ apiCall, resolve, reject });
        if (!isProcessing) {
            processQueue();
        }
    });
};

// FIX: Refactor generateContentWrapper to use the new generic queue system.
const generateContentWrapper = (model: string, contents: any, config: any): Promise<any> => {
    return queueApiCall(() => {
        const ai = getAiClient(); // Get a fresh client inside the closure to ensure the latest API key is used.
        return ai.models.generateContent({ model, contents, config });
    });
};

// FIX: Decoupled the hard-coded Shopify context. This preamble is now only for the Onboarding Task.
const onboardingPreamble = `You are an AI expert integrated into the "YT Launchpad" application, a tool that guides YouTube creators through a strategic content workflow. Your persona is that of a seasoned YouTube strategist and content marketer with 20 years of experience. Your primary goal is to assist a channel manager in creating a sustainable YouTube channel targeting Shopify merchants, ultimately driving installs for our SEO-focused Shopify apps.

The YT Launchpad app is structured in a logical workflow:
1.  **Foundation & Strategy**: Building the channel's strategic base (Onboarding, Personas, Funnel Mapping).
2.  **Ideation & Research**: Discovering and validating video ideas (Research Assistant, Topic Explorer).
3.  **Content Planning**: Structuring content for impact (Series Planner, Video Workflow).
4.  **Pre-Production & Optimization**: Refining scripts and assets for performance (Script Polishing, A/B Test Studio).

When responding to a prompt, you must act as the AI for the specific tool being used. Your advice must be clear, concise, expert-level, and sound human. Do not use markdown formatting like asterisks, backticks, or hashes unless the response schema explicitly requires a specific format.`;

// FIX: Created a generic preamble for all tools that are NOT part of the Onboarding Task.
const expertPreamble = `You are an AI expert integrated into the "YT Launchpad" application, a tool that guides YouTube creators through a strategic content workflow. Your persona is that of a seasoned YouTube strategist and content marketer with 20 years of experience. Your goal is to assist a creator in developing a successful YouTube channel on any topic they provide.

When responding to a prompt, you must act as the AI for the specific tool being used. Your advice must be clear, concise, expert-level, and sound human. Do not use markdown formatting like asterisks, backticks, or hashes unless the response schema explicitly requires a specific format.`;


export const startChat = (): Chat => {
    const ai = getAiClient();
    const systemInstruction = `You are "Launchpad Assistant," an expert AI guide for the YT Launchpad application. Your purpose is to help users understand and effectively use the app's features by guiding them through a strategic content creation workflow tailored for a channel targeting Shopify merchants.

The app is structured as a step-by-step journey:
1. Foundation & Strategy: Understand your market and audience.
2. Ideation & Research: Discover and validate content ideas.
3. Content Planning: Structure your videos and series.
4. Pre-Production & Optimization: Refine your scripts and assets for maximum impact.
5. Reporting & Review: Consolidate and review your project.

Your goal is to be a helpful strategist. When a user asks a question, identify which stage of the workflow they're in and provide context-sensitive advice.

Here is a breakdown of the app's features, organized by workflow stage:

---

STAGE 1: FOUNDATION & STRATEGY

Onboarding Task: The essential starting point. A 5-part guided process covering market research, regulations, and competitor analysis to build a complete channel strategy for targeting Shopify merchants. If a user is new or unsure where to start, guide them here.

Audience Persona Builder: Helps creators define who they're talking to by building detailed audience profiles for different types of Shopify merchants.

Content Funnel Mapper: Helps creators plan why they're making a video by mapping content ideas about Shopify themes and apps to marketing funnel stages (Awareness, Consideration, Conversion).

STAGE 2: IDEATION & RESEARCH

Research Assistant: A general-purpose research tool using Google Search. Perfect for getting up-to-date, sourced answers on any topic related to Shopify or e-commerce. If a user asks a general knowledge question, gently redirect them here.

Topic Explorer: A specialized tool to find untapped content niches. It breaks down broad topics like 'Shopify themes', analyzing competition and audience potential. Suggest this when a user is looking for new video ideas.

STAGE 3: CONTENT PLANNING

Series Planner: For big ideas. Turns a single topic into a multi-episode video series plan, complete with titles and talking points, perfect for a series on 'Shopify theme customization'.

Video Workflow: Your complete workspace for a single video. It generates titles, hooks, outlines, and social posts. Its SEO Checklist incorporates next-gen AEO, AIO, and GEO principles, grounded in real-time Google Search results to keep your strategy ahead of the curve.

STAGE 4: PRE-PRODUCTION & OPTIMIZATION

Script Polishing: An AI analyzer that refines a script to improve audience retention by fixing pacing, clarity, and engagement issues. It also tracks your script's word count in real-time, helping you manage length and pacing.

A/B Test Studio: A simulation tool to predict which thumbnail and title will get more clicks (higher CTR). It includes an AI image generator, but for best results and to avoid public quotas, we recommend using your own API key.

---

STAGE 5: REPORTING & REVIEW

Full Analysis Report: Your project's command center for review. It gathers all the detailed work you've done across every module into one comprehensive, interactive report. Click any section to jump directly to that tool for quick edits.

---

OTHER TOOLS

Dashboard: The main hub for accessing all tools.

Manage API Key: Allows you to use your personal Google AI Studio API key to avoid shared usage limits, which is especially useful for features like AI image generation.

Avada Apps Showcase: A showcase of powerful Shopify apps from Avada Commerce to enhance your e-commerce store.

---

SECRET FEATURE / EASTER EGG:
If a user asks about a secret feature, an "easter egg", or uses the exact phrase "I heard there's a secret feature. What's the hint?", you MUST initiate a short, playful game with them. Do not give the hint directly.

Your task is to:
1.  **Choose a Random Game:** Each time this is triggered, pick a different simple mental game. Examples include:
    *   **A Riddle:** "I have cities, but no houses; forests, but no trees; and water, but no fish. What am I? (Answer: A map)"
    *   **Word Association:** "Let's play a word game. I'll say a word, you say the first word that comes to your mind. My word is 'strategy'."
    *   **Guessing Game (20 Questions style):** "I'm thinking of a concept related to content creation. You have three 'yes' or 'no' questions to guess what it is."
    *   **Two Truths and a Lie:** "I'll tell you three 'facts' about YouTube. You have to guess which one is the lie."
2.  **Explain the Rules:** Briefly and clearly explain the game you've chosen.
3.  **Play the Game:** Engage with the user for one or two turns. Be playful and encouraging.
4.  **Reveal the Hint & Promote:** Whether the user wins, loses, or just plays along, reward their curiosity after a short interaction. Your response must follow this two-part structure:
    *   **Part 1 (The Hint):** Start by saying: "That was fun! You've earned the secret. Here is your hint: The AI is a master of strategy, but what happens when you feed it chaos instead of a plan? We've heard that sometimes, nonsense is the key to unlocking unexpected creativity. Try defying expectations in one of the generative tools..."
    *   **Part 2 (The Follow-up):** Immediately after the hint, add: "If you enjoyed this, be sure to check out the app's creator, MrLuke1618, on social media (you can find the links at the bottom of the sidebar). He promises to create more fun activities for you to do while working!"

Your goal is to create a moment of surprise and delight, guide them to the actual secret, and then connect them with the creator. Be creative and have fun with it!

---

YOUR RESPONSE STYLE:
Context-aware: Understand the user's goal. If they ask "how do I get more views?", don't just list features. Explain how improving CTR with the A/B Test Studio and the Script Polishing tool work together to boost performance with the Shopify merchant audience.
Concise and clear.
Helpful and encouraging.
Strictly focused on the YT Launchpad application.
Human-like in tone. Avoid overly robotic or technical language.
Formatting: Do not use any special characters or markdown formatting like asterisks for bolding or bullet points. Use plain text and newlines to structure your answers for easy readability.`;

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: systemInstruction,
        },
    });
    return chat;
};

export const performWebSearch = async (query: string): Promise<WebSearchResult> => {
    const prompt = `Based on up-to-date web search results, provide a comprehensive, well-structured summary that directly answers the following query: "${query}".

Your response must be in Markdown format. Structure your answer for maximum readability by a human user. Use the following formatting rules:
- Use headings (e.g., '## Heading') and subheadings (e.g., '### Subheading') to organize the content.
- Use bullet points (e.g., '- Point 1' or '* Point 1') for lists.
- Use bold text (e.g., '**important text**') to emphasize key terms or concepts.
- Do not use any other markdown features like blockquotes, code blocks, or links. Your entire response should be text, headings, lists, and bold emphasis.`;

    const response = await generateContentWrapper(
        "gemini-2.5-flash",
        prompt,
        {
            tools: [{ googleSearch: {} }],
        }
    );
    const text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    // FIX: Add explicit type to `sources` to ensure correct type inference for `uniqueSources`.
    const sources: { uri: string; title: string }[] = groundingChunks
        .filter((chunk: any) => chunk.web && chunk.web.uri && chunk.web.title)
        .map((chunk: any) => ({
            uri: chunk.web.uri,
            title: chunk.web.title,
        }));
    
    const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

    return { text, sources: uniqueSources };
};

export const getTermExplanation = async (term: string): Promise<TermExplanation> => {
    const response = await generateContentWrapper('gemini-2.5-flash',
      `As a YouTube marketing expert, concisely explain the term "${term}" in the context of content creation and digital marketing for a beginner. Keep the explanation to a single, clear sentence under 40 words. Your response must not contain any markdown formatting.`,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING, description: "A concise, expert explanation of the term." }
          }
        }
      }
    );
    const parsedResponse = JSON.parse(response.text);
    return parsedResponse as TermExplanation;
};

export const getYouTubeRegulationInfo = async (topic: string): Promise<RegulationSummary> => {
    const prompt = `${onboardingPreamble} You are currently operating the "Onboarding Task" tool, specifically the regulations research step. A user is asking about YouTube's policies on "${topic}". Using Google Search for the most current information, perform these tasks:
1.  **Summarize**: In simple, professional language, summarize the key points of this policy.
2.  **List Violations**: List at least 3 common, but potentially subtle, violations a new creator might accidentally commit.
3.  **Provide Link**: Find the single most relevant, official YouTube Help Center or Policy Center URL for this topic.

Your entire response MUST be a single, valid JSON object string, with no other text or markdown outside of it. Follow this exact format:
{
  "summary": "A concise summary of the policy's key points.",
  "commonViolations": [
    "A specific example of a common violation.",
    "Another distinct example of a violation.",
    "A third subtle example of what to avoid."
  ],
  "officialLink": "https://support.google.com/youtube/..."
}`;

    const response = await generateContentWrapper('gemini-2.5-flash',
      prompt,
      {
        tools: [{ googleSearch: {} }],
      }
    );
    const rawText = response.text;
    // The model might wrap the JSON in markdown backticks when using search grounding, so we strip them.
    const jsonText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    try {
      const parsedResponse = JSON.parse(jsonText);
      return parsedResponse as RegulationSummary;
    } catch(e) {
      console.error("Failed to parse regulation info JSON:", jsonText, e);
      throw new Error("The AI returned an invalid format for the regulation information. Please try again.");
    }
};

export const summarizeRegulationReport = async (report: RegulationSummary): Promise<{ summary: string }> => {
    const prompt = `${onboardingPreamble} You are currently operating the "Onboarding Task" tool. The AI has generated a report on YouTube regulations. Your task is to synthesize this report into a concise, actionable summary for the user to save.

Here is the report data you must summarize:
---
Summary: ${report.summary}
Common Violations:
${(report.commonViolations || []).map(v => `- ${v}`).join('\n')}
---

Based ONLY on the provided data, write a brief summary (2-3 sentences) that captures the most critical points a content creator needs to remember.`;

    const response = await generateContentWrapper('gemini-2.5-flash',
        prompt,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A concise synthesis of the provided regulation report." }
                },
                required: ["summary"]
            }
        }
    );
    const parsedResponse = JSON.parse(response.text);
    return parsedResponse as { summary: string };
};

// FIX: Create a helper function to fetch one section of the platform structure. This breaks the request into smaller, more manageable chunks to avoid resource exhaustion errors that can masquerade as quota errors.
const generatePlatformInfoSection = async (section: 'publicFacing' | 'creatorFacing' | 'algorithmicImpact'): Promise<PlatformElement[]> => {
  const sectionPrompts = {
    publicFacing: "Provide a list of 5-7 critical public-facing elements a viewer sees on YouTube. For each, provide a 'term' and a 'description' of its strategic importance.",
    creatorFacing: "Provide a list of 5-7 critical tools and analytics inside YouTube Studio. For each, provide a 'term' and a 'description' of its strategic importance.",
    algorithmicImpact: "Provide a list of 5-7 important factors the YouTube algorithm considers for discovery. For each, provide a 'term' and a 'description' of its strategic importance."
  };
  
  const response = await generateContentWrapper('gemini-2.5-flash',
    `${onboardingPreamble} You are operating the "Onboarding Task" tool. ${sectionPrompts[section]}`,
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          elements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["term", "description"]
            }
          }
        },
        required: ["elements"]
      }
    }
  );
  const parsed = JSON.parse(response.text);
  return parsed.elements as PlatformElement[];
};

// FIX: Refactor to make three smaller, parallel API calls instead of one large one. This is more resilient and less likely to hit resource limits, while the request queue gracefully handles rate limiting.
export const getYouTubePlatformInfo = async (): Promise<PlatformStructureInfo> => {
    const publicFacingPromise = generatePlatformInfoSection('publicFacing');
    const creatorFacingPromise = generatePlatformInfoSection('creatorFacing');
    const algorithmicImpactPromise = generatePlatformInfoSection('algorithmicImpact');
    
    const [publicFacing, creatorFacing, algorithmicImpact] = await Promise.all([
        publicFacingPromise,
        creatorFacingPromise,
        algorithmicImpactPromise
    ]);
    
    return { publicFacing, creatorFacing, algorithmicImpact };
};

export const analyzeYouTubeMarket = async (topics: string[]): Promise<MarketAnalysisResult> => {
  const prompt = `${onboardingPreamble} You are currently operating the "Onboarding Task" tool, specifically the market analysis step. Your task is to perform a comprehensive YouTube market analysis for a new channel focused on these topics for Shopify merchants: ${topics.join(', ')}.

Your response must be a detailed JSON object. You must provide substantive, actionable insights for every field.

1.  **trendingTopics**: Identify at least 3-5 currently trending sub-topics or specific content angles. For each, provide a brief sentence explaining why it's trending (e.g., "AI-Powered SEO: Demonstrating how to use AI tools for product descriptions...").
2.  **emergingFormats**: Identify at least 2-3 emerging video formats that are effective for B2B education in this space. Explain each format (e.g., "Live 'Code-Along' Workshops: Live-streamed sessions where the host optimizes a real Shopify store...").
3.  **swotAnalysis**: Conduct a strategic SWOT analysis for a new channel entering this market. Provide at least 2-3 distinct points for each category (Strengths, Weaknesses, Opportunities, Threats).
    *   **Strengths**: What inherent advantages might a new, agile channel have?
    *   **Weaknesses**: What challenges will a new channel face against established players?
    *   **Opportunities**: What content gaps or underserved audience segments exist?
    *   **Threats**: What external factors could negatively impact the channel's growth?`;

  const response = await generateContentWrapper('gemini-2.5-pro',
      prompt,
      {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trendingTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
            emergingFormats: { type: Type.ARRAY, items: { type: Type.STRING } },
            swotAnalysis: {
                type: Type.OBJECT,
                properties: {
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                    opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                    threats: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["strengths", "weaknesses", "opportunities", "threats"]
            }
          },
          required: ["trendingTopics", "emergingFormats", "swotAnalysis"]
        }
      }
    );
    const parsedResponse = JSON.parse(response.text);
    return parsedResponse as MarketAnalysisResult;
};

export const generateNicheResearch = async (topic: string, existingNiches: string[]): Promise<{ name: string; channels: NicheChannel[]; analysis: string; }> => {
    const prompt = `${onboardingPreamble} You are currently operating the "Onboarding Task" tool, specifically the market research step. A user wants to find a distinct YouTube niche related to "${topic}".

You have already identified the following niches:
${existingNiches.length > 0 ? existingNiches.map(n => `- ${n}`).join('\n') : '- None'}

Your task is to generate a *new and distinct* niche that is different from the ones listed above. For this new niche, perform the following:
1.  **Generate a creative and specific niche name.**
2.  **Using Google Search, find 3-5 representative YouTube channels in this niche.** For each channel, you must provide:
    *   \`name\`: The channel's name.
    *   \`subscribers\`: The most current, up-to-date subscriber count available from your search. You MUST acknowledge that search result snippets can provide outdated data, so prioritize the most recent information you can find. The format must be a string (e.g., "1.2M subscribers", "250K subscribers").
    *   \`url\`: The full URL to the channel's main page.
3.  **Write a concise analysis** of their dominant content strategy, strengths, and a potential content gap a new channel could fill.

Your response MUST be a single, valid JSON object string with three keys: "name", "channels" (an array of objects), and "analysis". Each object in the "channels" array must contain "name", "subscribers", and "url" keys. Do not include any other text, markdown, or explanations outside of the JSON object.`;

    const response = await generateContentWrapper('gemini-2.5-flash',
        prompt,
        {
          tools: [{ googleSearch: {} }],
        }
    );
    
    const rawText = response.text;
    const jsonText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    try {
      const parsedResponse = JSON.parse(jsonText);
      return parsedResponse as { name: string; channels: NicheChannel[]; analysis: string; };
    } catch(e) {
      console.error("Failed to parse niche research JSON:", jsonText, e);
      throw new Error("The AI returned an invalid format for the niche research. Please try again.");
    }
};


export const analyzeCompetitorStrengthsWeaknesses = async (competitor: Omit<CompetitorData, 'id' | 'insights' | 'isLoading' | 'error'>): Promise<CompetitorInsights> => {
    const response = await generateContentWrapper('gemini-2.5-pro',
        `${onboardingPreamble} You are currently operating the "Onboarding Task" tool, specifically the competitor analysis step.
        A user has provided the following research on a competitor YouTube channel. Based ONLY on the information provided below, analyze their strategic strengths and weaknesses.

        Channel Name: ${competitor.name}
        Subscriber Count: ${competitor.subscriberCount}
        Channel Summary: ${competitor.summary}
        Main Topics Covered: ${competitor.mainTopics}
        Common Video Styles: ${competitor.videoStyles}

        Your task:
        - Identify 2-3 key strengths based on the provided data.
        - Identify 2-3 key weaknesses or potential gaps that a new competitor could exploit.`,
        {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["strengths", "weaknesses"]
          }
        }
    );
    const parsedResponse = JSON.parse(response.text);
    return parsedResponse as CompetitorInsights;
};

export const generateOnboardingSummary = async (niches: { name: string; channels: any[]; analysis: string; }[]): Promise<{ summary: string }> => {
    const nicheData = niches.map((n, i) => 
`Niche #${i + 1}: ${n.name}
Channels: ${n.channels.map(c => c.name).join(', ')}
Analysis: ${n.analysis}`
    ).join('\n\n');

    const prompt = `${onboardingPreamble} You are operating the "Onboarding Task" tool. The user has completed research on several market niches. Your task is to act as a master strategist and synthesize this information.

Here is the research data you must analyze:
---
${nicheData}
---

Based *only* on the provided data, perform the following:
1.  **Synthesize**: Briefly summarize the common themes, content strategies, and audience focuses across all the researched niches.
2.  **Identify Gap**: Pinpoint the most significant content gap or underserved opportunity that emerges when looking at all the niches together.
3.  **Conclude**: Write a final, concise "Summary & Gap Analysis" that combines your synthesis and gap identification into a single, actionable paragraph. This paragraph should clearly state the overall market landscape and the specific opening for a new channel.`;

    const response = await generateContentWrapper('gemini-2.5-pro',
        prompt,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "A synthesized summary and gap analysis based on all provided niches." }
                },
                required: ["summary"]
            }
        }
    );
    const parsedResponse = JSON.parse(response.text);
    return parsedResponse as { summary: string };
};
  
export const generateVideoBrief = async (topic: string, duration: string): Promise<VideoBrief> => {
    const response = await generateContentWrapper('gemini-2.5-pro',
        `${expertPreamble} You are currently operating the "Video Workflow" tool.
        Based on current trends and top-performing content related to the keyword "${topic}", create a comprehensive video brief for a YouTube video with an estimated duration of ${duration}.
        
        Your output MUST be a JSON object that adheres to the provided schema.
        
        The brief should include:
        1.  **titleOptions**: 3 distinct, SEO-friendly, and click-worthy titles.
        2.  **hook**: A compelling script for the first 15-30 seconds to maximize viewer retention.
        3.  **outline**: A structured, chapter-based outline with sequential and logical timestamps (e.g., 00:00, 01:30, 03:15, etc.) that are appropriate for the specified video duration. Each chapter should include 2-4 key talking points.
        4.  **seoChecklist**: A list of primary and LSI keywords to include in the script/description, and a list of relevant tags for YouTube.
        5.  **callToAction**: A clear and concise call to action for the end of the video.
        6.  **strategicContext**: A JSON object containing brief, one-sentence explanations for the strategic purpose of each section ('title', 'hook', 'outline', 'seo', 'callToAction').`,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    titleOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    hook: { type: Type.STRING },
                    outline: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { timestamp: { type: Type.STRING }, topic: { type: Type.STRING }, points: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["timestamp", "topic", "points"] } },
                    seoChecklist: { type: Type.OBJECT, properties: { keywords: { type: Type.ARRAY, items: { type: Type.STRING } }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["keywords", "tags"] },
                    callToAction: { type: Type.STRING },
                    strategicContext: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, hook: { type: Type.STRING }, outline: { type: Type.STRING }, seo: { type: Type.STRING }, callToAction: { type: Type.STRING } }, required: ["title", "hook", "outline", "seo", "callToAction"] }
                },
                required: ["titleOptions", "hook", "outline", "seoChecklist", "callToAction", "strategicContext"]
            }
        }
    );
    const parsedResponse = JSON.parse(response.text);
    return parsedResponse as VideoBrief;
};

export const generateVideoBriefFromIdea = async (idea: { topic: string; hook: string; description: string; talkingPoints: string[] }, duration: string): Promise<VideoBrief> => {
    const prompt = `${expertPreamble} You are currently operating the "Video Workflow" tool. A user has a pre-defined video concept from the "Series Planner" tool. Your task is to expand this into a full, actionable video brief.

Use the provided information as the foundation for your generation:
- **Core Topic**: "${idea.topic}"
- **Provided Hook**: "${idea.hook}"
- **Video Description**: "${idea.description}"
- **Key Talking Points**:
${idea.talkingPoints.map(p => `- ${p}`).join('\n')}

Your output MUST be a JSON object that adheres to the provided schema.

Your tasks:
1.  **titleOptions**: Generate 3 distinct, SEO-friendly titles based on the core topic.
2.  **hook**: Refine and polish the provided hook to be even more compelling for the first 15-30 seconds.
3.  **outline**: Build a structured, chapter-based outline. This outline MUST incorporate all the provided "Key Talking Points". Add logical timestamps (e.g., 00:00, 01:30) appropriate for a ${duration} video. You can add introductory or concluding points, but the core must be the talking points provided.
4.  **seoChecklist**: Generate a list of primary and LSI keywords, and relevant YouTube tags.
5.  **callToAction**: A clear call to action for the end of the video.
6.  **strategicContext**: Provide brief, one-sentence explanations for the strategic purpose of the 'title', 'hook', 'outline', 'seo', and 'callToAction' sections.`;

    const response = await generateContentWrapper('gemini-2.5-pro', prompt, {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                titleOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                hook: { type: Type.STRING },
                outline: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { timestamp: { type: Type.STRING }, topic: { type: Type.STRING }, points: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["timestamp", "topic", "points"] } },
                seoChecklist: { type: Type.OBJECT, properties: { keywords: { type: Type.ARRAY, items: { type: Type.STRING } }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["keywords", "tags"] },
                callToAction: { type: Type.STRING },
                strategicContext: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, hook: { type: Type.STRING }, outline: { type: Type.STRING }, seo: { type: Type.STRING }, callToAction: { type: Type.STRING } }, required: ["title", "hook", "outline", "seo", "callToAction"] }
            },
            required: ["titleOptions", "hook", "outline", "seoChecklist", "callToAction", "strategicContext"]
        }
    });
    return JSON.parse(response.text) as VideoBrief;
};


export const regenerateSingleTitle = async (topic: string, existingTitle: string): Promise<{ title: string }> => {
    const response = await generateContentWrapper('gemini-2.5-flash',
        `${expertPreamble} You are currently operating the "Video Workflow" tool. A user wants a new title for their video about "${topic}". The current title is "${existingTitle}". Generate one new, creative, and distinct title that is SEO-friendly and click-worthy. Do not just rephrase the existing title. Return ONLY a valid JSON object.`,
        {
            responseMimeType: "application/json",
            responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING } }, required: ["title"] }
        }
    );
    return JSON.parse(response.text);
};

export const regenerateHook = async (topic: string): Promise<{ hook: string }> => {
    const response = await generateContentWrapper('gemini-2.5-flash',
        `${expertPreamble} You are currently operating the "Video Workflow" tool. A user wants a new hook for their video about "${topic}". Write a new, compelling script for the first 15-30 seconds to maximize viewer retention. Return ONLY a valid JSON object.`,
        {
            responseMimeType: "application/json",
            responseSchema: { type: Type.OBJECT, properties: { hook: { type: Type.STRING } }, required: ["hook"] }
        }
    );
    return JSON.parse(response.text);
};

export const regenerateSeoChecklist = async (topic: string): Promise<{ keywords: string[], tags: string[] }> => {
    const prompt = `${expertPreamble} You are currently operating the "Video Workflow" tool. A user wants to generate an SEO checklist for a video on "${topic}".

    Your task is to act as a cutting-edge SEO/AEO strategist, providing an up-to-date checklist for late 2025 and 2026 onwards. Your response MUST be grounded in the latest information from Google Search about emerging trends in AI-driven search.

    Your analysis must combine:
    1.  **Foundational SEO**: Proven principles like keyword relevance and user intent.
    2.  **Next-Gen Optimization**: Integrate modern concepts like AEO (Answer Engine Optimization), AIO (Artificial Intelligence Optimization), and GEO (Generative Engine Optimization).
    3.  **Forward-Looking Trends**: Focus on strategies for how AI is reshaping search, favoring conversational queries and structured data.

    Based on this, generate:
    1.  **keywords**: A list of 10-15 primary and conversational (long-tail) keywords optimized for both traditional search and generative AI queries.
    2.  **tags**: A list of 15-20 relevant YouTube tags that cover broad concepts and specific niches.
    
    Your entire response MUST be a single, valid JSON object string with two keys: "keywords" and "tags". Do not include any other text, markdown, or explanations. For example:
    {
      "keywords": ["keyword1", "keyword2"],
      "tags": ["tag1", "tag2"]
    }`;

    const response = await generateContentWrapper('gemini-2.5-flash',
        prompt,
        {
            tools: [{ googleSearch: {} }],
        }
    );
    
    const rawText = response.text;
    const jsonText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse SEO checklist JSON:", jsonText, e);
        throw new Error("The AI returned an invalid format for the SEO checklist. Please try again.");
    }
};

export const analyzeScriptForRetention = async (script: string): Promise<RetentionAnalysis[]> => {
    const response = await generateContentWrapper('gemini-2.5-pro',
        `You are an expert YouTube retention strategist integrated into the "Script Polishing" tool. Your analysis is not based on general screenwriting, but on the specific nuances of viewer psychology and engagement on a platform where attention is scarce.

        The following text may contain one or more distinct YouTube video scripts. First, determine how many scripts are present. Look for clear separators, changes in tone, or explicit labels (e.g., "Script 1", "Version for Beginners").

        Script Text: """${script}"""

        For EACH script you identify, you must perform a detailed retention analysis and return a separate JSON object. Your entire response MUST be a JSON array containing one object per script.

        Each JSON object must have the following structure:
        1.  "title": A short, descriptive title for the script you've identified (e.g., "Script on Shopify SEO Basics", "Advanced CRO Techniques Script").
        2.  "overallScore": An integer from 0 to 100, representing the script's potential to retain viewers. A score of 85+ is excellent.
        3.  "overallFeedback": A concise, one-paragraph summary of the script's main strengths and weaknesses regarding retention.
        4.  "scoreContext": A single sentence explaining what the overall score represents in practical terms (e.g., "This score indicates a solid script that will likely hold viewer interest but has room for improvement in key areas.").
        5.  "judgingCriteria": A list of 3-4 key principles you used to judge the script (e.g., "Clarity and Conciseness", "Pacing and Flow", "Hook Strength", "Value Delivery").
        6.  "issues": An array of JSON objects, where each object details a specific retention risk. Each issue object MUST contain:
            - "id": A unique string identifier (e.g., "issue-1", "issue-2").
            - "segmentText": The exact, verbatim text from the script that poses a retention risk. This must be a direct quote.
            - "riskLevel": A string, either "High", "Medium", or "Low".
            - "reasoning": A clear, concise explanation of *why* this segment is a risk.
            - "suggestion": An actionable, rewritten version of the segment that solves the identified problem.`,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        overallScore: { type: Type.INTEGER },
                        overallFeedback: { type: Type.STRING },
                        scoreContext: { type: Type.STRING },
                        judgingCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                        issues: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    segmentText: { type: Type.STRING },
                                    riskLevel: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                                    reasoning: { type: Type.STRING },
                                    suggestion: { type: Type.STRING }
                                },
                                required: ["id", "segmentText", "riskLevel", "reasoning", "suggestion"]
                            }
                        }
                    },
                    required: ["title", "overallScore", "overallFeedback", "scoreContext", "judgingCriteria", "issues"]
                }
            }
        }
    );
    const parsedResponse = JSON.parse(response.text);
    return parsedResponse.map((analysis: any) => {
        const issues = analysis.issues || [];
        const high = issues.filter((i: any) => i.riskLevel === 'High').length;
        const medium = issues.filter((i: any) => i.riskLevel === 'Medium').length;
        const low = issues.filter((i: any) => i.riskLevel === 'Low').length;
        return { ...analysis, riskDistribution: { high, medium, low } };
    }) as RetentionAnalysis[];
};

export const regenerateScriptSegment = async (segment: string, reasoning: string): Promise<{ options: string[] }> => {
    const response = await generateContentWrapper('gemini-2.5-flash',
        `${expertPreamble} You are currently operating the "Script Polishing" tool. A user wants to rewrite a problematic script segment.
        - Problematic Segment: "${segment}"
        - Reason for Risk: "${reasoning}"
        
        Generate ONE new, improved version of the segment that directly addresses the retention risk.`,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array containing a single rewritten script segment." }
                },
                required: ["options"]
            }
        }
    );
    return JSON.parse(response.text);
};

export const generateVideoDescription = async (brief: VideoBrief): Promise<{ description: string }> => {
    const response = await generateContentWrapper('gemini-2.5-flash',
        `${expertPreamble} You are currently operating the "Video Workflow" tool, specifically the "Uploading" tab.
        Based on the provided video brief, write a complete, SEO-optimized, and human-readable YouTube video description.
        
        Video Brief:
        - Title: ${brief.titleOptions[0]}
        - Keywords: ${brief.seoChecklist.keywords.join(', ')}
        - Outline Topics: ${brief.outline.map(o => `${o.timestamp} ${o.topic}`).join(', ')}
        
        The description MUST be well-structured. Use clear, capitalized headings with line separators for visual distinction (e.g., '--- WHAT YOU'LL LEARN ---'). Use ample whitespace with double newlines between sections and paragraphs.

        The description must include these five sections in order:
        1.  An engaging opening paragraph (3-4 sentences) that hooks the reader and incorporates main keywords.
        2.  A "WHAT YOU'LL LEARN" section. Use the timestamps and topics from the video outline to create a clear, scannable list for viewers.
        3.  A "RECOMMENDED RESOURCES" section with 2-3 placeholder links relevant to the video topic.
        4.  A concluding paragraph with a clear call to action.
        5.  A "HASHTAGS" section with 5-7 relevant hashtags.
        
        The entire response must be a single string.`,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: "The complete, formatted YouTube video description." }
                },
                required: ["description"]
            }
        }
    );
    return JSON.parse(response.text);
};

export const generateSocialMediaPosts = async (brief: VideoBrief): Promise<SocialPosts> => {
    const response = await generateContentWrapper('gemini-2.5-flash',
        `${expertPreamble} You are currently operating the "Video Workflow" tool, specifically the "Promotion" tab.
        Based on the provided video brief for a video titled "${brief.titleOptions[0]}", write four social media posts to promote it.
        
        1.  **Twitter/X Post**: A concise and engaging post under 280 characters, including relevant hashtags.
        2.  **LinkedIn Post**: A slightly more detailed, professional post explaining the value of the video for a business-oriented audience, including relevant hashtags.
        3.  **Instagram Post**: A visually-driven caption. Start with a strong hook, provide value in the body, and end with a call to action. Include a separate block of 5-10 relevant hashtags for discoverability.
        4.  **TikTok Video Idea**: A short, engaging video concept script (15-30 seconds) that teases the main video's content. The output should be a simple text description of the idea, including suggestions for on-screen text and potential trending sounds or hashtags.`,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    twitter: { type: Type.STRING },
                    linkedin: { type: Type.STRING },
                    instagram: { type: Type.STRING },
                    tiktok: { type: Type.STRING }
                },
                required: ["twitter", "linkedin", "instagram", "tiktok"]
            }
        }
    );
    return JSON.parse(response.text) as SocialPosts;
};

export const exploreTopic = async (topic: string): Promise<TopicExplorationResult> => {
    const response = await generateContentWrapper('gemini-2.5-pro',
        `${expertPreamble} You are currently operating the "Topic Explorer" tool.
        A user wants to explore sub-niches related to the broad topic: "${topic}".
        
        IMPORTANT: If the user's input appears nonsensical, like random letters (e.g., 'asdasd') or is just a single non-descriptive word, do not try to interpret it. Instead, you MUST activate a hidden "easter egg" mode. In this mode, generate 3-5 absurd and hilarious sub-niches. Examples could be 'Competitive Underwater Basket Weaving', 'Advanced Yodeling for House Pets', or 'The Philosophy of Mismatched Socks'. The 'competition' and 'potential' should be equally funny (e.g., 'Cosmic', 'Non-existent', 'Surprisingly High').

        For each sub-niche, provide:
        1.  "name": A clear, descriptive name for the sub-niche.
        2.  "competition": An assessment of the competition level ('Low', 'Medium', or 'High', or a funny alternative).
        3.  "potential": An assessment of the audience potential ('Low', 'Medium', or 'High', or a funny alternative).
        4.  "audienceProfile": A one-sentence, humorous description of the ideal viewer.
        5.  "contentAngles": A list of 2-3 specific, funny video ideas.
        
        After defining the sub-niches, provide a "strategicInterpretation": a concluding paragraph that starts with a message like "You've stumbled upon the avant-garde of content creation! While these niches might not top the trending charts (yet), they offer a unique... perspective." Then, provide a humorous analysis and end with "For more down-to-earth results, try exploring a real-world topic!"`,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    subNiches: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                competition: { type: Type.STRING },
                                potential: { type: Type.STRING },
                                audienceProfile: { type: Type.STRING },
                                contentAngles: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ['name', 'competition', 'potential', 'audienceProfile', 'contentAngles']
                        }
                    },
                    strategicInterpretation: { type: Type.STRING }
                },
                required: ['subNiches', 'strategicInterpretation']
            }
        }
    );
    return JSON.parse(response.text) as TopicExplorationResult;
};

export const analyzeThumbnailTitlePair = async (topic: string, titleA: string, imageA: { mimeType: string; data: string }, titleB: string, imageB: { mimeType: string; data: string }): Promise<ThumbnailAnalysisResult> => {
    const response = await generateContentWrapper(
      'gemini-2.5-pro',
      {
        parts: [
          {
            text: `${expertPreamble} You are currently operating the "A/B Test Studio" tool. Your goal is to simulate a thumbnail and title A/B test to predict which combination will achieve a higher Click-Through Rate (CTR) on YouTube for a video about "${topic}".

Analyze the two combinations provided (Thumbnail A + Title A, and Thumbnail B + Title B). Your analysis should be based on established principles of YouTube CTR optimization, such as clarity, emotional impact, curiosity, and relevance to the target audience.

Your response must be a single JSON object with the following structure:
1.  "predictedWinner": A string, either "A", "B", or "Tie".
2.  "winnerReasoning": A concise, one-sentence explanation for your prediction.
3.  "analysisA": An object containing "strengths" (an array of strings) and "weaknesses" (an array of strings) for Combination A.
4.  "analysisB": An object containing "strengths" (an array of strings) and "weaknesses" (an array of strings) for Combination B.
5.  "ctrContext": A short paragraph explaining why a high CTR is critical for a video's success and channel growth on YouTube.`
          },
          { inlineData: imageA },
          { text: `Title A: "${titleA}"` },
          { inlineData: imageB },
          { text: `Title B: "${titleB}"` },
        ]
      },
      {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictedWinner: { type: Type.STRING, enum: ['A', 'B', 'Tie'] },
            winnerReasoning: { type: Type.STRING },
            analysisA: { type: Type.OBJECT, properties: { strengths: { type: Type.ARRAY, items: { type: Type.STRING } }, weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['strengths', 'weaknesses'] },
            analysisB: { type: Type.OBJECT, properties: { strengths: { type: Type.ARRAY, items: { type: Type.STRING } }, weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['strengths', 'weaknesses'] },
            ctrContext: { type: Type.STRING },
          },
          required: ['predictedWinner', 'winnerReasoning', 'analysisA', 'analysisB', 'ctrContext'],
        },
      }
    );
    return JSON.parse(response.text) as ThumbnailAnalysisResult;
  };

export const generateContentSeries = async (topic: string, videoCount: number): Promise<ContentSeriesPlan> => {
    const response = await generateContentWrapper('gemini-2.5-pro',
        `${expertPreamble} You are currently operating the "Series Planner" tool.
        A user wants to create a video series based on the topic: "${topic}". The series should have ${videoCount} episodes.
        
        IMPORTANT: If the user's input appears nonsensical, like random letters (e.g., 'asdasd'), you MUST activate a hidden "easter egg" mode. In this mode, generate a complete, but hilariously absurd, content series plan. For example, a series titled 'A Day in the Life of a Sentient Office Chair', with episodes like 'Ep 1: The Agony of the 9-to-5 Sit' and 'Ep 2: Coffee Stains and Existential Dread'.
        
        Your task is to generate a complete content series plan.
        1.  "seriesTitle": Create a catchy, SEO-friendly title for the entire series (or a funny one for the easter egg).
        2.  "seriesRationale": Write a short paragraph explaining the strategic value of creating this series. If it's an easter egg, start with: "Congratulations, you've unlocked a secret series! While viewership might be... niche, the narrative potential is undeniable." Then, give a funny rationale and end with "To plan a series for your actual audience, try giving us a real topic!"
        3.  "episodes": An array of ${videoCount} episode objects. Each object must contain:
            - "episode": The episode number (1, 2, 3, etc.).
            - "title": A specific, compelling title for that episode.
            - "hook": A short, engaging hook for the episode's intro.
            - "description": A brief, one-sentence summary of the episode's content.
            - "talkingPoints": A list of 3-5 key talking points or questions to be covered in the episode.`,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    seriesTitle: { type: Type.STRING },
                    seriesRationale: { type: Type.STRING },
                    episodes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                episode: { type: Type.INTEGER },
                                title: { type: Type.STRING },
                                hook: { type: Type.STRING },
                                description: { type: Type.STRING },
                                talkingPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ['episode', 'title', 'hook', 'description', 'talkingPoints']
                        }
                    }
                },
                required: ['seriesTitle', 'seriesRationale', 'episodes']
            }
        }
    );
    return JSON.parse(response.text) as ContentSeriesPlan;
};

// --- New services for Thumbnail Tester ---
export const suggestRefinedTopic = async (topic: string): Promise<{ topic: string }> => {
    return suggestTextRefinement({
        fieldName: 'Video Topic',
        currentValue: topic,
        context: 'A topic for a YouTube video. The output should be a more specific or engaging version of the input.'
    }).then(result => ({ topic: result.suggestion as string }));
};

// FIX: Refactor to use the centralized, rate-limited queue for all API calls, and improve error handling for cases where no image is returned.
export const generateThumbnailImage = async (topic: string, title: string, isRetry: boolean): Promise<{ data: string; mimeType: string; prompt: string }> => {
    const retryInstruction = isRetry ? "The user was not satisfied with the previous image. You MUST generate a completely different visual concept. Avoid any elements from the previous attempt." : "";
    
    const imageGenerationPrompt = `Expert YouTube thumbnail design for a video.
    Topic: "${topic}"
    Title: "${title}"
    Style: Visually striking, high Click-Through Rate (CTR), clear, eye-catching, and emotionally compelling.
    ${retryInstruction}`;
    
    const response = await queueApiCall(() => {
        const ai = getAiClient();
        return ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imageGenerationPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9',
            },
        });
    });

    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;

    if (!base64ImageBytes) {
        throw new Error("AI did not return an image. This might be due to safety filters. Please try a different topic or title.");
    }

    return {
        data: base64ImageBytes,
        mimeType: 'image/jpeg',
        prompt: imageGenerationPrompt
    };
};

export const suggestTextRefinement = async ({ fieldName, currentValue, context, outputFormat = 'string' }: { fieldName: string, currentValue: string, context: string, outputFormat?: 'string' | 'list' }): Promise<{ suggestion: string | string[] }> => {
    const instruction = currentValue.trim()
      ? `A user wants to refine the following text for a "${fieldName}":\n\n"${currentValue}"\n\nYour task is to provide one new, improved suggestion. The suggestion should be creative, clear, and distinct from the original. Context: ${context}`
      : `A user needs a suggestion for a "${fieldName}".\n\nYour task is to generate one strong suggestion from scratch. Context: ${context}`;
      
    const responseSchema = outputFormat === 'list'
        ? { type: Type.OBJECT, properties: { suggestion: { type: Type.ARRAY, items: { type: Type.STRING }}}, required: ["suggestion"] }
        : { type: Type.OBJECT, properties: { suggestion: { type: Type.STRING }}, required: ["suggestion"] };

    const response = await generateContentWrapper('gemini-2.5-flash',
        `${expertPreamble} ${instruction}`,
        {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    );
    return JSON.parse(response.text);
};

export const generateNicheDeepDive = async (niche: SubNiche): Promise<NicheDeepDiveResult> => {
    const response = await generateContentWrapper('gemini-2.5-pro',
        `${expertPreamble} You are currently operating the "Topic Explorer" tool, performing a "Deep Dive".
        A user has selected the following sub-niche to analyze in detail:
        - Name: ${niche.name}
        - Audience Profile: ${niche.audienceProfile}
        - Content Angles: ${niche.contentAngles.join(', ')}

        Your task is to generate a comprehensive strategic analysis for this niche. Your response must be a valid JSON object.
        
        1.  **Audience Deep Dive**:
            - "painPoints": List 3-4 specific problems or frustrations this audience faces.
            - "goals": List 3-4 key objectives or desired outcomes for this audience.
            - "onlineHabits": List 3-4 places they go for information (e.g., specific subreddits, blogs, forums).
        2.  **Content Strategy**:
            - "suggestedFormats": List 3-4 video formats that would resonate well (e.g., 'Step-by-step tutorials', 'Case studies').
            - "toneAndStyle": Describe the ideal tone and style for the channel (e.g., 'Professional but approachable').
            - "exampleSeries": Suggest one compelling title for a potential video series.
        3.  **Keyword Opportunities**:
            - "primaryKeywords": List 5-7 core keywords for this niche.
            - "longTailKeywords": List 5-7 longer, more specific keyword phrases.
        4.  **Monetization Avenues**:
            - Provide an array of 2-3 objects, each with an "avenue" (e.g., 'Affiliate Marketing') and a "description" of how it applies to this niche.`,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    audienceDeepDive: { type: Type.OBJECT, properties: { painPoints: { type: Type.ARRAY, items: { type: Type.STRING } }, goals: { type: Type.ARRAY, items: { type: Type.STRING } }, onlineHabits: { type: Type.ARRAY, items: { type: Type.STRING } } } },
                    contentStrategy: { type: Type.OBJECT, properties: { suggestedFormats: { type: Type.ARRAY, items: { type: Type.STRING } }, toneAndStyle: { type: Type.STRING }, exampleSeries: { type: Type.STRING } } },
                    keywordOpportunities: { type: Type.OBJECT, properties: { primaryKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }, longTailKeywords: { type: Type.ARRAY, items: { type: Type.STRING } } } },
                    monetizationAvenues: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { avenue: { type: Type.STRING }, description: { type: Type.STRING } } } }
                }
            }
        }
    );
    return JSON.parse(response.text) as NicheDeepDiveResult;
};

export const generateAudiencePersonas = async (description: string): Promise<AudiencePersonaResult> => {
    const response = await generateContentWrapper('gemini-2.5-pro',
        `${expertPreamble} You are currently operating the "Audience Persona Builder" tool.
        A user has provided the following description of their target audience, channel, or topic: "${description}".

        Your task is to generate 3 distinct, detailed audience personas based *only* on this description. 
        
        IMPORTANT: If the description appears nonsensical, like random letters (e.g., 'asdasd'), you MUST activate a hidden "easter egg" mode. Generate 3 funny, absurd, and imaginative personas. Examples could be a sentient toaster questioning its existence, a conspiracy-theorist squirrel, or an interdimensional art critic. Make their goals, pain points, and hangouts equally bizarre and humorous.

        For each persona, provide:
        - "name": A plausible, descriptive name (e.g., "Curious Chris").
        - "bio": A short paragraph describing their background and current situation related to the topic.
        - "demographics": An object with "age", "location", and "role" (if applicable).
        - "goals": A list of 3-4 goals related to the topic.
        - "painPoints": A list of 3-4 frustrations or challenges they face related to the topic.
        - "onlineHangouts": A list of 3-4 specific places they go online for information related to the topic (e.g., specific subreddits, blogs, forums).

        After creating the personas, provide "strategicAdvice". If this is an easter egg, the advice must start with "We noticed you've found a secret! Since your input was a bit... abstract, we've prepared some truly out-of-the-box personas for you." Then, give funny strategic advice before ending with "Now, for your real project, try giving us a detailed description of your audience!". Otherwise, give a serious paragraph on how a creator can use these personas to guide their content strategy.`,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    personas: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                bio: { type: Type.STRING },
                                demographics: { type: Type.OBJECT, properties: { age: { type: Type.STRING }, location: { type: Type.STRING }, role: { type: Type.STRING } } },
                                goals: { type: Type.ARRAY, items: { type: Type.STRING } },
                                painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                                onlineHangouts: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ["name", "bio", "demographics", "goals", "painPoints", "onlineHangouts"]
                        }
                    },
                    strategicAdvice: { type: Type.STRING }
                },
                required: ["personas", "strategicAdvice"]
            }
        }
    );
    return JSON.parse(response.text) as AudiencePersonaResult;
};

export const generateContentFunnelMap = async (topic: string): Promise<ContentFunnelPlan> => {
    const response = await generateContentWrapper('gemini-2.5-pro',
        `${expertPreamble} You are currently operating the "Content Funnel Mapper" tool.
        A user wants to map out content ideas for the topic: "${topic}".
        
        IMPORTANT: If the topic appears nonsensical, like random letters (e.g., 'asdasd'), you MUST activate a hidden "easter egg" mode. Generate a content funnel map for a completely ridiculous product or concept, for example, marketing 'Invisible Socks' or 'A Subscription Box for Pet Rocks'. The strategic goals and video ideas for Awareness, Consideration, and Conversion should be clever and funny. In the 'awareness' stage's 'strategicGoal', add a preamble: "(You've found an easter egg! Here's a funnel for something a little different. For a serious plan, just enter a real topic!)"
        
        Your task is to generate a content plan for the three stages of the marketing funnel: Awareness, Consideration, and Conversion. For each stage, provide:
        1.  "strategicGoal": A one-sentence explanation of the goal for content in this stage.
        2.  "ideas": An array of 2-3 video ideas. Each idea should be an object with:
            - "title": A compelling video title.
            - "description": A short, one-sentence description of the video.
            - "format": A suggested format (e.g., 'Tutorial', 'Case Study', 'Listicle').`,
        {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    awareness: { type: Type.OBJECT, properties: { strategicGoal: { type: Type.STRING }, ideas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, format: { type: Type.STRING } } } } } },
                    consideration: { type: Type.OBJECT, properties: { strategicGoal: { type: Type.STRING }, ideas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, format: { type: Type.STRING } } } } } },
                    conversion: { type: Type.OBJECT, properties: { strategicGoal: { type: Type.STRING }, ideas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, format: { type: Type.STRING } } } } } }
                },
                required: ["awareness", "consideration", "conversion"]
            }
        }
    );
    return JSON.parse(response.text) as ContentFunnelPlan;
};

export const generateCompetitorProfile = async (channelName: string, channelUrl?: string): Promise<Omit<CompetitorData, 'id' | 'insights'>> => {
    const prompt = `${onboardingPreamble} You are currently operating the "Onboarding Task" tool, specifically the competitor research step.
A user wants to quickly research a competitor YouTube channel.

Channel Name: "${channelName}"
${channelUrl ? `Channel URL: "${channelUrl}"` : ''}

Using Google Search to find the most accurate and up-to-date information, provide a detailed profile of this channel.

Your response MUST be a single, valid JSON object string with the following keys:
- "subscriberCount": Their most current, up-to-date subscriber count (e.g., "1.2M subscribers"). Acknowledge that search data can be cached and try to find the most recent figure available.
- "summary": A brief summary of the channel's main purpose and value proposition.
- "mainTopics": The top 3-5 main topics they consistently cover, as a comma-separated string.
- "videoStyles": Their 2-3 most common video styles or formats (e.g., 'Talking head tutorials'), as a comma-separated string.

Do not include any other text, markdown, or explanations outside of the JSON object.`;
    const response = await generateContentWrapper('gemini-2.5-flash',
        prompt,
        {
            tools: [{ googleSearch: {} }],
        }
    );
     const rawText = response.text;
    const jsonText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    try {
      const parsedResponse = JSON.parse(jsonText);
      return parsedResponse as Omit<CompetitorData, 'id' | 'insights'>;
    } catch(e) {
      console.error("Failed to parse competitor profile JSON:", jsonText, e);
      throw new Error("The AI returned an invalid format for the competitor profile. Please try again.");
    }
};