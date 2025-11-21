import React from 'react';
import { Area } from '../types';

interface HomePageProps {
  onNavigate: (area: Area) => void;
}

const AreaButton: React.FC<{ area: Area; onNavigate: (area: Area) => void }> = ({ area, onNavigate }) => (
  <button
    onClick={() => onNavigate(area)}
    className="bg-pale-yellow hover:opacity-90 text-charcoal font-bold py-10 px-6 rounded-lg shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out w-full text-center"
  >
    <span className="text-2xl tracking-wide">{area}</span>
  </button>
);

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="text-center mt-8">
      <h2 className="text-3xl font-light mb-12 text-cream/90">Select an Area</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <AreaButton area={Area.PULP2} onNavigate={onNavigate} />
        <AreaButton area={Area.NPP11} onNavigate={onNavigate} />
        <AreaButton area={Area.EWTP} onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default HomePage;