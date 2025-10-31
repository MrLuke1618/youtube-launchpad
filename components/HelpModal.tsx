import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { startChat } from '../services/geminiService';
import { ChatMessage } from '../types';
import HomeIcon from './icons/HomeIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import SearchIcon from './icons/SearchIcon';
import ViewGridIcon from './icons/ViewGridIcon';
import LightbulbIcon from './icons/LightbulbIcon';
import ChartIcon from './icons/ChartIcon';
import BeakerIcon from './icons/BeakerIcon';
import PuzzleIcon from './icons/PuzzleIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import QuestionMarkIcon from './icons/QuestionMarkIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import GlobeAltIcon from './icons/GlobeAltIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import FunnelIcon from './icons/FunnelIcon';
import SparklesIcon from './icons/SparklesIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import KeyIcon from './icons/KeyIcon';
import AcademicCapIcon from './icons/AcademicCapIcon';
import RobotIcon from './icons/RobotIcon';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DesktopTab = 'guide' | 'deepDive' | 'chat' | 'avadaApps' | 'promptLibrary';
type MobileView = 'main' | 'guide' | 'deepDive' | 'chat' | 'avadaApps' | 'promptLibrary';

const helpSections = [
    {
        icon: <HomeIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Dashboard',
        description: 'Your central hub. Access individual tools, start a new project via the Onboarding Task, or view your Full Analysis Report.'
    },
    {
        icon: <SparklesIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'In-Field AI Assistance',
        description: 'Look for the ✨ sparkle icon inside text fields. This powerful, context-aware button acts as your co-pilot. Click it on an empty field to generate content from scratch, or click it on existing text to refine and improve your work.'
    },
    {
        icon: <ClipboardIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Onboarding Task',
        description: 'The foundational first step. This five-part task walks you through market research and competitor analysis to build a complete channel strategy and understand the strategic purpose behind each research step.'
    },
    {
        icon: <UserCircleIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Audience Persona Builder',
        description: "Develop detailed AI-generated audience personas to deeply understand who you're creating for. Cycle through detailed audience personas one at a time in a focused carousel view. The AI also provides advice on how to apply these personas to your content strategy."
    },
    {
        icon: <FunnelIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Content Funnel Mapper',
        description: 'Strategically plan videos for each stage of the marketing funnel. Map out your content strategy using a focused carousel that presents each funnel stage—Awareness, Consideration, and Conversion—one by one, explaining the strategic goal of each content type.'
    },
    {
        icon: <GlobeAltIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Research Assistant',
        description: 'A powerful, built-in research tool powered by Google Search. Get up-to-date, sourced answers on any topic. Use this to build credibility and establish authority with your audience.'
    },
    {
        icon: <SearchIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Topic Explorer',
        description: 'An AI-powered research tool to uncover hidden content opportunities. Explore sub-niches within a broad topic using an interactive carousel. Analyze competition, potential, and content angles for one idea at a time, with a strategic interpretation to help you analyze the results.'
    },
    {
        icon: <ViewGridIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Series Planner',
        description: 'Turn a single great idea into a binge-worthy video series. Plan a multi-episode series with a master-detail view. Select an episode from the list to see its full details in a focused editor below. The AI also explains the rationale behind creating a series to boost key YouTube metrics.'
    },
    {
        icon: <LightbulbIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Video Workflow',
        description: 'Your complete workspace for a single video. Generate titles, hooks, outlines, and social posts all in one place. The SEO Checklist feature now incorporates next-gen AEO, AIO, and GEO principles, grounded in real-time Google Search results to keep your strategy ahead of the curve.'
    },
    {
        icon: <ChartIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Script Polishing',
        description: 'Refine your script to maximize audience retention. The AI analyzes your text for potential drop-off points and provides actionable suggestions, including the core principles used for judging. It also displays a live word count for both original and updated scripts to help you manage length.'
    },
    {
        icon: <BeakerIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'A/B Test Studio',
        description: "Simulate which title and thumbnail will perform better to maximize your video's click-through rate (CTR). The results explain why CTR is critical for channel growth. Note: AI image generation is resource-intensive; we recommend adding your personal API key to avoid public usage limits."
    },
    {
        icon: <DocumentTextIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Full Analysis Report',
        description: "Your project's single source of truth. It automatically gathers detailed data from every module into one interactive report. Click any section to jump to that tool for quick edits. You can export your entire strategy to PDF, Markdown, or TXT."
    },
    {
        icon: <AcademicCapIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'AI Prompt Library',
        description: 'A curated collection of expert-level prompts to use with the in-field ✨ AI assistants. Get better, more strategic results by learning how to ask the AI for exactly what you need.'
    },
    {
        icon: <KeyIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Manage API Key',
        description: 'To avoid shared usage limits, especially for resource-intensive features like AI image generation, you can use your own Google AI Studio API key. Your key is stored securely in your browser\'s local storage and is never sent to our servers.'
    },
    {
        icon: <PuzzleIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Ecosystem Apps',
        description: 'Explore a suite of powerful, AI-driven apps developed by MrLuke1618 to support your entire content creation workflow.'
    },
    {
        icon: <PuzzleIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'Avada Apps Showcase',
        description: 'A showcase of powerful Shopify apps from Avada Commerce to support your e-commerce journey.'
    },
    {
        icon: <QuestionMarkIcon className="h-6 w-6 text-brand-purple-light" />,
        title: 'A Secret Feature...?',
        description: "The AI is a master of strategy, but what happens when you feed it chaos instead of a plan? We've heard that sometimes, nonsense is the key to unlocking unexpected creativity. Try defying expectations in a generative tool..."
    }
];

