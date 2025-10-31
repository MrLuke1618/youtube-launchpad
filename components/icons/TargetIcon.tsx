import React from 'react';

const TargetIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 10-7.07 7.072m7.07-7.072l-1.06-1.06m-5.952 8.132l-1.06 1.06M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
);

export default TargetIcon;