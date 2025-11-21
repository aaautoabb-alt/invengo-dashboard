import React, { useState, useEffect } from 'react';
import { Area } from '../types';
import { LoadingSpinner, SuccessIcon, ErrorIcon } from './icons';

interface CreateCustomerFormProps {
  area: Area;
  formTitle?: string;
  formVariant?: 'abb' | 'supcon';
}

// IMPORTANT: This is your Google Apps Script Web App URL.
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx03kVQ0fRNdbIeE0e9hfhiWAIj4F2iPT25B06WVoZwSZLl60-1ef8ypap3FST8L_F4/exec';

/**
 * Converts a date string from 'YYYY-MM-DD' to 'DD/Mon/YYYY' format.
 * @param isoDate The date string in 'YYYY-MM-DD' format.
 * @returns The formatted date string, e.g., "28/Oct/2025".
 */
const formatDateToCustomString = (isoDate: string): string => {
  if (!isoDate) return '';
  try {
    const parts = isoDate.split('-');
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1; // month is 0-indexed in Date
    const day = parseInt(parts[2], 10);
    
    const dateObj = new Date(year, monthIndex, day);
    
    const dayOfMonth = dateObj.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[dateObj.getMonth()];
    const fullYear = dateObj.getFullYear();
    
    return `${dayOfMonth}/${month}/${fullYear}`;
  } catch (error) {
    console.error("Could not format date:", isoDate, error);
    return isoDate; // Fallback to original string on error
  }
};


