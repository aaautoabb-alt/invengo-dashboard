import React from 'react';

interface DashboardButtonProps {
  icon: React.ReactElement;
  label: string;
  onClick?: () => void;
}

const DashboardButton: React.FC<DashboardButtonProps> = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-teal hover:opacity-90 text-cream font-bold py-10 px-6 rounded-lg shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out w-full text-center flex flex-col items-center justify-center h-full"
    >
      {icon}
      <span className="text-2xl tracking-wide mt-4">{label}</span>
    </button>
  );
};

export default DashboardButton;