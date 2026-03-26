// src/components/OutputPage.jsx - Document list with search, detail view with preview, JSON toggle
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Save, X, FileText, ArrowLeft, User, Building, Activity, AlertCircle, Shield, Search, Code, LayoutList, ChevronRight, Calendar, Stethoscope, TrendingUp, FileCheck, Hash, Clock, Keyboard, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import FilePreview from './FilePreview';
import { updateDocumentStatus, getHistoryById } from '../services/storage';

// Auto-save key for localStorage
const AUTOSAVE_KEY = 'referral_draft';

const OutputPage = ({ result, uploadedFile, allResults = [], allUploadedFiles = [], currentIndex = 0, setCurrentIndex }) => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [activeField, setActiveField] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('form'); // 'form' or 'json'
  const [selectedDocIndex, setSelectedDocIndex] = useState(null); // null = list view, number = detail view

  // Load from localStorage on mount, or use result
  useEffect(() => {
    if (!result && allResults.length === 0) {
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
    
    // If single result, go straight to detail view
    if (allResults.length === 1) {
      setSelectedDocIndex(0);
    }
    
    if (result) {
      setEditedData(result.extracted || {}); 
    }
  }, [result, navigate, allResults.length]);

  // Update editedData when selectedDocIndex changes
  useEffect(() => {
    if (selectedDocIndex !== null && allResults[selectedDocIndex]) {
      setEditedData(allResults[selectedDocIndex].extracted || {});
      if (setCurrentIndex) setCurrentIndex(selectedDocIndex);
    }
  }, [selectedDocIndex, allResults, setCurrentIndex]);

  // Auto-save to localStorage when editedData changes
  useEffect(() => {
    const currentResult = selectedDocIndex !== null ? allResults[selectedDocIndex] : result;
    if (editedData && currentResult) {
      const draftData = {
        ...currentResult,
        extracted: editedData,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draftData));
    }
  }, [editedData, result, selectedDocIndex, allResults]);

  // Filter documents based on search
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) {
      return allResults.map((r, i) => ({ ...r, originalIndex: i }));
    }
    const q = searchQuery.toLowerCase();
    return allResults
      .map((r, i) => ({ ...r, originalIndex: i }))
      .filter(r => {
        const filename = (r.filename || '').toLowerCase();
        const patientName = (r.extracted?.patient?.full_name || '').toLowerCase();
        const referralTo = (r.extracted?.referral?.referral_to || '').toLowerCase();
        const referralFrom = (r.extracted?.referral?.referring_from || '').toLowerCase();
        const diagnoses = (r.extracted?.diagnoses?.primary_diagnoses || []).join(' ').toLowerCase();
        const reason = (r.extracted?.reason_for_referral || '').toLowerCase();
        return filename.includes(q) || patientName.includes(q) || 
               referralTo.includes(q) || referralFrom.includes(q) || 
               diagnoses.includes(q) || reason.includes(q);
      });
  }, [allResults, searchQuery]);

  // Compute stats for the list view
  const stats = useMemo(() => {
    const total = allResults.length;
    const referrals = allResults.filter(r => r.classification?.is_referral).length;
    const nonReferrals = total - referrals;
    const avgConfidence = total > 0 
      ? allResults.reduce((sum, r) => sum + (r.classification?.confidence || 0), 0) / total 
      : 0;
    const fileTypes = {};
    allResults.forEach(r => {
      const ext = (r.file_type || r.filename?.split('.').pop() || 'unknown').toUpperCase();
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });
    return { total, referrals, nonReferrals, avgConfidence, fileTypes };
  }, [allResults]);

  const currentResult = selectedDocIndex !== null ? allResults[selectedDocIndex] : result;
  const currentFile = selectedDocIndex !== null ? (allUploadedFiles[selectedDocIndex] || null) : uploadedFile;

  // Keyboard shortcuts: Ctrl+E to toggle edit, Esc to cancel
  // Must be declared before any early returns (Rules of Hooks)
  const handleKeyDown = useCallback((e) => {
    // Ctrl+E: Toggle edit mode
    if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      if (editMode) {
        setEditMode(false);
        setSavedMessage('Changes saved!');
        setTimeout(() => setSavedMessage(''), 3000);
      } else {
        setViewMode('form');
        setEditMode(true);
      }
    }
    // Esc: Cancel edit mode
    if (e.key === 'Escape' && editMode) {
      e.preventDefault();
      setEditMode(false);
    }
  }, [editMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Status management (Complete / Reject / Reset)
  const [docStatus, setDocStatus] = useState(null);

  useEffect(() => {
    const cur = selectedDocIndex !== null ? allResults[selectedDocIndex] : result;
    if (cur) {
      const id = cur.id || cur.job_id || cur.extraction_id;
      if (id) {
        const historyItem = getHistoryById(id);
        if (historyItem && historyItem.status) {
          setDocStatus(historyItem.status);
          return;
        }
      }
      setDocStatus(cur.status || 'new');
    }
  }, [selectedDocIndex, allResults, result]);

  if (!currentResult && allResults.length === 0) {
    return null;
  }

  const handleInputChange = (path, value) => {
    const pathArray = path.split('.');
    const newData = JSON.parse(JSON.stringify(editedData));
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
    setTimeout(() => setActiveField(null), 500);
  };

  const handleSave = () => {
    setEditMode(false);
    setSavedMessage('Changes saved!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const clearDraft = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
  };

  const handleStatusChange = (newStatus) => {
    const cur = selectedDocIndex !== null ? allResults[selectedDocIndex] : result;
    if (!cur) return;
    const id = cur.id || cur.job_id || cur.extraction_id;
    if (!id) {
      console.warn('handleStatusChange: no valid ID found on document', cur);
      // Still update local state so the UI responds
      setDocStatus(newStatus);
      setSavedMessage(`Marked as ${newStatus} (local only)`);
      setTimeout(() => setSavedMessage(''), 3000);
      return;
    }
    updateDocumentStatus(id, newStatus);
    setDocStatus(newStatus);
    setSavedMessage(`Marked as ${newStatus}`);
    setTimeout(() => setSavedMessage(''), 3000);
  };

  // Input field component
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

  const getFileIcon = (filename) => {
    const ext = (filename || '').split('.').pop().toLowerCase();
    const icons = { pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', txt: '📝', docx: '📘', doc: '📘' };
    return icons[ext] || '📎';
  };

  // ============ DOCUMENT LIST VIEW ============
  if (selectedDocIndex === null && allResults.length > 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-24 pb-8 px-4">
        {/* Add PDF.js script */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>

        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { clearDraft(); navigate('/upload'); }}
                className="flex items-center gap-1.5 px-4 py-2 text-gray-700 hover:text-blue-600 
                         hover:bg-blue-50 rounded-lg transition-all font-medium text-sm border border-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Upload</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Extracted Documents</h1>
                <p className="text-sm text-gray-500">{allResults.length} documents processed</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-lg">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total Documents</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2.5 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">{stats.referrals}</p>
                  <p className="text-xs text-gray-500">Referrals</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2.5 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-700">{stats.nonReferrals}</p>
                  <p className="text-xs text-gray-500">Non-Referrals</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2.5 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-700">{(stats.avgConfidence * 100).toFixed(0)}%</p>
                  <p className="text-xs text-gray-500">Avg Confidence</p>
                </div>
              </div>
            </div>
          </div>

          {/* File Type Badges */}
          {Object.keys(stats.fileTypes).length > 0 && (
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs text-gray-500 font-medium">File Types:</span>
              {Object.entries(stats.fileTypes).map(([type, count]) => (
                <span key={type} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 shadow-sm">
                  <Hash className="h-3 w-3" />
                  {type} <span className="text-blue-600">({count})</span>
                </span>
              ))}
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by filename, patient name, referral details, or diagnoses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-base border-2 border-gray-200 rounded-2xl 
                       focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all
                       bg-white shadow-lg placeholder-gray-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Results count */}
          {searchQuery && (
            <p className="text-sm text-gray-500 mb-4">
              Showing {filteredDocs.length} of {allResults.length} documents
            </p>
          )}

          {/* Document Cards */}
          <div className="space-y-3">
            {filteredDocs.map((doc) => {
              const extracted = doc.extracted || {};
              const patientName = extracted.patient?.full_name || 'Unknown Patient';
              const referralTo = extracted.referral?.referral_to || 'N/A';
              const classification = doc.classification || {};
              const isReferral = classification.is_referral === true;
              const confidence = classification.confidence;
              const reason = extracted.reason_for_referral || '';
              const diagnoses = (extracted.diagnoses?.primary_diagnoses || []).join(', ');
              const docDate = extracted.document_meta?.date || '';
              const fileType = (doc.file_type || doc.filename?.split('.').pop() || '').toUpperCase();

              return (
                <div
                  key={doc.originalIndex}
                  onClick={() => setSelectedDocIndex(doc.originalIndex)}
                  className="bg-white rounded-xl shadow-md border border-gray-100 p-5 
                           hover:shadow-xl hover:border-blue-200 hover:-translate-y-0.5
                           cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="text-3xl flex-shrink-0 mt-1">{getFileIcon(doc.filename)}</div>
                      <div className="min-w-0 flex-1">
                        {/* Row 1: Filename + badges */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-bold text-gray-800 text-lg truncate group-hover:text-blue-600 transition-colors">
                            {doc.filename || `Document ${doc.originalIndex + 1}`}
                          </h3>
                          <span className="flex-shrink-0 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-md">
                            {fileType}
                          </span>
                        </div>

                        {/* Row 2: Patient + Referral info */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-green-500" />
                            {patientName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building className="h-3.5 w-3.5 text-purple-500" />
                            {referralTo}
                          </span>
                          {docDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-blue-500" />
                              {docDate}
                            </span>
                          )}
                        </div>

                        {/* Row 3: Diagnoses or reason preview */}
                        {(diagnoses || reason) && (
                          <div className="flex items-start gap-1.5 text-xs text-gray-400">
                            <Stethoscope className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-red-400" />
                            <span className="truncate">{diagnoses || reason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right side: badges + arrow */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex flex-col items-end gap-1.5">
                        {isReferral ? (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Referral
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                            Non-Referral
                          </span>
                        )}
                        {typeof confidence === 'number' && (
                          <span className={`text-xs font-bold ${
                            confidence >= 0.7 ? 'text-green-600' :
                            confidence >= 0.4 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {(confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredDocs.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No documents match your search</p>
                <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ DETAIL VIEW (Split Screen) ============
  if (!editedData) return null;

  const classification = currentResult.classification || {};
  const isReferral = classification.is_referral === true;

  // JSON view renderer
  const JsonView = () => (
    <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-auto max-h-[calc(100vh-280px)]">
        {JSON.stringify(editedData, null, 2)}
      </pre>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-20 pb-8">
      {/* Add PDF.js script for PDF rendering */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      
      {/* Header Bar - Fixed */}
      <div className="fixed top-20 left-0 right-0 z-40 bg-white shadow-md border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-4">
            {/* Left - Back button */}
            <div className="flex items-center gap-2">
              {allResults.length > 1 && selectedDocIndex !== null ? (
                <button
                  onClick={() => { setSelectedDocIndex(null); setEditMode(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:text-blue-600 
                           hover:bg-blue-50 rounded-lg transition-all font-medium text-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>All Documents</span>
                </button>
              ) : (
                <button
                  onClick={() => { clearDraft(); navigate('/upload'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-700 hover:text-blue-600 
                           hover:bg-blue-50 rounded-lg transition-all font-medium text-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
              )}
              {currentResult && (
                <span className="text-sm font-medium text-gray-600 truncate max-w-[300px]">
                  {currentResult.filename || 'Document'}
                </span>
              )}
            </div>
            
            {/* Center - Status + Processing Time */}
            <div className="flex items-center gap-3">
              {currentResult?.processing_time_seconds && (
                <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                  <Clock className="h-3 w-3" />
                  {currentResult.processing_time_seconds}s
                </span>
              )}
              {savedMessage ? (
                <span className="text-green-600 text-xs font-medium">{savedMessage}</span>
              ) : (
                <span className="text-xs text-gray-400">Auto-saved</span>
              )}
              <span className="hidden md:flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md" title="Ctrl+E to edit, Esc to cancel">
                <Keyboard className="h-3 w-3" />
                Shortcuts
              </span>
            </div>
            
            {/* Right - View toggle + Edit */}
            <div className="flex items-center gap-1.5">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('form')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                    ${viewMode === 'form' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <LayoutList className="h-4 w-4" />
                  <span>Form</span>
                </button>
                <button
                  onClick={() => setViewMode('json')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                    ${viewMode === 'json' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Code className="h-4 w-4" />
                  <span>JSON</span>
                </button>
              </div>

              <div className="w-px h-5 bg-gray-300 mx-0.5" />

              {/* Status Action Buttons Moved to Main View */}
              <div className="w-px h-5 bg-gray-300 mx-0.5" />
              
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
                  onClick={() => { setViewMode('form'); setEditMode(true); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white
                           rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
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
              {(currentFile || currentResult?.filename) ? (
                <FilePreview 
                  file={currentFile || { 
                    name: currentResult.filename, 
                    isHistory: true,
                    previewData: currentResult.previewData 
                  }} 
                  activeField={activeField} 
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                    <p className="font-bold text-amber-900 text-lg">Preview Not Available</p>
                    <p className="text-amber-700 text-sm mt-2">
                      Original document could not be found.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL - Extracted Data (Scrollable) */}
          <div className="w-1/2 space-y-4">
            {/* Prominent Action Bar for Setting Status */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Document Status</h3>
                <p className="text-xs text-gray-500">Mark this file as complete or reject it</p>
              </div>
              <div className="flex gap-3">
                {docStatus !== 'rejected' && (
                  <button
                    onClick={() => handleStatusChange('rejected')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-700 font-bold rounded-xl hover:bg-red-100 hover:shadow-sm border border-red-200 transition-all"
                  >
                    <XCircle className="h-5 w-5" />
                    Reject File
                  </button>
                )}
                {docStatus !== 'completed' && (
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 hover:shadow-md transition-all shadow-sm"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Complete File
                  </button>
                )}
                {(docStatus === 'completed' || docStatus === 'rejected') && (
                  <button
                     onClick={() => handleStatusChange('new')}
                     className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 hover:shadow-sm border border-blue-200 transition-all"
                  >
                    <Sparkles className="h-5 w-5" />
                    Reset Status
                  </button>
                )}
              </div>
            </div>

            {/* Classification Banner */}
            {currentResult.classification && (
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
                <p className="font-bold text-gray-800 text-sm truncate">{currentResult.job_id}</p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100">
                <p className="text-xs text-gray-500">File Type</p>
                <p className="font-bold text-gray-800 text-sm uppercase">{currentResult.file_type || currentResult.filename?.split('.').pop() || 'N/A'}</p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100">
                <p className="text-xs text-gray-500">Characters</p>
                <p className="font-bold text-gray-800 text-sm">{currentResult.text_stats?.character_count?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100">
                <p className="text-xs text-gray-500">Words</p>
                <p className="font-bold text-gray-800 text-sm">{currentResult.text_stats?.word_count?.toLocaleString() || 0}</p>
              </div>
            </div>

            {/* JSON View */}
            {viewMode === 'json' && <JsonView />}

            {/* Form View */}
            {viewMode === 'form' && (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutputPage;