const deepDiveStages = [
    {
        stage: "Introduction",
        title: "The Content Creation Lifecycle",
        content: (
            <div className="text-sm text-dark-text-secondary leading-relaxed space-y-4">
                <p>YT Launchpad is a suite of interconnected tools designed to support your content creation process. While each tool is powerful on its own, they follow a logical progression from high-level strategy to final optimization. Think of it as a flexible path, not a rigid one.</p>
                <h2 className="text-white text-xl font-bold pt-4 border-t border-dark-border">A Strategic Walkthrough</h2>
                <p>Use the arrows below to navigate through each stage of the content creation process.</p>
            </div>
        )
    },
    {
        stage: "Stage 1",
        title: "Strategy & Foundation (The \"Why\")",
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-white">Module: <span className="text-brand-purple-light">Onboarding Task</span></h4>
                    <ul className="mt-2 space-y-2 text-sm text-dark-text-secondary">
                        <li><strong className="text-dark-text">Purpose:</strong> To build a solid foundation. The channel description and market pitch you create here can be used as input for subsequent steps.</li>
                    </ul>
                </div>
                 <div className="pt-4 border-t border-dark-border/50">
                    <h4 className="font-semibold text-white">Module: <span className="text-brand-purple-light">Audience Persona Builder</span></h4>
                    <ul className="mt-2 space-y-2 text-sm text-dark-text-secondary">
                        <li><strong className="text-dark-text">Purpose:</strong> To ensure every video speaks directly to your ideal customer, making content more relatable and effective. Use your channel description from the Onboarding task to generate detailed personas.</li>
                    </ul>
                </div>
                <div className="pt-4 border-t border-dark-border/50">
                    <h4 className="font-semibold text-white">Module: <span className="text-brand-purple-light">Content Funnel Mapper</span></h4>
                    <ul className="mt-2 space-y-2 text-sm text-dark-text-secondary">
                        <li><strong className="text-dark-text">Purpose:</strong> To build a strategic content library that guides Shopify merchants from initial discovery to becoming a customer of your apps. Use your core topic from Onboarding to map video ideas across the marketing funnel.</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        stage: "Stage 2",
        title: "Ideation & Research (The \"What\")",
        content: (
             <div className="space-y-4">
                <div >
                    <h4 className="font-semibold text-white">Module: <span className="text-brand-purple-light">Topic Explorer</span></h4>
                    <ul className="mt-2 space-y-2 text-sm text-dark-text-secondary">
                        <li><strong className="text-dark-text">Purpose:</strong> To find underserved content areas with high potential. Take a high-level topic (e.g., from your Funnel Map) and break it down into specific sub-niches, then select the most promising one to proceed.</li>
                    </ul>
                </div>
                <div className="pt-4 border-t border-dark-border/50">
                    <h4 className="font-semibold text-white">Module: <span className="text-brand-purple-light">Research Assistant</span></h4>
                    <ul className="mt-2 space-y-2 text-sm text-dark-text-secondary">
                        <li><strong className="text-dark-text">Purpose:</strong> To validate your idea and gather key information before planning the content. Use your chosen sub-niche topic to get up-to-date information and sources.</li>
                    </ul>
                </div>
            </div>
        )
    },
     {
        stage: "Stage 3",
        title: "Content Structuring (The \"How\")",
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-white">Module: <span className="text-brand-purple-light">Content Series Planner</span></h4>
                    <ul className="mt-2 space-y-2 text-sm text-dark-text-secondary">
                        <li><strong className="text-dark-text">Purpose:</strong> To create binge-worthy content that increases watch time and session duration. Turn your researched topic into a multi-episode series plan, then select one episode to develop into a full video.</li>
                    </ul>
                </div>
                 <div className="pt-4 border-t border-dark-border/50">
                    <h4 className="font-semibold text-white">Module: <span className="text-brand-purple-light">Video Workflow</span></h4>
                    <ul className="mt-2 space-y-2 text-sm text-dark-text-secondary">
                         <li><strong className="text-dark-text">Purpose:</strong> To streamline the entire video creation process from concept to promotion in one unified workspace. Import your selected episode's topic and generate a complete production brief.</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        stage: "Stage 4",
        title: "Pre-Production & Polishing (The \"Refinement\")",
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-white">Module: <span className="text-brand-purple-light">Script Polishing Studio</span></h4>
                    <ul className="mt-2 space-y-2 text-sm text-dark-text-secondary">
                        <li><strong className="text-dark-text">Purpose:</strong> To maximize audience retention, a key metric for the YouTube algorithm. After you write a script based on your Video Brief, use this tool to analyze it for clarity, pacing, and jargon.</li>
                    </ul>
                </div>
                 <div className="pt-4 border-t border-dark-border/50">
                    <h4 className="font-semibold text-white">Module: <span className="text-brand-purple-light">A/B Test Studio</span></h4>
                    <ul className="mt-2 space-y-2 text-sm text-dark-text-secondary">
                         <li><strong className="text-dark-text">Purpose:</strong> To optimize your video's Click-Through Rate (CTR) before you publish, maximizing its initial impact. Simulate which title and thumbnail combination is more likely to attract clicks for your planned video.</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        stage: "Conclusion",
        title: "Your Mission Control",
        content: (
            <div className="text-sm text-dark-text-secondary leading-relaxed space-y-4">
                <p>The <strong className="text-dark-text">Dashboard</strong> serves as your mission control, allowing you to access any individual tool at any time.</p>
                <p>By following this structured journey, you move from a broad idea to a polished, market-aware final product, ready for launch.</p>
                <p className="mt-4 pt-4 border-t border-dark-border/50">
                    <strong className="text-dark-text">Pro-Tip:</strong> At any stage, use the <strong className="text-dark-text">AI Prompt Library</strong> to find expert-crafted prompts. This will help you get even better results from the in-field ✨ AI assistants, supercharging your workflow.
                </p>
            </div>
        )
    }
];

const faqQuestions = [
    // --- Page 1 ---
    // General
    "Where is the best place to start?",
    "How is my work saved in the app?",
    "What does the ✨ sparkle icon do?",
    "Is there a recommended order to use the tools?",
    "Is my data and API key secure?",
    "I heard there's a secret feature. What's the hint?",

    // --- Page 2 ---
    // Onboarding Task
    "What is the goal of the 'Onboarding Task'?",
    "Can I edit the Shopify Apps list in Onboarding?",
    "How does the AI generate competitor profiles in the Onboarding task?",
    "What should I do with the 'Summary & Gap Analysis'?",
    "Can I add more market niches to research?",
    "How do I use the market research to decide on a channel direction?",
    
    // --- Page 3 ---
    // Audience Persona Builder
    "Why are 'Audience Personas' important?",
    "How should I write the audience description for best results?",
    "How many personas does the AI generate?",
    "Can I edit or delete a persona after it's created?",
    "What does 'Online Hangouts' mean for a persona?",
    "How do I apply the 'Strategic Advice' to my content?",

    // --- Page 4 ---
    // Content Funnel Mapper
    "How does the 'Content Funnel Mapper' work?",
    "What's an example of 'Awareness' content?",
    "What's an example of 'Consideration' content?",
    "What's an example of 'Conversion' content?",
    "Can I edit the ideas generated for each funnel stage?",
    "How does this tool help me sell more Shopify apps?",

    // --- Page 5 ---
    // Ideation & Research
    "What's the difference between Topic Explorer and Research Assistant?",
    "How does the AI determine 'Competition' and 'Potential' in Topic Explorer?",
    "What is a 'Deep Dive' in Topic Explorer and how do I use it?",
    "How can the Research Assistant help me find current information?",
    "Are the sources in the Research Assistant reliable?",
    "Can I save or export my research from the Research Assistant?",

    // --- Page 6 ---
    // Content Planning
    "How do I turn a topic into a multi-part video series?",
    "Can I change the number of episodes after generating a series plan?",
    "What's the best way to use the 'Strategic Rationale' in the Series Planner?",
    "How do I turn a single episode into a full video plan?",
    "What is the 'Video Workflow' tool for?",
    "Can I add more sections to the video outline?",
    
    // --- Page 7 ---
    // Pre-Production & Optimization (Part 1)
    "How does 'Script Polishing' improve audience retention?",
    "What does the retention score in Script Polishing mean?",
    "Can I analyze multiple scripts at the same time?",
    "What does 'Risk Level' (High, Medium, Low) mean for an issue?",
    "How do I preview a suggested script change before applying it?",
    "Can I apply all script suggestions at once?",

    // --- Page 8 ---
    // Pre-Production & Optimization (Part 2)
    "How does the 'A/B Test Studio' predict a winner?",
    "Can I upload my own thumbnails for the A/B test?",
    "How does the AI generate thumbnails from a topic?",
    "Can I retry AI thumbnail generation if I don't like the result?",
    "How do I edit the AI's analysis of a thumbnail?",
    "What are the new AEO/AIO/GEO features for SEO in Video Workflow?",

    // --- Page 9 ---
    // Reporting & Exporting
    "What is the 'Full Analysis Report'?",
    "How often is the Full Analysis Report updated?",
    "Can I edit my work from the Full Analysis Report?",
    "Can I export my Full Analysis Report to PDF or other formats?",
    "Can I export my work from individual tools?",
    "How do I find the AI Prompt Library?",

    // --- Page 10 ---
    // App Management & Misc
    "How do I manage my Google AI API Key?",
    "Why should I use my own API key?",
    "Is it safe to enter my API key?",
    "What are the 'Ecosystem Apps'?",
    "What is the 'Avada Apps Showcase'?",
    "How does the auto-save feature work?",
];

