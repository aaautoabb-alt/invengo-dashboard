import React, { useState } from 'react';
import Header from './components/Header';
import HomePage from './components/HomePage';
import AreaPage from './components/AreaPage';
import { Area } from './types';

const App: React.FC = () => {
  const [currentArea, setCurrentArea] = useState<Area | null>(null);

  const handleNavigate = (area: Area) => {
    setCurrentArea(area);
  };

  const handleGoHome = () => {
    setCurrentArea(null);
  };

  return (
    <div className="min-h-screen bg-charcoal text-cream font-sans selection:bg-pale-yellow selection:text-charcoal">
      <Header onGoHome={handleGoHome} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentArea ? (
          <AreaPage 
            area={currentArea} 
            onBack={handleGoHome} 
            onNavigate={handleNavigate}
          />
        ) : (
          <HomePage onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  );
};

export default App;