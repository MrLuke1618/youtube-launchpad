import React from 'react';

const GlobeAltIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className || "w-6 h-6"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.52 9.11a9.03 9.03 0 0116.96 0M3.52 14.89a9.03 9.03 0 0116.96 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-3.04 0-5.88 1.4-7.75 3.65m15.5 0A9.01 9.01 0 0012 3" />
    </svg>
);

export default GlobeAltIcon;