const ecosystemAppDataRaw = `Services: 
01. Avada AI SEO Image Optimizer
Improve search visibility with AI SEO Audit, On-Page SEO Optimizer, Page Speed & Image Optimizer
Say goodbye to SEO headaches and rank on Google with Avada powerful SEO optimizer. Run full SEO audit and boost site speed (even on mobile) with image optimizer, lazy load, and minification. Every aspect of on-page SEO: titles, meta tags, keyword research, are in SEO audit powered by ChatGPT. We provide full technical SEO: JSON-LD for SEO, Rich snippets, Robots.txt, 404 page, 301 redirect, FAQ, Sitemap, LCP, H1, Core Web Vitals, LLMs.txt. Track your SEO & score performance with detailed reports

One-click image SEO optimization, image compression, image resizing & ALT text
Page speed booster: Speed optimizer with image compression, lazy, core web vital
SEO audit: Auto apply SEO checklist optimizer for all pages and improve theme
Onpage SEO: Meta title, Blog post, Keyword, Alt text, SEO link build
Technical SEO: Broken link detect, 404 page, Sitemap, Google structured data

Link: https://apps.shopify.com/avada-seo-suite?utm_source=event_shopx_2025&utm_medium=website

02. SEO On: AI Blog Post Builder
Write SEO-friendly AI blog post in a minute and drive organic traffic to your store
Is your blog editor holding you back? Turn your ideas into engaging blog posts that sell with SEO On Blog - simple yet powerful blog builder. With AI blog suggestions, you can write SEO-optimized blog posts faster and more efficiently. Get instant SEO suggests, improve your writing, and see your traffic thrive.

Blog writer: Generate AI SEO articles in multiple languages
SEO optimizer: Get instant suggestions as you write & rank for target keywords
Keyword research: Find the perfect keywords to bring more organic traffic
Blog management: Manage, add, delete and sync blog posts to Shopify blogs
AI generation for blog: Generate outline for SEO blog posts with AI assistant

Link: https://apps.shopify.com/seoon-blog?utm_source=event_shopx_2025&utm_medium=website

03. Avada Boost Sales Trust Badges
This app is a sales solution designed to skyrocket your sales with 8+ features in one.
If you run an e-commerce store, you understand the importance of building urgency and trust to drive sales. That’s where our app comes in. With Avada Boost Sales Trust Badges, you can boost sales and strengthen customer confidence in your store. The app lets you display real-time sales notifications to create urgency and social proof, while trust badges help increase conversion rates by reassuring customers of your store's reliability.
Create multiple trust badges with stunning designs
Turn browsers into buyers by showing recent sales popups
Display Free Shipping Bar notifications to motivate customers to add more items
Fully customizable to match your brand identity

Link: https://apps.shopify.com/avada-boost-sales?utm_source=event_shopx_2025&utm_medium=website

04. AOV.ai: Free Gifts BOGO & BXGY
Sell more, do less with AI-powered gift strategies: Free Gift with Purchase, BOGO, Buy X Get Y
Unlock higher AOV with AI-powered insights that quickly recommend the right campaigns and guide shopper behavior at key moments. Set up multiple promotion types with ease: BOGO (Buy One Get One) & Free Gift with Purchase. Deliver gifts in a smooth experience that keeps shoppers focused. Highlight promotions through multiple widgets so shoppers never miss them. Fully compatible with Shopify discount codes and themes. Built to simplify gifting and unlock more value in every customer journey
Get started faster with AI that recommends the best campaign based on your goal
All the promotion tactics: Free Gift with Purchase, BOGO, Buy X Get Y
Motivate higher spend with milestone rewards, tiered reward box, deal of the day
Advanced rule: Gift limit, Multiplier, Schedule, Checkout upsell (Shopify Plus)
Design every widget to match your brand colors with AI-powered theme matching

Link: https://apps.shopify.com/avada-upsell?utm_source=event_shopx_2025&utm_medium=website

05. AOV Bundles Volume Discounts
Create seamless bundle offers and smart volume discounts that encourage customers to buy more
Sell more in every order with multiple bundle types: smart volume discounts, AI-powered Frequently Bought Together, fixed bundles, or let customers build their own sets. Create personalized offers that feel native to your brand. Build and launch in just a few clicks—no coding required. Monitor what customers respond to, adjust bundles easily, and keep improving results. Need support? We’re available 24/7 to help you. From install to impact, AOV.ai Bundle fits right into how your store sells.
Launch faster with AI-recommended bundle types based on your setup idea
Create bundles your way: fixed sets, mix-and-match, or build-your-own kits
Turn small carts into bigger orders with smart Quantity Breaks
Increase AOV with frequently bought together offers that feel natural
Fully customizable widget designed to match your store’s branding

Link: https://apps.shopify.com/aov-bundle-upsell?utm_source=event_shopx_2025&utm_medium=website

06. AOV.ai Post Purchase Upsell
Sell more, do less: Boost AOV with one-click upsell on Post purchase, Thank you & Order status page
Boost AOV at checkout moments with seamless post-purchase, thank you page, and order status upsells. Offer post purchase offer as one click upsell gifts, discounts, or coupons without re-entering payment details. Set advanced conditions by segments order value to control who sees each offer. Build smart upsell-downsell flows that convert. Test aftersell offers easily, track performance with order summaries, and launch faster with AI-powered templates. Enjoy 24/7 support whenever you need it.
Boost AOV with one-click post purchase upsells and downsells
Create upsell offers instantly, no coding skills required
Personalize targeting by product, cart value, or shipping country
Customize branding to match your store’s unique design
Track performance with built-in real-time analytics

Link: https://apps.shopify.com/aov-post-purchase-upsell?utm_source=event_shopx_2025&utm_medium=website

07. Joy: Loyalty Program & Rewards
Boost repeat sales with loyalty rewards, points, referrals, VIP tiers, membership, and POS
Joy Loyalty Rewards is a powerful customer retention platform. It helps you offer personal reward programs for birthdays, anniversaries, or social shares, and boost CLV with exclusive VIP Tiers and membership perks. Customer loyalty is never interrupted, with over 30 seamless touchpoints: a customizable widget, dedicated loyalty page, and cart & checkout redemption. With a fully customizable platform and 24/7 live chat support, Joy is your partner in sustainable growth.
Points: purchases, subscriptions, birthday rewards, reviews & point bonus events
Reward social actions on Instagram, TikTok, Facebook, and referral program
VIP tiers: exclusive perks like free shipping, free gift or early access
30+ loyalty touchpoints: loyalty page, loyalty account, cart redemption,....
POS fully integrated. Checkout loyalty extension to boost point redemption

Link: https://apps.shopify.com/joyio?utm_source=event_shopx_2025&utm_medium=website

08. Joy Subscriptions App
Subscription app for recurring payment, subscription box, bundle, and abonnement
Joy automates subscriptions, creating subscribe and save widget, subscription box, bundles that increase customer retention. With Joy subscription app, you can manage every detail with ease (subscribers, bundles, and discounts). Offer your customers high-converting subscription widgets, quick checkout links with discounts and varied frequency, making subscribing irresistible. Customer portal provides full control over their subscriptions. Add frequently bought together widget to boost AOV.
Flexible subscriptions → Offer frequency, discounts and payment types
Product bundles → Frequently bought together widget with discounts
Customer portal → Allow subscribers to add, change, pause, and cancel anytime
Subscription box → Give your customers control over box customization
Payment recovery → Decide attempts and delays between retries on failed payments

Link: https://apps.shopify.com/joy-subscription?utm_source=event_shopx_2025&utm_medium=website

09. Chatty AI Chatbot & Live Chat
Shoppers have questions? AI chatbot has answers. Need sales support? Chatty delivers. 24/7 every day
No time to answer customer questions 24/7? Let Chatty AI chatbot handle it with live chat & helpdesk. Powered by advanced AI model, it answers product questions, suggests products, and helps with order tracking - all while you're away. Then, you can manage conversations with your team from all channels in one inbox: WhatsApp, Facebook Messenger, Instagram, Email, and more. Build your FAQs help center for quick customer support, then let customers self-serve forever.
Livechat & AI chatbot: Provide 24/7 support to sell more with AI sales assistant
Inbox & Team: Manage convesations with your team from all channels in one inbox
FAQ page: Create a FAQ helpdesk to empower customers to find answers on their ow
Sales automation: Send proactive targeted messages based on visitor behavior
Mobile app: Keep track with all inbox from your devices anywhere, anytime

Link: https://apps.shopify.com/chatty?utm_source=event_shopx_2025&utm_medium=website

10. Avada GDPR Cookies Consent
Create a Google Certified TCF cookie consent banner for CCPA/GDPR compliance & GCM v2 + 24/7 SUPPORT
Avada GDPR Cookie Consent is the app to help merchants on Shopify gather and manage consent from your EU customers, ensuring you meet all European Cookie Law standards (GDPR/RGPD). It also supports for US State laws CCPA/CPRA, VCDPA, CPA, CTDPA and UCPA for California, Virginia and Colorado, Connecticut and Utah; Brazil (LGPD), Canada (PIPEDA), Japan (APPI). It is compatible with Shopify Customer Privacy, Google Consent Mode v2, GTM, TCF IAB, Checkout Extensibility, Hydrogen and Online Store 2.0
Work with Checkout Extensibility, GCM v2, GTM, GPC, Meta/Tiktok Pixel & Hydrogen
Automatically translates cookies consent banner to match your customer language
Fully customizable for: Style, Region, Behavior, Content for your cookie banner
CCPA/GDPR Privacy Policy Generator and Customer data request
Cookie scanner helps identify and show detail about cookies used on your store

Link: https://apps.shopify.com/avada-cookie-bar?utm_source=event_shopx_2025&utm_medium=website

11. Avada Order Limit Quantity
Order quantity limits on product, collection, cart and customer tag with checkout rules validation
Set quantity rules, order minimums and order maximums based on quantity, value or weight for collection, product, variant, cart. Gain sales revenue by ensuring MOQ of each purchase or from the wholesale customer tag and contact method for quotes. Prevent fraud or bulk purchases, even with repurchase attemption by checkout validation rules. Simply customize settings to suit your brand identity - no code required. Perfect for managing min and max quantity efficiently.
Create MOQ limit quantity for product, variant or collection
Create re-purchase / future limit on total order from each customer
Create limit on order based on product quantity, multiple, total value or weight
Create limit based on wholesaler or customer tags with contact method for quotes
Compatible with Shopify checkout rules validation

Link: https://apps.shopify.com/avada-order-limit?utm_source=event_shopx_2025&utm_medium=website

12. AG Order Printer PDF Invoice
Automatically create & manage PDF invoice with Order Printer, now with B2B wholesale features
Avada PDF Invoice Order Printer simplifies invoice, even for B2B wholesale. Easily manage B2B orders, historical order PDFs, and combine invoices accurately to save time. Automatically generate and send professional VAT invoice, GST-compliant bill, and packing slip in multiple languages and currencies, perfect for global selling. Send automated payment reminders for overdue invoices and accelerate payment collection. Download, print, or email invoices automatically with customizable templates.
B2B Invoice → Company orders, draft orders, combine orders, balance owing
Customizable templates → themes, text, font, color, logo, order information, etc
Automated invoice delivery: Emails with PDF attachments and payment reminders
Multi-currency, taxes & Multi-language → Serve global and cross-border customers
Bulk action → Bulk download and print PDF invoices, packing slips, and quotes

Link: https://apps.shopify.com/avada-pdf-invoice?utm_source=event_shopx_2025&utm_medium=website`;

