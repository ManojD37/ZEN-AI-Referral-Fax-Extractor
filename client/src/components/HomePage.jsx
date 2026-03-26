// src/components/HomePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, Zap, Shield, Clock, CheckCircle, ArrowRight, Sparkles,
  Filter, XCircle, ChevronLeft, ChevronRight, Calendar, Building, User, Search, X,
  Trash2, ArrowUpDown, AlertCircle
} from 'lucide-react';
import { getSupportedFormats } from '../services/api';
import { getHistory, updateDocumentStatus, clearHistory } from '../services/storage';

const ITEMS_PER_PAGE = 8;

const HomePage = ({ setResults }) => {
  const navigate = useNavigate();
  const [supportedFormats, setSupportedFormats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');  // default: newest first
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadSupportedFormats();
    loadDocuments();
  }, []);

  const loadSupportedFormats = async () => {
    try {
      const data = await getSupportedFormats();
      setSupportedFormats(data);
    } catch (error) {
      console.error('Error loading formats:', error);
    }
  };

  const loadDocuments = () => {
    const history = getHistory();
    setDocuments(history);
  };

  // Filter documents by status and search query, then sort
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];

    // Status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.status === activeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => {
        const filename = (doc.filename || '').toLowerCase();
        const patientName = (doc.extracted?.patient?.full_name || '').toLowerCase();
        const referralTo = (doc.extracted?.referral?.referral_to || '').toLowerCase();
        const diagnoses = (doc.extracted?.diagnoses?.primary_diagnoses || []).join(' ').toLowerCase();
        const fileType = (doc.file_type || '').toLowerCase();
        return filename.includes(q) || patientName.includes(q) || referralTo.includes(q) || diagnoses.includes(q) || fileType.includes(q);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
        case 'date_desc':
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        case 'name_asc':
          return (a.extracted?.patient?.full_name || '').localeCompare(b.extracted?.patient?.full_name || '');
        case 'name_desc':
          return (b.extracted?.patient?.full_name || '').localeCompare(a.extracted?.patient?.full_name || '');
        case 'file_asc':
          return (a.filename || '').localeCompare(b.filename || '');
        case 'file_desc':
          return (b.filename || '').localeCompare(a.filename || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [documents, activeFilter, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE));
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocuments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocuments, currentPage]);

  // Reset page when filter, search, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery, sortBy]);

  // Status counts (always from full documents list, not filtered)
  const statusCounts = useMemo(() => ({
    all: documents.length,
    new: documents.filter(d => d.status === 'new').length,
    completed: documents.filter(d => d.status === 'completed').length,
    rejected: documents.filter(d => d.status === 'rejected').length,
  }), [documents]);

  const handleStatusChange = (id, newStatus) => {
    const result = updateDocumentStatus(id, newStatus);
    if (result) {
      loadDocuments();
    } else {
      console.error('Failed to update status for document:', id);
    }
  };

  const handleClearAll = () => {
    clearHistory();
    setDocuments([]);
    setShowClearConfirm(false);
    setActiveFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleDocumentClick = (doc) => {
    if (setResults) {
      setResults([doc], []);
    }
    navigate('/output');
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getFileIcon = (filename) => {
    const ext = (filename || '').split('.').pop().toLowerCase();
    const icons = { pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', txt: '📝', docx: '📘', doc: '📘' };
    return icons[ext] || '📎';
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-blue-100 text-blue-700 border-blue-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
    };
    const labels = { new: 'New', completed: 'Completed', rejected: 'Rejected' };
    return (
      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const filterTabs = [
    { key: 'all', label: 'All', icon: FileText },
    { key: 'new', label: 'New', icon: Sparkles },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
    { key: 'rejected', label: 'Rejected', icon: XCircle },
  ];

  const sortOptions = [
    { value: 'date_desc', label: 'Newest First' },
    { value: 'date_asc', label: 'Oldest First' },
    { value: 'name_asc', label: 'Patient Name A–Z' },
    { value: 'name_desc', label: 'Patient Name Z–A' },
    { value: 'file_asc', label: 'Filename A–Z' },
    { value: 'file_desc', label: 'Filename Z–A' },
  ];

  const features = [
    {
      icon: FileText, title: 'Multi-Format Support',
      description: 'Upload PDF, images (JPG, PNG), text files, or Word documents',
      color: 'from-blue-500 to-cyan-500', iconBg: 'bg-blue-100', iconColor: '#3b82f6'
    },
    {
      icon: Zap, title: 'AI-Powered Extraction',
      description: 'Advanced AI automatically identifies and extracts referral information',
      color: 'from-yellow-500 to-orange-500', iconBg: 'bg-yellow-100', iconColor: '#f59e0b'
    },
    {
      icon: Shield, title: 'Secure Processing',
      description: 'Your documents are processed securely and never stored permanently',
      color: 'from-green-500 to-emerald-500', iconBg: 'bg-green-100', iconColor: '#22c55e'
    },
    {
      icon: Clock, title: 'Fast Results',
      description: 'Get structured data in seconds, ready for review and export',
      color: 'from-purple-500 to-pink-500', iconBg: 'bg-purple-100', iconColor: '#a855f7'
    }
  ];

  const howItWorks = [
    { step: 1, title: 'Upload Document', description: 'Select and upload your medical referral document in any supported format', icon: Upload },
    { step: 2, title: 'AI Analysis', description: 'Our AI extracts text and identifies key referral information automatically', icon: Sparkles },
    { step: 3, title: 'Review & Edit', description: 'Review the extracted information and make any necessary edits', icon: FileText },
    { step: 4, title: 'Review & Use', description: 'Review the structured data and integrate with your healthcare systems', icon: CheckCircle }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-800/20 to-blue-900/40"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-semibold text-white">AI-Powered Technology</span>
            </div>
            
            <h1 className="text-6xl font-extrabold mb-6 text-white leading-tight">
              ZenAI Referral<br />
              <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Extractor</span>
            </h1>
            
            <p className="text-xl mb-10 text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Automatically extract structured information from medical referral documents 
              using AI-powered text recognition and intelligent data extraction
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/upload')}
                className="group bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-bold 
                         hover:bg-blue-50 transition-all duration-300 shadow-2xl
                         flex items-center space-x-3 hover:scale-105 transform"
              >
                <Upload className="h-6 w-6" />
                <span>Upload Document</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-blue-500/20 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 
                         rounded-xl text-lg font-bold hover:bg-blue-500/30 transition-all duration-300
                         flex items-center space-x-2"
              >
                <span>Learn How</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-16 fill-slate-50">
            <path d="M0,0 C150,80 350,80 600,50 C850,20 1050,20 1200,50 L1200,120 L0,120 Z"></path>
          </svg>
        </div>
      </div>

      {/* ====== RECENT EXTRACTIONS SECTION ====== */}
      {documents.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header with Clear All */}
          <div className="flex items-center justify-between mb-10">
            <div className="text-center flex-1">
              <h2 className="text-4xl font-bold mb-3 text-gray-800">Recent Extractions</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Manage and review your recently processed documents
              </p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold
                       hover:bg-red-100 border border-red-200 hover:border-red-300 transition-all flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold
                  transition-all duration-200 border-2
                  ${activeFilter === tab.key
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 shadow-sm'
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full font-bold
                  ${activeFilter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  {statusCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Search Bar + Sort Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3 mb-8 max-w-4xl mx-auto">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by filename, patient, facility, diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3 text-sm border-2 border-gray-200 rounded-xl 
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all
                         bg-white shadow-sm placeholder-gray-400 font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none pl-9 pr-10 py-3 text-sm border-2 border-gray-200 rounded-xl 
                         bg-white shadow-sm font-semibold text-gray-600 cursor-pointer
                         focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none rotate-90" />
            </div>
          </div>

          {/* Documents Table */}
          {paginatedDocuments.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200">
                      <th className="text-left px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Document</th>
                      <th className="text-left px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider hidden md:table-cell">Patient</th>
                      <th className="text-left px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider hidden lg:table-cell">Referral To</th>
                      <th className="text-left px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider hidden sm:table-cell">Date</th>
                      <th className="text-right px-6 py-4 font-bold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedDocuments.map((doc) => {
                      const patientName = doc.extracted?.patient?.full_name || 'Unknown Patient';
                      const referralTo = doc.extracted?.referral?.referral_to || 'N/A';

                      return (
                        <tr
                          key={doc.id}
                          onClick={() => handleDocumentClick(doc)}
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors duration-150 group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xl flex-shrink-0">{getFileIcon(doc.filename)}</span>
                              <span className="font-semibold text-gray-800 truncate max-w-[200px] group-hover:text-blue-600 transition-colors">
                                {doc.filename || 'Document'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className="text-gray-600 truncate block max-w-[180px]">{patientName}</span>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <span className="text-gray-600 truncate block max-w-[180px]">{referralTo}</span>
                          </td>
                          <td className="px-6 py-4 hidden sm:table-cell">
                            <span className="text-gray-500 text-xs whitespace-nowrap">{formatDate(doc.timestamp)}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {getStatusBadge(doc.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl shadow-lg text-center border border-gray-100 mb-8">
              <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Filter className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">No Documents Found</h3>
              <p className="text-gray-500">
                No documents match the current <span className="font-semibold capitalize">"{activeFilter}"</span> filter
                {searchQuery && <> and search query "<span className="font-semibold">{searchQuery}</span>"</>}.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                  bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 shadow-sm
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all
                      ${currentPage === page
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                  bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 shadow-sm
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100">
            <div className="bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">Clear All Documents?</h3>
            <p className="text-gray-600 mb-8 text-center leading-relaxed">
              This will permanently delete all <span className="font-bold text-gray-800">{documents.length}</span> documents 
              from your local history. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-6 py-3.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 
                         transition-all font-bold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white 
                         rounded-xl hover:from-red-700 hover:to-red-800 transition-all font-bold shadow-lg"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-gray-800">Powerful Features</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to streamline your medical referral processing
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index}
              className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl 
                       transition-all duration-300 border border-gray-100 hover:border-transparent hover:-translate-y-2">
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 
                             group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
              <div className="relative">
                <div className={`${feature.iconBg} w-16 h-16 rounded-xl flex items-center justify-center mb-6
                              group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-8 w-8" style={{ color: feature.iconColor }} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-800">How It Works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Four simple steps to extract your medical referral data
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-8 rounded-2xl shadow-lg 
                              hover:shadow-xl transition-all duration-300 border border-gray-100 h-full">
                  <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 
                                text-white rounded-xl text-2xl font-bold mb-6 shadow-lg">
                    {item.step}
                  </div>
                  <div className="bg-white w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow">
                    <item.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-4 z-10 items-center justify-center">
                    <ArrowRight className="h-8 w-8 text-blue-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Supported Formats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-gray-800">Supported File Formats</h2>
          <p className="text-lg text-gray-600">Upload any of these file types for instant processing</p>
        </div>
        {supportedFormats && supportedFormats.supported_formats && (
          <div className="bg-white rounded-2xl shadow-xl p-10 max-w-4xl mx-auto border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {supportedFormats.supported_formats.map((format) => {
                const fallbackDescriptions = {
                  '.pdf': 'Portable Document Format (OCR)', '.jpg': 'JPEG Image (OCR)',
                  '.jpeg': 'JPEG Image (OCR)', '.png': 'PNG Image (OCR)',
                  '.txt': 'Plain Text', '.docx': 'Microsoft Word Document'
                };
                const description = supportedFormats.descriptions?.[format] || fallbackDescriptions[format] || 'Supported format';
                return (
                  <div key={format}
                    className="flex items-start space-x-4 p-5 bg-gradient-to-br from-slate-50 to-blue-50 
                             rounded-xl hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-blue-200">
                    <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 mb-1">{format}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-4xl font-bold mb-4 text-white">Ready to Extract Your Referrals?</h2>
          <p className="text-xl mb-10 text-blue-100 max-w-2xl mx-auto">
            Upload your first document and experience the power of AI-driven extraction
          </p>
          <button onClick={() => navigate('/upload')}
            className="group bg-white text-blue-600 px-10 py-5 rounded-xl text-lg font-bold 
                     hover:bg-blue-50 transition-all duration-300 shadow-2xl
                     inline-flex items-center space-x-3 hover:scale-105 transform">
            <Upload className="h-6 w-6" />
            <span>Get Started Now</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-12 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <FileText className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold text-white">ZenAI Referral Extractor</span>
            </div>
            <p className="text-slate-400 mb-2">© 2025 ZenAI Referral Extractor. All rights reserved.</p>
            <p className="text-slate-500 text-sm">Powered by Azure OpenAI & Advanced AI Technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;