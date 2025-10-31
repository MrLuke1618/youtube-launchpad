import React from 'react';

const RobotIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5v3.75c0 1.135-.845 2.098-1.976 2.192a48.424 48.424 0 01-1.125 0c-1.131-.094-1.976-1.057-1.976-2.192V7.5M15.75 7.5v3.75c0 1.135.845 2.098 1.976 2.192.373.03.748.03 1.125 0 1.131-.094 1.976-1.057 1.976-2.192V7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13.5v-1.5a3 3 0 00-3-3h-3a3 3 0 00-3 3v1.5m10.5 0v-1.5a3 3 0 00-3-3h-3a3 3 0 00-3 3v1.5m10.5 0h-9m9 0v1.5a3 3 0 01-3 3h-3a3 3 0 01-3-3v-1.5" />
    </svg>
);

export default RobotIcon;