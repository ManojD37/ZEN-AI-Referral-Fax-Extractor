


// ------------------------------------------------------------------------------------------------------

// src/components/HistoryPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, 
  Trash2, 
  Download, 
  Eye, 
  Calendar, 
  FileText,
  Search,
  AlertCircle,
  Clock,
  User,
  Building,
  TrendingUp,
  Filter
} from 'lucide-react';
import { getHistory, deleteHistoryItem, clearHistory } from '../services/storage';

const HistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [searchTerm, history]);

  const loadHistory = () => {
    const data = getHistory();
    setHistory(data);
    setFilteredHistory(data);
  };

  const filterHistory = () => {
    if (!searchTerm.trim()) {
      setFilteredHistory(history);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = history.filter(item => {
      const patientName = item.extracted?.patient?.full_name?.toLowerCase() || '';
      const referralTo = item.extracted?.referral?.referral_to?.toLowerCase() || '';
      const fileNumber = item.extracted?.file_number?.toLowerCase() || '';
      const jobId = item.job_id?.toLowerCase() || '';
      
      return (
        patientName.includes(term) ||
        referralTo.includes(term) ||
        fileNumber.includes(term) ||
        jobId.includes(term)
      );
    });

    setFilteredHistory(filtered);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteHistoryItem(id);
      loadHistory();
    }
  };

  const handleClearAll = () => {
    clearHistory();
    loadHistory();
    setShowClearConfirm(false);
  };

  const handleDownload = (item) => {
    const dataStr = JSON.stringify(item.extracted, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `referral_${item.job_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl shadow-lg">
              <History className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-extrabold text-gray-800 leading-tight">
                Processing History
              </h1>
              <p className="text-xl text-gray-600 mt-2">
                View and manage your previously processed documents
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 font-semibold">Total Documents</p>
              <FileText className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{history.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 font-semibold">This Month</p>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {history.filter(item => {
                const date = new Date(item.timestamp);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 font-semibold">Filtered Results</p>
              <Filter className="h-6 w-6 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{filteredHistory.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 font-semibold">Latest Update</p>
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <p className="text-lg font-bold text-gray-800">
              {history.length > 0 ? 'Today' : 'None'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-2xl shadow-xl mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name, facility, file number, or job ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl 
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all
                         text-gray-800 placeholder-gray-400 font-medium"
              />
            </div>

            {/* Clear All Button */}
            {history.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center space-x-2 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 
                         text-white rounded-xl hover:from-red-700 hover:to-red-800 
                         transition-all font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Trash2 className="h-5 w-5" />
                <span>Clear All History</span>
              </button>
            )}
          </div>
        </div>

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100">
              <div className="bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3 text-center">Clear All History?</h3>
              <p className="text-gray-600 mb-8 text-center leading-relaxed">
                This will permanently delete all <span className="font-bold text-gray-800">{history.length}</span> items from your history. 
                This action cannot be undone.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50 
                           transition-all font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white 
                           rounded-xl hover:from-red-700 hover:to-red-800 transition-all font-bold shadow-lg"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl shadow-xl text-center border border-gray-100">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <History className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-3">
              {history.length === 0 ? 'No History Yet' : 'No Results Found'}
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              {history.length === 0 
                ? 'Upload your first document to get started with AI-powered extraction'
                : 'Try adjusting your search terms to find what you\'re looking for'
              }
            </p>
            {history.length === 0 && (
              <button
                onClick={() => navigate('/upload')}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white 
                         rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold text-lg
                         shadow-lg hover:shadow-xl transform hover:scale-105 transition-all
                         inline-flex items-center space-x-2"
              >
                <FileText className="h-5 w-5" />
                <span>Upload Document</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredHistory.map((item) => (
              <div
                key={item.id || item.job_id}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all border border-gray-100 group"
              >
                <div className="flex items-start justify-between">
                  {/* Left: Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-2xl font-bold text-gray-800">
                            {item.extracted?.patient?.full_name || 'Unknown Patient'}
                          </h3>
                          <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 text-sm font-bold rounded-lg border border-blue-200">
                            {item.file_type?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4 pl-16">
                      <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building className="h-4 w-4 text-purple-600" />
                          <p className="font-bold text-gray-700 text-sm">Referral To</p>
                        </div>
                        <p className="text-gray-800 font-semibold">{item.extracted?.referral?.referral_to || '-'}</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <p className="font-bold text-gray-700 text-sm">File Number</p>
                        </div>
                        <p className="text-gray-800 font-semibold">{item.extracted?.file_number || '-'}</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <Calendar className="h-4 w-4 text-orange-600" />
                          <p className="font-bold text-gray-700 text-sm">Processed</p>
                        </div>
                        <p className="text-gray-800 font-semibold">{formatDate(item.timestamp)}</p>
                      </div>
                    </div>

                    <div className="pl-16">
                      <p className="text-sm text-gray-500 font-mono bg-gray-50 inline-block px-3 py-1 rounded-lg border border-gray-200">
                        Job ID: {item.job_id}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-3 ml-6">
                    <button
                      onClick={() => handleDownload(item)}
                      className="p-4 text-green-600 hover:bg-green-50 rounded-xl 
                               transition-all border-2 border-transparent hover:border-green-200
                               hover:shadow-lg transform hover:scale-110"
                      title="Download JSON"
                    >
                      <Download className="h-6 w-6" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id || item.job_id)}
                      className="p-4 text-red-600 hover:bg-red-50 rounded-xl 
                               transition-all border-2 border-transparent hover:border-red-200
                               hover:shadow-lg transform hover:scale-110"
                      title="Delete"
                    >
                      <Trash2 className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Note about Storage */}
        <div className="mt-10 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6 flex items-start space-x-4 shadow-lg">
          <div className="bg-blue-100 p-2 rounded-lg">
            <AlertCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-blue-900 mb-2 text-lg">Local Storage Notice</p>
            <p className="text-blue-800 leading-relaxed">
              History is currently stored locally in your browser. 
              Azure Blob Storage integration is coming soon for persistent cloud storage across all your devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;