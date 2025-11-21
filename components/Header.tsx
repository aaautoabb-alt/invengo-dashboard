import React from 'react';

const WarehouseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.582 9.277L12.636.331a.75.75 0 00-1.272 0L2.418 9.277a.75.75 0 00.176 1.056l.175.117h18.462l.175-.117a.75.75 0 00.176-1.056zM13.5 21.75V15h3v6.75a.75.75 0 01-1.5 0V18h-3v3.75a.75.75 0 01-1.5 0V15h3v3.75h-3v3a.75.75 0 01-1.5 0V15h-3v6.75a.75.75 0 01-1.5 0V11.25H3v10.5a.75.75 0 00.75.75h16.5a.75.75 0 00.75-.75v-10.5h.75v10.5a.75.75 0 01-1.5 0z" />
    </svg>
);

interface HeaderProps {
    onGoHome: () => void;
}

const Header: React.FC<HeaderProps> = ({ onGoHome }) => {
  return (
    <header className="bg-teal/90 backdrop-blur-sm shadow-lg sticky top-0 z-10 border-b border-charcoal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16">
          <button
            onClick={onGoHome}
            className="flex items-center p-2 rounded-lg transition-colors duration-200 hover:bg-charcoal/50 focus:outline-none focus:ring-2 focus:ring-pale-yellow focus:ring-opacity-75"
            aria-label="Go to home page"
          >
            <WarehouseIcon className="h-8 w-8 text-cream" />
            <h1 className="text-xl sm:text-2xl font-bold ml-3 text-pale-yellow tracking-wider">
                InvenGo
            </h1>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;