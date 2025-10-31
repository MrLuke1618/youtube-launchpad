import React from 'react';

const AcademicCapIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9.75l-9.75 4.5L2.25 9.75m19.5 0v6m-19.5-6v6m0 0l9.75 4.5 9.75-4.5M2.25 15.75l9.75 4.5 9.75-4.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.75V15" />
    </svg>
);

export default AcademicCapIcon;
