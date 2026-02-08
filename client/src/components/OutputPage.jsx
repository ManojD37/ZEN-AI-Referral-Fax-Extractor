// src/components/OutputPage.jsx - Split-screen layout with field sync & multi-doc navigation
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Edit2, Save, X, FileText, ArrowLeft, User, Building, Activity, AlertCircle, Shield, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import FilePreview from './FilePreview';

// Auto-save key for localStorage
const AUTOSAVE_KEY = 'referral_draft';

const OutputPage = ({ result, uploadedFile, allResults = [], currentIndex = 0, setCurrentIndex }) => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [activeField, setActiveField] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');

  // Load from localStorage on mount, or use result
  useEffect(() => {
    if (!result) {
      // Check for auto-saved draft
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.job_id) {
            setEditedData(parsed.extracted || {});
            return;
          }
        } catch (e) {
          console.error('Failed to load draft:', e);
        }
      }
      navigate('/upload');
      return;
    }
    
    setEditedData(result.extracted || {}); 
  }, [result, navigate]);

  // Auto-save to localStorage when editedData changes
  useEffect(() => {
    if (editedData && result) {
      const draftData = {
        ...result,
        extracted: editedData,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draftData));
    }
  }, [editedData, result]);

  if (!result || !editedData) {
    return null;
  }

  const handleInputChange = (path, value) => {
    const pathArray = path.split('.');
    const newData = JSON.parse(JSON.stringify(editedData)); // Deep clone
    let current = newData;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    setEditedData(newData);
  };

  const handleArrayChange = (path, value) => {
    const array = value.split('\n').filter(item => item.trim());
    handleInputChange(path, array);
  };

  const handleFieldFocus = (path) => {
    setActiveField(path);
  };

  const handleFieldBlur = () => {
    // Keep active for a moment for visual feedback
    setTimeout(() => setActiveField(null), 500);
  };

  const downloadJSON = () => {
    const dataStr = JSON.stringify(editedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `referral_${result.job_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    // Flatten the data for CSV export
    const flatData = {
      'Patient Name': editedData.patient?.full_name || '',
      'Date of Birth': editedData.patient?.date_of_birth || '',
      'Gender': editedData.patient?.gender || '',
      'Phone': editedData.patient?.phone || '',
      'Address': editedData.patient?.address || '',
      'Referral To': editedData.referral?.referral_to || '',
      'Referral Phone': editedData.referral?.referral_phone || '',
      'Referring From': editedData.referral?.referring_from || '',
      'Primary Diagnoses': (editedData.diagnoses?.primary_diagnoses || []).join('; '),
      'Reason for Referral': editedData.reason_for_referral || '',
      'File Number': editedData.file_number || '',
    };
    
    const headers = Object.keys(flatData).join(',');
    const values = Object.values(flatData).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    const csv = `${headers}\n${values}`;
    
    const dataBlob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `referral_${result.job_id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    setEditMode(false);
    setSavedMessage('Changes saved!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const clearDraft = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
  };

  // Input field with focus tracking for sync
  const InputField = ({ label, value, path, type = 'text' }) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
      </label>
      {editMode ? (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => handleInputChange(path, e.target.value)}
          onFocus={() => handleFieldFocus(path)}
          onBlur={handleFieldBlur}
          className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-all
                   ${activeField === path 
                     ? 'border-blue-500 ring-2 ring-blue-200' 
                     : 'border-gray-300 focus:border-blue-500'}`}
        />
      ) : (
        <p 
          className={`px-3 py-2 text-sm bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg text-gray-800 border cursor-pointer hover:border-blue-300 transition-all
                    ${activeField === path ? 'border-blue-400 bg-blue-100' : 'border-gray-200'}`}
          onClick={() => handleFieldFocus(path)}
          onMouseLeave={handleFieldBlur}
        >
          {value || '-'}
        </p>
      )}
    </div>
  );

  const TextAreaField = ({ label, value, path }) => (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
      </label>
      {editMode ? (
        <textarea
          value={Array.isArray(value) ? value.join('\n') : value || ''}
          onChange={(e) => 
            Array.isArray(value) 
              ? handleArrayChange(path, e.target.value)
              : handleInputChange(path, e.target.value)
          }
          onFocus={() => handleFieldFocus(path)}
          onBlur={handleFieldBlur}
          rows={3}
          className={`w-full px-3 py-2 text-sm border-2 rounded-lg transition-all
                   ${activeField === path 
                     ? 'border-blue-500 ring-2 ring-blue-200' 
                     : 'border-gray-300 focus:border-blue-500'}`}
        />
      ) : (
        <p 
          className={`px-3 py-2 text-sm bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg text-gray-800 whitespace-pre-wrap border cursor-pointer hover:border-blue-300 transition-all min-h-[60px]
                    ${activeField === path ? 'border-blue-400 bg-blue-100' : 'border-gray-200'}`}
          onClick={() => handleFieldFocus(path)}
          onMouseLeave={handleFieldBlur}
        >
          {Array.isArray(value) ? value.join('\n') : value || '-'}
        </p>
      )}
    </div>
  );

  const classification = result.classification || {};
  const isReferral = classification.is_referral === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-20 pb-8">
      {/* Add PDF.js script for PDF rendering */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      
      {/* Header Bar - Fixed */}
      <div className="fixed top-20 left-0 right-0 z-40 bg-white shadow-md border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-4 py-2.5">
          <div className="grid grid-cols-3 items-center gap-4">
            {/* Left - Back button */}
            <div className="flex justify-start">
              <button
                onClick={() => { clearDraft(); navigate('/upload'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:text-blue-600 
                         hover:bg-blue-50 rounded-lg transition-all font-medium text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            </div>
            
            {/* Center - Document Navigation */}
            <div className="flex items-center justify-center gap-2">
              {allResults.length > 1 && (
                <div className="flex items-center gap-1 bg-gray-100 px-2.5 py-1.5 rounded-lg">
                  <button
                    onClick={() => setCurrentIndex && setCurrentIndex(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-medium text-gray-700 px-1 min-w-[70px] text-center">
                    Doc {currentIndex + 1}/{allResults.length}
                  </span>
                  <button
                    onClick={() => setCurrentIndex && setCurrentIndex(Math.min(allResults.length - 1, currentIndex + 1))}
                    disabled={currentIndex === allResults.length - 1}
                    className="p-1 hover:bg-gray-200 rounded disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              {savedMessage ? (
                <span className="text-green-600 text-xs font-medium">{savedMessage}</span>
              ) : (
                <span className="text-xs text-gray-400">Auto-saved</span>
              )}
            </div>
            
            {/* Right - Action buttons */}
            <div className="flex items-center justify-end gap-1.5">
              {editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 
                             rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white
                             rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white
                           rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
              <div className="w-px h-5 bg-gray-300 mx-0.5" />
              <button
                onClick={downloadJSON}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white
                         rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                <span>JSON</span>
              </button>
              <button
                onClick={downloadCSV}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white
                         rounded-lg hover:bg-purple-700 transition-all text-sm font-medium"
              >
                <FileDown className="h-4 w-4" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Layout */}
      <div className="max-w-[1920px] mx-auto px-4 pt-16">
        <div className="flex gap-6">
          {/* LEFT PANEL - Document Preview (Sticky) */}
          <div className="w-1/2 sticky top-36 h-[calc(100vh-160px)] overflow-hidden">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 h-full p-6 overflow-auto">
              {uploadedFile ? (
                <FilePreview file={uploadedFile} activeField={activeField} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                    <p className="font-bold text-amber-900 text-lg">Preview Not Available</p>
                    <p className="text-amber-700 text-sm mt-2">
                      File was cleared from memory. Data is still available for editing.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL - Editable Form (Scrollable) */}
          <div className="w-1/2 space-y-4">
            {/* Classification Banner */}
            {result.classification && (
              <div className={`p-4 rounded-xl shadow-md ${
                isReferral
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
                  : 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${isReferral ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    {isReferral ? (
                      <Shield className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">
                      {isReferral ? '✓ Medical Referral' : '⚠ Non-Referral Document'}
                    </p>
                    <p className="text-xs text-gray-600">{classification.reason}</p>
                  </div>
                  {typeof classification.confidence === 'number' && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Confidence</p>
                      <p className={`font-bold text-lg ${
                        classification.confidence >= 0.7 ? 'text-green-600' :
                        classification.confidence >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {(classification.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100">
                <p className="text-xs text-gray-500">Job ID</p>
                <p className="font-bold text-gray-800 text-sm truncate">{result.job_id}</p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100">
                <p className="text-xs text-gray-500">File Type</p>
                <p className="font-bold text-gray-800 text-sm uppercase">{result.file_type || result.filename?.split('.').pop() || 'N/A'}</p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100">
                <p className="text-xs text-gray-500">Characters</p>
                <p className="font-bold text-gray-800 text-sm">{result.text_stats?.character_count?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100">
                <p className="text-xs text-gray-500">Words</p>
                <p className="font-bold text-gray-800 text-sm">{result.text_stats?.word_count?.toLocaleString() || 0}</p>
              </div>
            </div>

            {/* Patient Information */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="bg-green-500 p-2 rounded-lg mr-2">
                  <User className="h-4 w-4 text-white" />
                </div>
                Patient Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Full Name" value={editedData.patient?.full_name} path="patient.full_name" />
                <InputField label="Phone" value={editedData.patient?.phone} path="patient.phone" />
                <InputField label="Date of Birth" value={editedData.patient?.date_of_birth} path="patient.date_of_birth" type="date" />
                <InputField label="Gender" value={editedData.patient?.gender} path="patient.gender" />
                <div className="col-span-2">
                  <InputField label="Address" value={editedData.patient?.address} path="patient.address" />
                </div>
              </div>
            </div>

            {/* Referral Information */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="bg-purple-500 p-2 rounded-lg mr-2">
                  <Building className="h-4 w-4 text-white" />
                </div>
                Referral Information
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="col-span-2 text-sm font-semibold text-blue-700">Referring To</h3>
                <InputField label="Facility/Doctor" value={editedData.referral?.referral_to} path="referral.referral_to" />
                <InputField label="Contact" value={editedData.referral?.referral_focal_point} path="referral.referral_focal_point" />
                <InputField label="Phone" value={editedData.referral?.referral_phone} path="referral.referral_phone" />
                <InputField label="Email" value={editedData.referral?.referral_email} path="referral.referral_email" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="col-span-2 text-sm font-semibold text-green-700">Referring From</h3>
                <InputField label="Facility/Doctor" value={editedData.referral?.referring_from} path="referral.referring_from" />
                <InputField label="Contact" value={editedData.referral?.referring_focal_point} path="referral.referring_focal_point" />
                <InputField label="Phone" value={editedData.referral?.referring_phone} path="referral.referring_phone" />
                <InputField label="Email" value={editedData.referral?.referring_email} path="referral.referring_email" />
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="bg-red-500 p-2 rounded-lg mr-2">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                Medical Information
              </h2>
              <TextAreaField label="Primary Diagnoses" value={editedData.diagnoses?.primary_diagnoses} path="diagnoses.primary_diagnoses" />
              <TextAreaField label="Other Diagnoses" value={editedData.diagnoses?.other_diagnoses} path="diagnoses.other_diagnoses" />
              <TextAreaField label="Treatments" value={editedData.treatments} path="treatments" />
              <TextAreaField label="Reason for Referral" value={editedData.reason_for_referral} path="reason_for_referral" />
            </div>

            {/* Additional Information */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="bg-indigo-500 p-2 rounded-lg mr-2">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                Additional Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Document Title" value={editedData.document_meta?.title} path="document_meta.title" />
                <InputField label="Document Date" value={editedData.document_meta?.date} path="document_meta.date" type="date" />
                <InputField label="Compiled By" value={editedData.compiled_by} path="compiled_by" />
                <InputField label="Position" value={editedData.position} path="position" />
                <InputField label="File Number" value={editedData.file_number} path="file_number" />
                <InputField label="Signature" value={editedData.signature} path="signature" />
              </div>
            </div>

            {/* Bottom spacing */}
            <div className="h-8"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutputPage;