interface EcosystemApp {
    name: string;
    description: string;
    features: string[];
    link: string;
}

const parseEcosystemApps = (rawText: string): EcosystemApp[] => {
    const apps: EcosystemApp[] = [];
    if (!rawText) return apps;
    const content = rawText.replace(/^Services:\s*/, '').trim();
    const appBlocks = content.split(/\n(?=\d{2}\.)/);
    
    for (const block of appBlocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 3) continue;

        const name = lines[0].replace(/^\d{2}\.\s*/, '').trim();
        const description = lines[1].trim();
        const linkLineIndex = lines.findIndex(l => l.startsWith('Link:'));
        if (linkLineIndex === -1) continue;

        const link = lines[linkLineIndex].replace(/^Link:\s*/, '').trim();
        
        // Features are lines between description (index 1) and link line, excluding empty lines and long paragraphs.
        const features = lines.slice(2, linkLineIndex)
            .map(l => l.trim())
            .filter(l => l && l.length < 150); // Heuristic to filter out long description paragraphs

        apps.push({ name, description, features, link });
    }
    return apps;
};

const ecosystemApps: EcosystemApp[] = parseEcosystemApps(ecosystemAppDataRaw);


const DeepDiveContent: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? deepDiveStages.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLastSlide = currentIndex === deepDiveStages.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    const currentStage = deepDiveStages[currentIndex];

    return (
        <div className="relative">
            <div className="bg-dark-bg p-6 rounded-lg border border-dark-border min-h-[350px] sm:min-h-[300px] flex flex-col justify-center">
                <div key={currentIndex} className="animate-fade-in">
                    <p className="text-sm font-bold uppercase text-brand-purple tracking-wider">{currentStage.stage}</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 mb-4">{currentStage.title}</h3>
                    <div className="text-sm sm:text-base">{currentStage.content}</div>
                </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
                <button 
                    onClick={goToPrevious} 
                    className="p-2 rounded-full text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors"
                    aria-label="Previous stage"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div className="flex gap-2">
                    {deepDiveStages.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${currentIndex === index ? 'bg-brand-purple' : 'bg-dark-border hover:bg-dark-border/70'}`}
                            aria-label={`Go to stage ${index + 1}`}
                        />
                    ))}
                </div>
                <button 
                    onClick={goToNext} 
                    className="p-2 rounded-full text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors"
                    aria-label="Next stage"
                >
                    <ArrowRightIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

const ChatAssistant: React.FC = () => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [faqPage, setFaqPage] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const totalFaqPages = Math.ceil(faqQuestions.length / 6);
    const currentFaqs = faqQuestions.slice(faqPage * 6, (faqPage + 1) * 6);

    useEffect(() => {
        if (!chat) {
            try {
                const newChat = startChat();
                setChat(newChat);
                setMessages([{ role: 'model', content: "Hello! I'm the Launchpad Assistant. How can I help you navigate the app's features today? You can ask me a question directly or use the suggestions below." }]);
            } catch (error) {
                console.error("Failed to start chat session:", error);
                setMessages([{ role: 'model', content: "Sorry, I'm having trouble connecting right now. Please check your API key and try again." }]);
            }
        }
    }, [chat]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSendMessage = async (message: string) => {
        if (!message.trim() || !chat || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: message };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const stream = await chat.sendMessageStream({ message });
            let modelResponse = '';
            setMessages(prev => [...prev, { role: 'model', content: '' }]);
            
            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = modelResponse;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "I encountered an error. Please ensure your API key is valid and has sufficient quota." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(input);
    };
    
    const handleFaqClick = (question: string) => {
        handleSendMessage(question);
    };

    const handleNextFaq = () => setFaqPage(prev => (prev + 1) % totalFaqPages);
    const handlePrevFaq = () => setFaqPage(prev => (prev - 1 + totalFaqPages) % totalFaqPages);

    return (
        <div className="flex flex-col h-full bg-dark-border p-4 rounded-lg border border-dark-border">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-brand-purple text-white' : 'bg-dark-card'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && messages[messages.length - 1].role === 'user' && (
                     <div className="flex justify-start">
                        <div className="max-w-md p-3 rounded-lg bg-dark-card">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="space-y-3 pt-3 border-t border-dark-border">
                <div className="grid grid-cols-2 gap-2">
                    {currentFaqs.map((q, i) => (
                        <button key={i} onClick={() => handleFaqClick(q)} disabled={isLoading} className="text-left text-sm text-dark-text-secondary bg-dark-card p-2 rounded-md transition-all duration-200 disabled:opacity-50 border border-transparent hover:border-brand-purple hover:shadow-lg hover:shadow-brand-purple/40 hover:text-white">
                            {q}
                        </button>
                    ))}
                </div>
                 <div className="flex items-center justify-center gap-4">
                    <button onClick={handlePrevFaq} className="text-dark-text-secondary hover:text-white p-1"><ArrowLeftIcon className="w-5 h-5" /></button>
                    <span className="text-xs font-mono text-dark-text-secondary">{faqPage + 1} / {totalFaqPages}</span>
                    <button onClick={handleNextFaq} className="text-dark-text-secondary hover:text-white p-1"><ArrowRightIcon className="w-5 h-5" /></button>
                </div>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about a feature..."
                    className="flex-1 bg-dark-card border border-dark-border rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-purple"
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !input.trim()} className="bg-brand-purple text-white font-semibold px-6 py-2 rounded-lg hover:bg-brand-purple-light disabled:bg-gray-500">
                    Send
                </button>
            </form>
        </div>
    );
};

const AvadaAppShowcase: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const totalApps = ecosystemApps.length;

    const goToPrevious = () => {
        const isFirst = currentIndex === 0;
        const newIndex = isFirst ? totalApps - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLast = currentIndex === totalApps - 1;
        const newIndex = isLast ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    const currentApp = ecosystemApps[currentIndex];

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                goToPrevious();
            } else if (event.key === 'ArrowRight') {
                goToNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [currentIndex]);

    if (!currentApp) {
        return <div className="text-center text-dark-text-secondary">No apps to display.</div>;
    }

    return (
        <div className="relative">
            <a 
                href={currentApp.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block bg-dark-bg p-6 rounded-lg border border-dark-border min-h-[350px] flex flex-col hover:border-brand-purple-light transition-colors group"
            >
                <div key={currentIndex} className="animate-fade-in flex flex-col h-full">
                    <h3 className="text-xl font-bold text-white mb-2">{currentApp.name}</h3>
                    <p className="text-sm text-dark-text-secondary mb-4">{currentApp.description}</p>
                    <ul className="space-y-2 text-sm text-dark-text list-disc list-inside flex-grow">
                        {currentApp.features.map((feature, index) => (
                            <li key={index}>{feature}</li>
                        ))}
                    </ul>
                    <div className="mt-auto pt-4">
                        <span className="text-brand-purple-light font-semibold text-sm group-hover:underline">
                            View App on Shopify Store &rarr;
                        </span>
                    </div>
                </div>
            </a>
            
            <div className="flex items-center justify-between mt-4">
                <button 
                    onClick={goToPrevious} 
                    className="p-2 rounded-full text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors"
                    aria-label="Previous app"
                >
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <span className="font-mono text-sm text-dark-text-secondary">{currentIndex + 1} / {totalApps}</span>
                <button 
                    onClick={goToNext} 
                    className="p-2 rounded-full text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors"
                    aria-label="Next app"
                >
                    <ArrowRightIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

const promptCategories = [
    {
        category: "Strategy & Audience",
        prompts: [
            { id: 's1', title: "Define a Channel's Value Proposition", prompt: "Act as a YouTube strategist. Based on the following channel description, write a concise and powerful value proposition in a single sentence: [Your channel description here]", purpose: "Clarify your channel's core mission for your 'About' page or marketing materials." },
            { id: 's2', title: "Distill Audience Pain Points", prompt: "From the following audience description, extract and list the 3 most critical pain points this audience faces: [Your audience description here]", purpose: "Focus your content on solving the most important problems your audience has." },
            { id: 's3', title: "Identify Audience 'Jobs to Be Done'", prompt: "Based on this target audience of [audience description], what are the primary 'jobs to be done' they are trying to accomplish? List the top 3 functional and emotional jobs.", purpose: "Understand the underlying motivations of your audience to create more valuable content." },
            { id: 's4', title: "Develop a Content Mission Statement", prompt: "Create a content mission statement for a YouTube channel about [topic]. The statement should follow this template: 'We help [audience] to [achieve outcome] by creating content that is [adjective 1], [adjective 2], and [adjective 3].'", purpose: "Establish a clear, guiding principle for all the content you create." },
            { id: 's5', title: "Analyze Competitor Content Angles", prompt: "Analyze the top 5 videos for the keyword '[keyword]'. What are the common content angles, formats, and what potential content gap is being missed that a new video could fill?", purpose: "Identify opportunities to differentiate your content from top-ranking competitors." },
            { id: 's6', title: "Define Brand Voice and Tone", prompt: "Generate a brand voice and tone guide for a YouTube channel about [topic]. The tone should be [adjective 1, e.g., authoritative], [adjective 2, e.g., approachable], and [adjective 3, e.g., witty]. Provide examples of how to apply this voice.", purpose: "Ensure consistent and memorable communication style across all your videos." },
            { id: 's7', title: "Brainstorm Content Pillars", prompt: "Based on the core topic of '[main topic]', generate 3-5 content pillars (sub-topics) that can be used to structure a long-term content strategy. For each pillar, suggest one example video title.", purpose: "Create a structured and sustainable content plan that builds authority." },
            { id: 's8', title: "Develop a Unique Selling Proposition (USP)", prompt: "Given these competitor channels [list of competitors], what is a unique selling proposition (USP) for a new channel about [topic]? Frame it as 'We are the only channel that...'", purpose: "Clearly define what makes your channel different and better than the competition." },
            { id: 's9', title: "Map Audience Segments", prompt: "For an audience interested in [topic], identify three distinct segments (e.g., Beginner, Intermediate, Expert). For each segment, what is their primary goal and biggest challenge?", purpose: "Tailor content to meet the specific needs of different viewer groups within your audience." },
            { id: 's10', title: "Conduct a Pre-Mortem Analysis", prompt: "Imagine we are launching a new video series about '[topic]' and it fails to meet its goals. What are the top 5 most likely reasons for its failure? For each reason, suggest a preventative action we can take now.", purpose: "Proactively identify and mitigate potential risks before you invest time and resources." },
        ]
    },
    {
        category: "Ideation & Titling",
        prompts: [
            { id: 'i1', title: "Generate 'Curiosity Gap' Titles", prompt: "Generate 5 click-worthy YouTube titles for a video about '[topic]', using the 'curiosity gap' technique to make viewers want to know the answer.", purpose: "Create titles that spark curiosity and drive higher click-through rates." },
            { id: 'i2', title: "Brainstorm Contrarian Video Angles", prompt: "What is a controversial or contrarian opinion about '[topic]'? Generate 3 video ideas based on this alternative viewpoint.", purpose: "Find unique content angles that stand out in a crowded niche." },
            { id: 'i3', title: "Create 'Benefit-Driven' Titles", prompt: "Write 5 YouTube titles for a video on '[topic]' that clearly state the primary benefit for the viewer. Focus on the outcome or transformation.", purpose: "Attract viewers by immediately communicating the value they will receive." },
            { id: 'i4', title: "Develop 'Mistake' or 'Warning' Titles", prompt: "Generate 5 YouTube titles about '[topic]' that are framed around common mistakes to avoid or warnings for the viewer. For example: 'Don't Do X Until You Watch This'.", purpose: "Leverage loss aversion and urgency to create highly clickable titles." },
            { id: 'i5', title: "Frame Titles as Questions", prompt: "Generate 5 YouTube titles for a video about '[topic]' that are framed as compelling questions the target audience is asking themselves.", purpose: "Hook viewers by directly addressing questions they already have." },
            { id: 'i6', title: "Generate 'Ultimate Guide' Titles", prompt: "Create 5 authoritative 'Ultimate Guide' style titles for a video about '[topic]'. Include the current year to add relevance (e.g., 'The Ultimate Guide to X in [Year]').", purpose: "Position your video as the definitive, comprehensive resource on a topic." },
            { id: 'i7', title: "Brainstorm 'Keyword + Format' Titles", prompt: "Combine the keyword '[keyword]' with the video format '[format, e.g., Tutorial, Case Study, Review]'. Generate 5 engaging titles based on this combination.", purpose: "Create targeted, SEO-friendly titles that clearly set viewer expectations." },
            { id: 'i8', title: "Develop 'Transformation' Story Titles", prompt: "Write 5 titles for a video about '[topic]' that tell a transformation story. Use formats like 'How I Went From X to Y' or 'The Simple Change That Led to Z'.", purpose: "Attract viewers with relatable and aspirational case studies and stories." },
            { id: 'i9', title: "Create Listicle-Style Titles", prompt: "Generate 5 listicle-style titles (e.g., '7 Reasons Why...', 'The Top 5 Mistakes in...') for a video about '[topic]'. Ensure the numbers are specific and intriguing.", purpose: "Leverage the proven, highly-clickable format of list-based content." },
            { id: 'i10', title: "Use the 'SCAMPER' Ideation Method", prompt: "Use the SCAMPER method (Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, Reverse) to brainstorm 7 unique video ideas related to the topic of '[topic]'.", purpose: "Use a creative thinking framework to generate a wide range of innovative video concepts." },
        ]
    },
    {
        category: "Scripting & Polishing",
        prompts: [
            { id: 'p1', title: "Create a 'Problem-Agitate-Solve' Hook", prompt: "Take the following script segment and rewrite it as a compelling 'Problem-Agitate-Solve' hook for a YouTube video intro: [Your script segment here]", purpose: "Grab viewer attention in the first 30 seconds by highlighting a problem they relate to." },
            { id: 'p2', title: "Simplify a Complex Explanation", prompt: "Rewrite the following paragraph to be more concise and easier for a beginner Shopify merchant to understand. Use an analogy if possible: [Your complex paragraph here]", purpose: "Improve audience retention by making your content clear and accessible." },
            { id: 'p3', title: "Strengthen a Video's Opening Statement", prompt: "Refine this opening line for a video about '[topic]' to be more authoritative and intriguing. Make a bold promise or state a surprising fact. Original line: '[Your opening line here]'", purpose: "Establish credibility and hook the viewer immediately." },
            { id: 'p4', title: "Write a Compelling Call-to-Action (CTA)", prompt: "Write 3 different CTAs for the end of a video about '[topic]'. One should encourage comments, one should drive traffic to a link, and one should encourage subscribing.", purpose: "Guide your viewers to take a specific, valuable action after watching." },
            { id: 'p5', title: "Inject Storytelling into a Segment", prompt: "Rewrite the following factual paragraph into a short, engaging story or anecdote. Paragraph: '[Your factual paragraph here]'", purpose: "Make data and information more memorable and emotionally resonant." },
            { id: 'p6', title: "Turn Talking Points into a Conversational Script", prompt: "Take these talking points and write them as a natural, conversational script segment for a 'talking head' video. Points: [List of talking points]", purpose: "Convert bullet points into a script that sounds human and authentic when spoken." },
            { id: 'p7', title: "Add a 'Pattern Interrupt'", prompt: "Suggest a 'pattern interrupt' to re-engage viewers in the middle of this script segment. This could be a visual gag, a sudden question to the audience, or a change in tone. Segment: '[Your script segment here]'", purpose: "Recapture audience attention during longer segments to prevent mid-video drop-off." },
            { id: 'p8', title: "Create an Authoritative Conclusion", prompt: "Rewrite this conclusion to be more authoritative and memorable. Summarize the key takeaway and leave the viewer with a powerful final thought. Conclusion: '[Your conclusion here]'", purpose: "End your video on a high note, reinforcing your expertise and the video's value." },
            { id: 'p9', title: "Insert Data & Evidence", prompt: "Enhance the following claim by adding a placeholder for a specific statistic or data point, and rephrase it to sound more credible. Claim: '[Your claim here]'", purpose: "Boost your script's authority by highlighting where evidence and data can be used." },
            { id: 'p10', title: "Generate Segue Options", prompt: "Write 3 different transitions (segues) to smoothly connect these two topics in a video script. Topic 1: [Description of first topic]. Topic 2: [Description of second topic].", purpose: "Improve the flow and professionalism of your script by creating logical connections between sections." },
        ]
    },
    {
        category: "Promotion & Repurposing",
        prompts: [
            { id: 'r1', title: "Draft a Promotional Tweet Series", prompt: "Create a 3-tweet thread to promote a new YouTube video titled '[video title]'. The first tweet should be a hook, the second should add value/context, and the third should link to the video.", purpose: "Maximize social media reach and drive traffic to your new video." },
            { id: 'r2', title: "Generate a LinkedIn Post from a Video Script", prompt: "Summarize the key takeaways from the following video script into a professional LinkedIn post. Start with a compelling hook and end with a question to encourage discussion. Script: '[Paste key points or transcript here]'", purpose: "Repurpose your video content for a business-oriented audience on LinkedIn." },
            { id: 'r3', title: "Write an Email Newsletter Blurb", prompt: "Write a short, engaging blurb for an email newsletter to announce a new YouTube video titled '[video title]'. Focus on the 'why'—what problem does this video solve for the subscriber?", purpose: "Drive your most loyal audience from their inbox to your video." },
            { id: 'r4', title: "Create a YouTube Shorts Script", prompt: "Based on the key takeaway from this video script, write a 30-second vertical video script for a YouTube Short. Include visual suggestions. Key takeaway: '[Paste key point here]'", purpose: "Repurpose your long-form content for a short-form audience to expand reach." },
            { id: 'r5', title: "Generate Engaging Community Post Questions", prompt: "Write 5 open-ended questions related to the video '[video title]' that can be used to start a conversation on a YouTube Community Tab post, Reddit, or Facebook Group.", purpose: "Drive engagement and discussion around your video content on other platforms." },
            { id: 'r6', title: "Extract 'Quote Graphics' Content", prompt: "From the following script, extract 5 short, impactful quotes that would work well as text on a social media quote graphic. Script: '[Paste script segment here]'", purpose: "Create easily shareable visual content to promote your video's key messages." },
            { id: 'r7', title: "Write a Blog Post Intro", prompt: "Write an SEO-friendly introductory paragraph for a blog post based on the video titled '[video title]'. The intro should hook the reader and state what they will learn.", purpose: "Repurpose your video into a written format to capture search traffic from Google." },
            { id: 'r8', title: "Draft a Pinned Comment", prompt: "Write a pinned comment for the YouTube video '[video title]'. It should thank the viewers, ask an engaging question to spark the comments section, and include a relevant link if applicable.", purpose: "Guide the initial conversation in your comments section and provide extra value." },
            { id: 'r9', title: "Generate a Video Teaser Script", prompt: "Write a 15-second script for a video teaser trailer for a new video titled '[video title]'. It should build curiosity without giving away the main conclusion.", purpose: "Create a short, exciting ad or social post to build anticipation for a new video." },
            { id: 'r10', title: "Brainstorm Cross-Promotion Hashtags", prompt: "Generate a list of 10 relevant hashtags for promoting a video about '[topic]' on Instagram and Twitter. Include a mix of broad, niche, and community-specific hashtags.", purpose: "Increase the discoverability of your promotional posts on social media." },
        ]
    }
];

const AIPromptLibrary: React.FC = () => {
    const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
    const [promptIndexes, setPromptIndexes] = useState<{[key: string]: number}>(
        promptCategories.reduce((acc, category) => {
            acc[category.category] = 0;
            return acc;
        }, {} as {[key: string]: number})
    );

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPrompt(id);
        setTimeout(() => setCopiedPrompt(null), 2000);
    };

    const handlePrevPrompt = (category: string) => {
        const categoryPrompts = promptCategories.find(c => c.category === category)!.prompts;
        setPromptIndexes(prev => ({
            ...prev,
            [category]: (prev[category] - 1 + categoryPrompts.length) % categoryPrompts.length
        }));
    };

    const handleNextPrompt = (category: string) => {
        const categoryPrompts = promptCategories.find(c => c.category === category)!.prompts;
        setPromptIndexes(prev => ({
            ...prev,
            [category]: (prev[category] + 1) % categoryPrompts.length
        }));
    };


    return (
        <div className="space-y-6">
            <p className="text-sm text-dark-text-secondary">
                Use these expert-crafted prompts with the in-field AI assistants to get better, more strategic results. Simply copy a prompt and paste it where you see the ✨ icon inside tools like the Video Workflow or Script Polishing Studio.
            </p>
            {promptCategories.map(({ category, prompts }) => (
                <div key={category}>
                    <h3 className="text-xl font-bold text-brand-purple-light mb-3">{category}</h3>
                    <div className="bg-dark-bg p-4 rounded-lg border border-dark-border">
                        <div className="relative overflow-hidden">
                            <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${promptIndexes[category] * 100}%)` }}>
                                {prompts.map(p => (
                                    <div key={p.id} className="w-full flex-shrink-0 px-1">
                                        <h4 className="font-semibold text-white">{p.title}</h4>
                                        <p className="text-xs text-dark-text-secondary mt-1 mb-3">{p.purpose}</p>
                                        <div className="relative">
                                            <p className="text-sm text-dark-text font-mono bg-dark-card border border-dark-border/50 rounded-md p-3 pr-12">{p.prompt}</p>
                                            <div className="absolute top-2 right-2">
                                                {copiedPrompt === p.id && (
                                                    <span className="absolute bottom-full right-0 mb-1 px-2 py-0.5 rounded-md bg-dark-bg text-xs font-semibold text-brand-purple-light">
                                                        Copied!
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleCopy(p.prompt, p.id)}
                                                    title="Copy prompt"
                                                    className="p-2 text-dark-text-secondary hover:text-white bg-dark-bg rounded-md"
                                                >
                                                    <ClipboardIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {prompts.length > 1 && (
                            <div className="flex items-center justify-center gap-4 mt-4">
                                <button onClick={() => handlePrevPrompt(category)} className="p-1 rounded-full text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors">
                                    <ArrowLeftIcon className="w-5 h-5" />
                                </button>
                                <span className="text-xs font-mono text-dark-text-secondary">
                                    {promptIndexes[category] + 1} / {prompts.length}
                                </span>
                                <button onClick={() => handleNextPrompt(category)} className="p-1 rounded-full text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors">
                                    <ArrowRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};


const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [desktopTab, setDesktopTab] = useState<DesktopTab>('guide');
  const [mobileView, setMobileView] = useState<MobileView>('main');
  
  useEffect(() => {
    // Reset views when modal is opened
    if (isOpen) {
        setDesktopTab('guide');
        setMobileView('main');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const mainMenuItems = [
    { view: 'guide', icon: <QuestionMarkIcon />, label: "Feature Guide" },
    { view: 'deepDive', icon: <BookOpenIcon className="h-5 w-5"/>, label: "Workflow Deep Dive" },
    { view: 'avadaApps', icon: <PuzzleIcon className="h-5 w-5"/>, label: "Avada Apps Showcase" },
    { view: 'promptLibrary', icon: <AcademicCapIcon className="h-5 w-5" />, label: "AI Prompt Library" },
    { view: 'chat', icon: <ChatBubbleIcon className="h-5 w-5"/>, label: "Chat Assistant" },
  ] as const;


  const renderMobileContent = () => {
    switch (mobileView) {
        case 'guide':
            return (
                <div className="space-y-4">
                    <p className="text-sm text-dark-text-secondary pb-2">
                        This application is your guided workspace for building a data-driven channel strategy. Follow the workflow from top to bottom to go from initial research to a fully planned video.
                    </p>
                    {helpSections.map((section) => (
                        <div key={section.title} className="bg-dark-bg p-4 rounded-lg border border-dark-border flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">{section.icon}</div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                                <p className="text-dark-text text-sm">{section.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            );
        case 'deepDive': return <DeepDiveContent />;
        case 'avadaApps': return <AvadaAppShowcase />;
        case 'promptLibrary': return <AIPromptLibrary />;
        case 'chat': return <ChatAssistant />;
        case 'main':
        default:
            return (
                <div className="space-y-3">
                    {mainMenuItems.map(item => (
                        <button 
                            key={item.view}
                            onClick={() => setMobileView(item.view)}
                            className="w-full flex items-center gap-4 p-4 bg-dark-bg rounded-lg border border-dark-border text-left hover:bg-dark-border transition-colors"
                        >
                            <div className="text-brand-purple-light">{item.icon}</div>
                            <span className="font-semibold text-white">{item.label}</span>
                            <ArrowRightIcon className="w-5 h-5 ml-auto text-dark-text-secondary"/>
                        </button>
                    ))}
                </div>
            );
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-dark-card rounded-lg border border-dark-border shadow-xl w-full max-w-4xl m-4 text-white transform transition-all flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-dark-border flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
             <button
                className={`p-2 -ml-2 rounded-full text-dark-text-secondary hover:bg-dark-border hover:text-white transition-colors lg:hidden ${mobileView === 'main' ? 'invisible' : 'visible'}`}
                onClick={() => setMobileView('main')}
                aria-label="Back to help menu"
            >
                <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold">Help & Support</h2>
          </div>
          <button onClick={onClose} className="text-dark-text-secondary hover:text-white text-2xl font-bold p-2 -mr-2">&times;</button>
        </div>
        
        {/* --- DESKTOP VIEW --- */}
        <div className="hidden lg:flex flex-col flex-1 min-h-0">
            <div className="px-4 pt-3 border-b border-dark-border bg-dark-bg/50 flex-shrink-0">
                <div className="flex gap-2 flex-wrap">
                    {(mainMenuItems).map(item => (
                        <button
                            key={item.view}
                            onClick={() => setDesktopTab(item.view)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                                desktopTab === item.view
                                ? 'bg-dark-card text-white'
                                : 'text-dark-text-secondary hover:bg-dark-bg hover:text-white'
                            }`}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6 overflow-y-auto">
                {desktopTab === 'guide' && (
                    <div className="space-y-4">
                        <p className="text-sm text-dark-text-secondary pb-2">
                            This application is your guided workspace for building a data-driven channel strategy. Follow the workflow from top to bottom to go from initial research to a fully planned video.
                        </p>
                        {helpSections.map((section) => (
                            <div key={section.title} className="bg-dark-bg p-4 rounded-lg border border-dark-border flex items-start gap-4">
                                <div className="flex-shrink-0 mt-1">{section.icon}</div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                                    <p className="text-dark-text text-sm">{section.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {desktopTab === 'deepDive' && <DeepDiveContent />}
                {desktopTab === 'avadaApps' && <AvadaAppShowcase />}
                {desktopTab === 'promptLibrary' && <AIPromptLibrary />}
                {desktopTab === 'chat' && <div className="h-[65vh]"><ChatAssistant /></div>}
            </div>
        </div>

        {/* --- MOBILE VIEW --- */}
        <div className="block lg:hidden flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto">
            {renderMobileContent()}
        </div>

        <div className="p-4 bg-dark-bg rounded-b-lg text-center border-t border-dark-border flex-shrink-0">
            <button 
                onClick={onClose}
                className="bg-brand-purple text-white font-semibold px-6 py-2 rounded-md hover:bg-brand-purple-light transition-colors duration-200"
            >
                Got It!
            </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;