import React, { useState, useCallback } from 'react';
import { getTermExplanation } from '../services/geminiService';

interface ExplainableTermProps {
    term: string;
}

const ExplainableTerm: React.FC<ExplainableTermProps> = ({ term }) => {
    const [explanation, setExplanation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);

    const handleFetchExplanation = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getTermExplanation(term);
            setExplanation(result.explanation);
        } catch (e: any) {
            setError(e.message || "Failed to load explanation.");
        } finally {
            setIsLoading(false);
        }
    }, [term]);
    
    const handleClick = () => {
        const willBeVisible = !isTooltipVisible;
        setIsTooltipVisible(willBeVisible);

        // Fetch only if it's the first time opening the tooltip
        if (willBeVisible && !explanation && !isLoading) {
            handleFetchExplanation();
        }
    };

    return (
        <span className="relative inline-block">
            <button
                onClick={handleClick}
                className="cursor-help border-b border-dashed border-dark-text-secondary text-left"
                aria-expanded={isTooltipVisible}
            >
                {term}
            </button>
            {isTooltipVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-dark-bg border border-dark-border rounded-lg shadow-lg z-10 text-sm text-white font-normal text-left">
                    {isLoading && <p className="text-dark-text-secondary">Loading...</p>}
                    {error && <p className="text-red-400">{error}</p>}
                    {explanation && <p>{explanation}</p>}
                </div>
            )}
        </span>
    );
};

export default ExplainableTerm;