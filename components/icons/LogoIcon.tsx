
import React, { useId } from 'react';

const LogoIcon: React.FC = () => {
    const uniqueId = useId();
    const gradientId = `paint0_linear_logo_${uniqueId}`;

    return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`}/>
            <path d="M9 14L16 21L23 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 20L16 27L23 20" stroke="white" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 18L16 11L9 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 12L16 5L9 12" stroke="white" strokeOpacity="0.5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A467F5"/>
                    <stop offset="1" stopColor="#8A42E2"/>
                </linearGradient>
            </defs>
        </svg>
    );
};

export default LogoIcon;