const CreateCustomerForm: React.FC<CreateCustomerFormProps> = ({ area, formTitle, formVariant }) => {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    date: getTodayDate(),
    equipment: '',
    model: '',
    number: '',
    addOrUse: 'Add',
    status: 'พร้อมใช้', // Default status set to the new hardcoded value
    recordBy: '',
  });
  
  const [dropdownOptions, setDropdownOptions] = useState<{ equipment: string[]; status: string[] }>({ equipment: [], status: [] });
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    setIsLoadingOptions(true);
    setOptionsError(null);

    const url = new URL(GOOGLE_SCRIPT_URL);
    
    // Use different actions based on the area and variant to get equipment options
    let action: string;
    if (area === Area.NPP11) {
      action = 'getNpp11EquipmentOptions';
    } else if (area === Area.EWTP) {
      if (formVariant === 'supcon') {
        action = 'getSupconEquipmentOptions'; // Action for SUPCON form
      } else {
        action = 'getEwtpEquipmentOptions'; // Action for ABB form
      }
    } else {
      action = 'getDropdownOptions'; // Default for Pulp 2 etc.
    }

    url.searchParams.append('action', action);
    url.searchParams.append('area', area);

    fetch(url.toString(), {
        credentials: 'omit', // Prevent sending auth cookies that might conflict with "Execute as Me"
    })
      .then(res => res.json())
      .then(result => {
        if (!isMounted) return;
        if (result.success && result.data) {
          setDropdownOptions({
            equipment: result.data.equipment || [],
            status: result.data.status || [],
          });
        } else {
          throw new Error(result.error || 'Failed to parse dropdown options.');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error("Failed to fetch dropdown options:", err);
        setOptionsError(err.message);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingOptions(false);
      });
      
      return () => { isMounted = false; };
  }, [area, formVariant]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Use FormData for robust POST requests to Google Apps Script
      const formBody = new FormData();
      
      let action: string;
      if (area === Area.NPP11) {
        action = 'createNpp11CustomerEntry';
      } else if (area === Area.EWTP && formVariant === 'supcon') {
        action = 'createSupconStockEntry'; 
      } else {
        action = 'createStockEntry'; // Default action for Pulp 2, E/WTP (ABB), etc.
      }

      // Determine Target Sheet Name explicitely based on User Requirement
      let targetSheetName = '';
      if (area === Area.PULP2) {
        targetSheetName = 'Pulp 2 Customerinfor';
      } else if (area === Area.NPP11) {
        targetSheetName = 'NPP11 Customerinfor';
      } else if (area === Area.EWTP) {
        if (formVariant === 'supcon') {
           // SUPCON -> ETP2A Customerinfor
           targetSheetName = 'ETP2A Customerinfor';
        } else {
           // ABB (Default) -> EWTP Customerinfor
           targetSheetName = 'EWTP Customerinfor';
        }
      }

      formBody.append('action', action);
      formBody.append('area', area);
      if (targetSheetName) {
        formBody.append('sheetName', targetSheetName);
      }
      
      formBody.append('date', formatDateToCustomString(formData.date)); // Format the date before sending
      formBody.append('equipment', formData.equipment);
      formBody.append('model', formData.model);
      formBody.append('number', formData.number);
      formBody.append('addOrUse', formData.addOrUse);
      formBody.append('status', formData.status);
      // Note: The GAS backend is configured to map this 'recordBy' field to Column H (Index 7)
      formBody.append('recordBy', formData.recordBy);

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        // headers: DO NOT set Content-Type manually when using FormData. The browser sets it with the boundary.
        credentials: 'omit', // Critical: Do not send cookies to avoid "Execute as User" vs "Execute as Me" conflicts
        body: formBody,
      });

      const result = await res.json();

      if (result.success) {
        setSubmitStatus('success');
        setFormData({
          date: getTodayDate(),
          equipment: '',
          model: '',
          number: '',
          addOrUse: 'Add',
          status: 'พร้อมใช้', // Reset to default status
          recordBy: '',
        });
        setTimeout(() => setSubmitStatus('idle'), 5000);
      } else {
        throw new Error(result.error || 'An unknown error occurred on submission.');
      }
    } catch (err: any) {
      setSubmitStatus('error');
      setErrorMessage(err.message || JSON.stringify(err));
      console.error('Submission failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const inputClasses = "w-full px-4 py-2 bg-charcoal/50 border border-charcoal rounded-md focus:outline-none focus:ring-2 focus:ring-pale-yellow text-cream placeholder-cream/50 disabled:bg-charcoal/40 disabled:cursor-not-allowed";

  const renderEquipmentInput = () => {
    if (isLoadingOptions) {
      return <div className={`${inputClasses} flex items-center`}><LoadingSpinner size="h-5 w-5" /> <span className="ml-2 text-cream/50">Loading equipment...</span></div>;
    }
    // Always render Select, if empty show placeholder option
    if (optionsError || dropdownOptions.equipment.length === 0) {
       return (
         <select name="equipment" id="equipment" value={formData.equipment} onChange={handleChange} required className={inputClasses}>
            <option value="" disabled>Select Equipment (No options loaded)</option>
            {/* Fallback: if user needs to type, we might need a text input, but per request we keep it dropdown. 
                If no options, this effectively blocks submission, which is usually desired if options are mandatory.
            */}
         </select>
       );
    }
    return (
      <select name="equipment" id="equipment" value={formData.equipment} onChange={handleChange} required className={inputClasses}>
        <option value="" disabled>Select Equipment</option>
        {dropdownOptions.equipment.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
    );
  };

  const renderStatusInput = () => {
      // Use the new hardcoded list of statuses
      const statusList = ['พร้อมใช้', 'รอ test'];

      return (
        <select name="status" id="status" value={formData.status} onChange={handleChange} required className={inputClasses}>
            {statusList.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      );
  }
  
  const finalTitle = formTitle || "Create New Stock Entry";

  return (
    <div className="max-w-2xl mx-auto bg-teal p-6 sm:p-8 rounded-lg shadow-xl">
      <h3 className="text-2xl font-semibold text-center mb-6">{finalTitle}</h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-cream/90 mb-2">Date *</label>
          <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} required className={inputClasses}/>
        </div>

        <div>
          <label htmlFor="equipment" className="block text-sm font-medium text-cream/90 mb-2">Equipment *</label>
          {renderEquipmentInput()}
        </div>

        <div>
          <label htmlFor="model" className="block text-sm font-medium text-cream/90 mb-2">Model *</label>
          <input type="text" name="model" id="model" value={formData.model} onChange={handleChange} required className={inputClasses} placeholder="e.g. EJA530E"/>
        </div>

        <div>
          <label htmlFor="number" className="block text-sm font-medium text-cream/90 mb-2">Number (Quantity) *</label>
          <input type="number" name="number" id="number" value={formData.number} onChange={handleChange} required min="0" className={inputClasses} placeholder="e.g. 5"/>
        </div>

        <div>
          <label htmlFor="addOrUse" className="block text-sm font-medium text-cream/90 mb-2">Add / Use *</label>
          <select name="addOrUse" id="addOrUse" value={formData.addOrUse} onChange={handleChange} required className={inputClasses}>
            <option value="Add">Add</option>
            <option value="Use">Use</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-cream/90 mb-2">Status *</label>
          {renderStatusInput()}
        </div>

        <div>
          <label htmlFor="recordBy" className="block text-sm font-medium text-cream/90 mb-2">Record by *</label>
          <input 
            type="text" 
            name="recordBy" 
            id="recordBy" 
            value={formData.recordBy} 
            onChange={handleChange} 
            required 
            autoComplete="name"
            className={inputClasses} 
            placeholder="Enter your name"
          />
        </div>

        <div className="pt-4">
          <button type="submit" disabled={isSubmitting || isLoadingOptions} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-charcoal bg-pale-yellow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pale-yellow focus:ring-offset-teal disabled:bg-pale-yellow/50 disabled:text-charcoal/50 disabled:cursor-not-allowed transition-colors">
            {isSubmitting ? <LoadingSpinner size="h-5 w-5" /> : 'Create Stock Entry'}
          </button>
        </div>
      </form>
       {submitStatus !== 'idle' && (
        <div className="mt-6">
          {submitStatus === 'success' && (
            <div className="flex items-center p-4 bg-pale-yellow/10 border border-pale-yellow/80 text-pale-yellow rounded-lg">
              <SuccessIcon className="h-6 w-6 mr-3 flex-shrink-0" />
              <p>Stock entry added successfully!</p>
            </div>
          )}
          {submitStatus === 'error' && (
            <div className="flex items-start p-4 bg-red-500/10 border border-red-500 text-red-300 rounded-lg text-left">
              <ErrorIcon className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Failed to add item.</p>
                {errorMessage && <p className="text-sm mt-1 break-words">{errorMessage}</p>}
                
                {/* General Permission Help */}
                {(errorMessage.includes('permission') || errorMessage.includes('สิทธิ์') || errorMessage.includes('Failed to parse') || errorMessage.includes('unknown error')) && (
                  <div className="mt-3 text-xs bg-charcoal/60 p-3 rounded opacity-90">
                    <strong>Troubleshooting:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Ensure you created a <strong>New Version</strong> when deploying.</li>
                        <li>Go to "Manage Deployments" &rarr; Edit (pencil icon).</li>
                        <li>Set Version to <strong>New</strong> (not Legacy/1).</li>
                        <li>Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong>.</li>
                        <li className="pt-1 border-t border-white/10 mt-1"><strong>Check Columns:</strong> Ensure Google Sheet has valid headers.</li>
                        <li>Status &rarr; Column G (Index 6)</li>
                        <li>Record By &rarr; Column H (Index 7)</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
       {optionsError && (
         <div className="mt-4 text-xs text-center text-pale-yellow">
            <p>Could not load equipment options from the sheet. Please check your connection.</p>
         </div>
       )}
    </div>
  );
};

export default CreateCustomerForm;