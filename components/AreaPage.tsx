import React, { useState } from 'react';
import DashboardButton from './DashboardButton';
import SheetDataViewer from './SheetDataViewer';
import CreateCustomerForm from './CreateCustomerForm';
import { Area, ViewType } from '../types';
import { ClipboardListIcon, WrenchScrewdriverIcon, DocumentPlusIcon } from './icons';

interface AreaPageProps {
  area: Area;
  onBack: () => void;
  onNavigate: (area: Area) => void;
}

const AreaPage: React.FC<AreaPageProps> = ({ area, onBack, onNavigate }) => {
    const [view, setView] = useState<ViewType>('dashboard');

    const isEwtp = area === Area.EWTP;
    const otherAreas = Object.values(Area).filter(a => a !== area);

    const renderDashboard = () => {
        const createStockLabel = isEwtp ? "Create New Stock (ABB)" : "Create New Stock";
        
        return (
            <div className={`grid grid-cols-1 gap-8 mt-4 ${isEwtp ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                {isEwtp ? (
                    <>
                        <DashboardButton icon={<ClipboardListIcon />} label="Stock & Status (ABB)" onClick={() => setView('stock_abb')} />
                        <DashboardButton icon={<ClipboardListIcon />} label="Stock & Status (SUPCON)" onClick={() => setView('stock_supcon')} />
                    </>
                ) : (
                    <DashboardButton icon={<ClipboardListIcon />} label="Stock & Status" onClick={() => setView('stock')} />
                )}
                <DashboardButton icon={<WrenchScrewdriverIcon />} label="Current Equipment" onClick={() => setView('equipment')} />
                <DashboardButton icon={<DocumentPlusIcon />} label={createStockLabel} onClick={() => setView('customer_form')} />
                {isEwtp && (
                    <DashboardButton icon={<DocumentPlusIcon />} label="Create New Stock (SUPCON)" onClick={() => setView('customer_form_supcon')} />
                )}
            </div>
        );
    };

    const renderView = () => {
        switch (view) {
            case 'stock':
                return <SheetDataViewer title="Stock & Status" area={area} dataType="stock" />;
            case 'stock_abb':
                return <SheetDataViewer title="Stock & Status (ABB)" area={area} dataType="stock_abb" />;
            case 'stock_supcon':
                return <SheetDataViewer title="Stock & Status (SUPCON)" area={area} dataType="stock_supcon" />;
            case 'equipment':
                return <SheetDataViewer title="Current Equipment" area={area} dataType="equipment" />;
            case 'customer_form':
                const formTitle = area === Area.EWTP ? "Create New Stock Entry (ABB)" : "Create New Stock Entry";
                return <CreateCustomerForm area={area} formTitle={formTitle} formVariant={area === Area.EWTP ? 'abb' : undefined} />;
            case 'customer_form_supcon':
                return <CreateCustomerForm area={area} formTitle="Create New Stock Entry (SUPCON)" formVariant="supcon" />;
            default:
                return renderDashboard();
        }
    };
    
    const isDashboardView = view === 'dashboard';

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={isDashboardView ? onBack : () => setView('dashboard')}
                    className="bg-teal hover:opacity-90 text-cream font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Back
                </button>
                <h2 className="text-4xl font-semibold text-center text-pale-yellow hidden md:block">
                    {area === Area.EWTP ? 'ETP and WTP' : area}
                </h2>
                 <div className="flex items-center gap-2">
                    {otherAreas.map(otherArea => (
                        <button
                            key={otherArea}
                            onClick={() => onNavigate(otherArea)}
                            className="bg-teal hover:opacity-90 text-cream font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 ease-in-out text-sm"
                            title={`Switch to ${otherArea}`}
                        >
                            {otherArea}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="mt-8">
                {renderView()}
            </div>
        </div>
    );
};

export default AreaPage;