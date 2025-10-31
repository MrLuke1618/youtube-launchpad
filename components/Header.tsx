import React from 'react';
import MenuIcon from './icons/MenuIcon';
import LogoIcon from './icons/LogoIcon';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="lg:hidden bg-dark-card border-b border-dark-border px-4 h-16 flex items-center gap-4 shrink-0 z-20">
      <button 
        onClick={onMenuClick} 
        className="p-2 rounded-md text-dark-text-secondary hover:text-white hover:bg-dark-border -ml-2"
        aria-label="Open sidebar"
      >
        <MenuIcon className="h-6 w-6" />
      </button>
      <div className="flex items-center gap-3">
        <LogoIcon />
        <h1 className="text-xl font-bold text-white">YT Launchpad</h1>
      </div>
    </header>
  );
};

export default Header;
