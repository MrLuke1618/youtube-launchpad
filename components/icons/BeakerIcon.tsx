import React from 'react';

const BeakerIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c.252-.04.51-.068.774-.068s.522.028.774.068m0 0a2.25 2.25 0 012.25 2.25v5.714a2.25 2.25 0 01-.659 1.591L14.25 14.5M12 14.5h.008v.008H12v-.008zm0 0a3.375 3.375 0 013.375 3.375V19.5a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25v-1.625c0-1.864 1.51-3.375 3.375-3.375z" />
    </svg>
);

export default BeakerIcon;
