import React, { useState, useEffect, useMemo } from 'react';
import { Area } from '../types';
import { LoadingSpinner, ErrorIcon, SearchIcon } from './icons';

interface SheetDataViewerProps {
    title: string;
    area: Area;
    dataType: 'stock' | 'stock_abb' | 'stock_supcon' | 'equipment';
}

// IMPORTANT: This is your Google Apps Script Web App URL.
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx03kVQ0fRNdbIeE0e9hfhiWAIj4F2iPT25B06WVoZwSZLl60-1ef8ypap3FST8L_F4/exec';

const SheetDataViewer: React.FC<SheetDataViewerProps> = ({ title, area, dataType }) => {
    const [data, setData] = useState<string[][] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<string>('All');
    const [selectedArea, setSelectedArea] = useState<string>('All');
    const [selectedCabinet, setSelectedCabinet] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState<string>('');

    const isEquipmentView = useMemo(() => dataType === 'equipment', [dataType]);
    
    const headerRowCount = useMemo(() => {
        return dataType.includes('stock') ? 1 : 4;
    }, [dataType]);

    useEffect(() => {
        // When the selected area changes, reset the cabinet filter to 'All'
        setSelectedCabinet('All');
    }, [selectedArea]);
    
    useEffect(() => {
        let isMounted = true;

        const fetchData = (isInitialLoad: boolean) => {
            if (isInitialLoad) {
                setLoading(true);
                setError(null);
            }

            const url = new URL(GOOGLE_SCRIPT_URL);
            url.searchParams.append('action', 'getData');
            url.searchParams.append('area', area);
            url.searchParams.append('type', dataType);

            fetch(url.toString(), {
                credentials: 'omit' // Ensure consistent anonymous access if public
            })
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                    return res.json();
                })
                .then(result => {
                    if (!isMounted) return;
                    if (result.success && Array.isArray(result.data)) {
                        setData(result.data);
                        if (isInitialLoad) setError(null);
                    } else {
                        throw new Error(result.error || 'Invalid data format received.');
                    }
                })
                .catch(err => {
                    if (!isMounted) return;
                    console.error("Failed to fetch sheet data:", err);
                    if (isInitialLoad) {
                        setError(err.message);
                    }
                })
                .finally(() => {
                    if (isMounted && isInitialLoad) {
                        setLoading(false);
                    }
                });
        };
        
        fetchData(true);
        setSelectedType('All'); // Reset type filter
        setSelectedArea('All'); // Reset area filter when view changes
        setSelectedCabinet('All'); // Reset cabinet filter
        setSearchTerm(''); // Reset search term

        const intervalId = setInterval(() => {
            fetchData(false);
        }, 30000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [area, dataType]);

    const reorderedData = useMemo(() => {
        if (!isEquipmentView || !data || data.length === 0) {
            return data;
        }
        const firstHeaderRow = data[0];
        const originalAreaIndex = firstHeaderRow.findIndex(header => header.toLowerCase().trim() === 'area');
        const originalCabinetIndex = firstHeaderRow.findIndex(header => header.toLowerCase().trim() === 'cabinet');

        // No reordering needed if columns are not found or already in order
        if (originalAreaIndex === -1 || originalCabinetIndex === -1 || originalCabinetIndex === originalAreaIndex + 1) {
            return data;
        }

        return data.map(row => {
            const cabinetValue = row[originalCabinetIndex];
            const rowWithoutCabinet = row.filter((_, index) => index !== originalCabinetIndex);
            
            const newAreaIndex = originalCabinetIndex < originalAreaIndex ? originalAreaIndex - 1 : originalAreaIndex;
            
            rowWithoutCabinet.splice(newAreaIndex + 1, 0, cabinetValue);
            
            return rowWithoutCabinet;
        });
    }, [data, isEquipmentView]);

    const isFilterableView = dataType.includes('stock') || dataType === 'equipment';
    
    const isAreaFiltered = useMemo(() => isEquipmentView && selectedArea !== 'All', [isEquipmentView, selectedArea]);

    const { types, typeColumnIndex } = useMemo(() => {
        if (!isFilterableView || !reorderedData || reorderedData.length < headerRowCount + 1) return { types: [], typeColumnIndex: -1 };
        const firstHeaderRow = reorderedData[0];
        const typeIndex = firstHeaderRow.findIndex(header => header.toLowerCase().trim() === 'type');
        if (typeIndex === -1) return { types: [], typeColumnIndex: -1 };
        const uniqueTypes = [...new Set(reorderedData.slice(headerRowCount).map(row => row[typeIndex]).filter(Boolean))];
        return { types: ['All', ...uniqueTypes], typeColumnIndex: typeIndex };
    }, [reorderedData, isFilterableView, headerRowCount]);

    const { areas, areaColumnIndex } = useMemo(() => {
        if (!reorderedData || reorderedData.length < headerRowCount + 1) {
            return { areas: [], areaColumnIndex: -1 };
        }
        const firstHeaderRow = reorderedData[0];
        const areaIndex = firstHeaderRow.findIndex(header => header.toLowerCase().trim() === 'area');
        if (areaIndex === -1) {
            return { areas: [], areaColumnIndex: -1 };
        }
        const uniqueAreas = [...new Set(reorderedData.slice(headerRowCount).map(row => row[areaIndex]).filter(Boolean))];
        return { areas: ['All', ...uniqueAreas], areaColumnIndex: areaIndex };
    }, [reorderedData, headerRowCount]);

    const { cabinets, cabinetColumnIndex } = useMemo(() => {
        if (!isEquipmentView || !reorderedData || reorderedData.length < headerRowCount + 1) {
            return { cabinets: [], cabinetColumnIndex: -1 };
        }
        const firstHeaderRow = reorderedData[0];
        const cabinetIndex = firstHeaderRow.findIndex(header => header.toLowerCase().trim() === 'cabinet');
        if (cabinetIndex === -1 || selectedArea === 'All' || areaColumnIndex === -1) {
            return { cabinets: [], cabinetColumnIndex: cabinetIndex };
        }
        const uniqueCabinetsInArea = [...new Set(
            reorderedData.slice(headerRowCount)
                .filter(row => row[areaColumnIndex] === selectedArea)
                .map(row => row[cabinetIndex])
                .filter(Boolean)
        )];
        const cabinetOptions = uniqueCabinetsInArea.length > 0 ? ['All', ...uniqueCabinetsInArea] : [];
        return { cabinets: cabinetOptions, cabinetColumnIndex: cabinetIndex };
    }, [reorderedData, isEquipmentView, selectedArea, areaColumnIndex, headerRowCount]);
    
    const filteredBodyRows = useMemo(() => {
        let rows = reorderedData?.slice(headerRowCount) || [];
        
        // Apply Type Filter
        if (isFilterableView && selectedType !== 'All' && typeColumnIndex !== -1) {
            rows = rows.filter(row => row[typeColumnIndex] === selectedType);
        }
        
        // Apply Area Filter
        if (selectedArea !== 'All' && areaColumnIndex !== -1) {
            rows = rows.filter(row => row[areaColumnIndex] === selectedArea);
        }
        
        // Apply Cabinet Filter
        if (isEquipmentView && selectedCabinet !== 'All' && cabinetColumnIndex !== -1) {
            rows = rows.filter(row => row[cabinetColumnIndex] === selectedCabinet);
        }

        // Apply Search Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            
            if (isEquipmentView) {
                // For Equipment View: We search in the HEADER row (Columns), not the body rows.
                // So we DO NOT filter rows here based on text content. 
                // The column filtering logic happens in `visibleEquipmentColumns`.
            } else {
                // Standard row filtering for Stock views
                rows = rows.filter(row => 
                    row.some(cell => cell && String(cell).toLowerCase().includes(lowerTerm))
                );
            }
        }

        // For equipment view, only show rows that have a value in at least one column.
        // Note: We apply this AFTER search so we don't hide valid empty rows if that logic is desired, 
        // but generally for equipment matrix, we only want rows with data.
        if (isEquipmentView) {
            rows = rows.filter(row => row.some(cell => cell && cell.trim() !== ''));
        }
        return rows;
    }, [reorderedData, selectedType, selectedArea, selectedCabinet, searchTerm, isFilterableView, typeColumnIndex, areaColumnIndex, cabinetColumnIndex, isEquipmentView, headerRowCount]);
    
    const visibleEquipmentColumns = useMemo(() => {
        if (!isEquipmentView || !filteredBodyRows || filteredBodyRows.length === 0 || !reorderedData) {
            return null; // Show all columns if not applicable
        }

        const firstHeaderRow = reorderedData[0] || [];
        const totalColumns = firstHeaderRow.length;
        const visibleIndices = new Set<number>();

        // Always include the first three columns: Area, Cabinet, and Description.
        visibleIndices.add(0);
        visibleIndices.add(1);
        visibleIndices.add(2);

        const lowerSearchTerm = searchTerm.toLowerCase();

        // Iterate through the rest of the columns
        for (let colIndex = 3; colIndex < totalColumns; colIndex++) {
            
            if (searchTerm) {
                // SEARCH MODE: Filter columns based on the Header Name (Top Row)
                const headerName = firstHeaderRow[colIndex];
                if (headerName && String(headerName).toLowerCase().includes(lowerSearchTerm)) {
                    visibleIndices.add(colIndex);
                }
            } else {
                // DEFAULT MODE: Filter columns based on data presence
                // Check if any data row in this column contains a number greater than 0.
                const hasNumericData = filteredBodyRows.some(row => {
                    const cellValue = row[colIndex];
                    const numericValue = parseInt(cellValue, 10);
                    return !isNaN(numericValue) && numericValue > 0;
                });

                if (hasNumericData) {
                    visibleIndices.add(colIndex);
                }
            }
        }
        return visibleIndices;
    }, [isEquipmentView, filteredBodyRows, reorderedData, searchTerm]);

    if (loading) {
        return <div className="flex flex-col items-center justify-center p-8 bg-teal rounded-lg"><LoadingSpinner /><p className="mt-4">Loading data...</p></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-red-500/10 border border-red-500 text-red-300 rounded-lg">
                <ErrorIcon />
                <h3 className="text-xl font-semibold mt-4">Could not load data</h3>
                <p className="mt-2 text-center">Failed to retrieve data from the spreadsheet. Please ensure the Google Apps Script URL is correct and the sheet is accessible.</p>
                <p className="font-mono text-sm mt-2 p-2 bg-charcoal rounded">{error}</p>
            </div>
        );
    }

    const headerRows = reorderedData?.slice(0, headerRowCount) || [];
    
    const selectClasses = "bg-charcoal/50 border border-charcoal rounded-md py-1.5 px-2 text-cream text-sm focus:ring-2 focus:ring-pale-yellow focus:border-pale-yellow";

    const renderFilters = () => {
        if (!isFilterableView) return null;

        const showTypeFilter = types.length > 1;
        const showAreaFilter = isEquipmentView && areas.length > 1;
        const showCabinetFilter = isEquipmentView && cabinets.length > 1;
        
        return (
            <div className="mb-6 space-y-4">
                {/* Search Bar - Only show if NOT equipment view */}
                {!isEquipmentView && (
                    <div className="relative max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-cream/50" />
                        </div>
                        <input 
                            type="text" 
                            className="block w-full pl-10 pr-3 py-2 border border-charcoal rounded-md leading-5 bg-charcoal/50 text-cream placeholder-cream/50 focus:outline-none focus:bg-charcoal/70 focus:border-pale-yellow focus:ring-2 focus:ring-pale-yellow sm:text-sm transition-all duration-200" 
                            placeholder="Search by name, model, etc..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                {/* Filter Controls */}
                {(showTypeFilter || showAreaFilter || showCabinetFilter) && (
                    <div className="pb-4 border-b border-charcoal/50 space-y-4">
                        {showTypeFilter && (
                            <div>
                                <span className="mr-4 font-medium text-cream/90">Filter by Type:</span>
                                <div className="inline-flex flex-wrap gap-2 mt-2 sm:mt-0" role="group">
                                    {types.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setSelectedType(type)}
                                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-teal focus:ring-pale-yellow ${selectedType === type ? 'bg-pale-yellow text-charcoal shadow' : 'bg-charcoal/50 text-cream hover:bg-charcoal/70'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {showAreaFilter && (
                            <div>
                                <span className="mr-4 font-medium text-cream/90">Filter by Area:</span>
                                <div className="inline-flex flex-wrap gap-2 mt-2 sm:mt-0" role="group">
                                    {areas.map(areaName => (
                                        <button
                                            key={areaName}
                                            onClick={() => setSelectedArea(areaName)}
                                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-teal focus:ring-pale-yellow ${selectedArea === areaName ? 'bg-pale-yellow text-charcoal shadow' : 'bg-charcoal/50 text-cream hover:bg-charcoal/70'}`}
                                        >
                                            {areaName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {showCabinetFilter && (
                            <div className="flex items-center gap-2">
                                <label htmlFor="cabinet-filter" className="font-medium text-cream/90 text-sm">Cabinet:</label>
                                <select id="cabinet-filter" value={selectedCabinet} onChange={(e) => setSelectedCabinet(e.target.value)} className={selectClasses}>
                                    {cabinets.map(cabinetName => <option key={cabinetName} value={cabinetName}>{cabinetName}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };


    return (
        <div className="bg-teal p-4 sm:p-6 rounded-lg shadow-xl">
            <div className="flex items-center justify-center mb-4">
                <h3 className="text-2xl font-semibold">{title}</h3>
            </div>
            
            {renderFilters()}

            {filteredBodyRows.length > 0 ? (
                <div className={`overflow-auto rounded-md border border-charcoal/50 ${isEquipmentView ? 'max-h-[70vh]' : ''}`}>
                    <table className="min-w-full border-collapse">
                        <thead className={`sticky top-0 z-30 ${isEquipmentView ? 'bg-charcoal' : ''}`}>
                            {headerRows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {row.map((header, cellIndex) => {
                                        if (isEquipmentView && visibleEquipmentColumns && !visibleEquipmentColumns.has(cellIndex)) {
                                            return null;
                                        }
                                        if (isAreaFiltered && areaColumnIndex !== -1 && cellIndex === areaColumnIndex) return null;

                                        const thClasses = [
                                            'px-2 text-left text-xs font-medium text-cream/80 uppercase tracking-wider',
                                            'bg-charcoal',
                                        ];
                                        
                                        if (isEquipmentView) {
                                            // Allow text wrapping and word breaking for all headers in this view to prevent overflow.
                                            thClasses.push(rowIndex < 3 ? 'py-1' : 'py-1.5', 'whitespace-normal', 'break-words');
                                            if (cellIndex === 0) {
                                                 if (isAreaFiltered) {
                                                    // When area is filtered, the 'Area' column is hidden, so no special classes needed here.
                                                } else {
                                                    thClasses.push('sticky', 'left-0', 'w-20', 'z-50', 'border-r', 'border-teal/50');
                                                }
                                            } else if (cellIndex === 1) {
                                                if (isAreaFiltered) {
                                                    thClasses.push('sticky', 'left-0', 'w-72', 'z-40', 'border-r', 'border-teal/50');
                                                } else {
                                                    thClasses.push('sticky', 'left-[calc(5rem+1px)]', 'w-72', 'z-40');
                                                }
                                            } else if (cellIndex === 2) {
                                                thClasses.push('w-[32rem]');
                                            } else {
                                                // Set a minimum width for all other columns to ensure content is visible.
                                                thClasses.push('min-w-24');
                                            }
                                        } else {
                                            // For 'stock' views, match the padding of the body rows.
                                            thClasses.push('py-2');
                                        }
                                        
                                        return (
                                            <th key={cellIndex} scope="col" className={thClasses.join(' ')}>
                                                {header}
                                            </th>
                                        );
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody className={`divide-y divide-teal/50 ${isEquipmentView ? 'bg-charcoal' : 'bg-teal'}`}>
                            {filteredBodyRows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="group">
                                    {row.map((cell, cellIndex) => {
                                        if (isEquipmentView && visibleEquipmentColumns && !visibleEquipmentColumns.has(cellIndex)) {
                                            return null;
                                        }
                                        if (isAreaFiltered && areaColumnIndex !== -1 && cellIndex === areaColumnIndex) return null;
                                        
                                        const tdClasses = [
                                            'px-2 py-2 whitespace-nowrap text-sm text-cream',
                                            'transition-colors duration-150',
                                        ];

                                        if (isEquipmentView) {
                                            if (cellIndex === 0) {
                                                if (!isAreaFiltered) {
                                                    tdClasses.push(
                                                        'sticky', 'left-0', 'w-20', 'z-20',
                                                        'bg-charcoal', 'group-hover:bg-teal/30', 'border-r', 'border-teal/50'
                                                    );
                                                }
                                            } else if (cellIndex === 1) {
                                                if (isAreaFiltered) {
                                                     tdClasses.push(
                                                        'sticky', 'left-0', 'w-72', 'z-10',
                                                        'bg-charcoal', 'group-hover:bg-teal/30', 'border-r', 'border-teal/50'
                                                    );
                                                } else {
                                                    tdClasses.push(
                                                        'sticky', 'left-[calc(5rem+1px)]', 'w-72', 'z-10',
                                                        'bg-charcoal', 'group-hover:bg-teal/30'
                                                    );
                                                }
                                            } else if (cellIndex === 2) {
                                                const classString = tdClasses[0];
                                                tdClasses[0] = classString.replace('whitespace-nowrap', 'whitespace-normal');
                                                tdClasses.push('w-[32rem]', 'bg-teal', 'group-hover:bg-charcoal/40');
                                            } else {
                                                tdClasses.push('bg-teal', 'group-hover:bg-charcoal/40');
                                            }
                                        } else {
                                             tdClasses.push('group-hover:bg-charcoal/40');
                                        }

                                        return (
                                            <td key={cellIndex} className={tdClasses.join(' ')}>
                                                {cell}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center py-8 text-cream/70">{reorderedData && reorderedData.length > headerRowCount ? 'No items match the current filter.' : 'No data found in this sheet.'}</p>
            )}
        </div>
    );
};

export default SheetDataViewer;