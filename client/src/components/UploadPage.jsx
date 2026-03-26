// src/components/UploadPage.jsx - Bulk upload with accurate progress tracking
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, Loader, CheckCircle, X, Sparkles, Zap, Trash2, List, RefreshCw } from 'lucide-react';
import { uploadFile } from '../services/api';
import { saveToHistory } from '../services/storage';

const MAX_FILES = 10;

const UploadPage = ({ setCurrentResult, setUploadedFile, setResults }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(''); // Upload vs Processing
  const [error, setError] = useState(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [completedFiles, setCompletedFiles] = useState([]);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [failedFiles, setFailedFiles] = useState([]); // Track failed files for retry

  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'];

  const handleFileSelect = (files) => {
    setError(null);
    const newFiles = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check max files limit
      if (selectedFiles.length + newFiles.length >= MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`);
        break;
      }
      
      // Validate file type
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        setError(`${file.name}: Unsupported file type`);
        continue;
      }

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`${file.name}: File size exceeds 50MB limit`);
        continue;
      }

      newFiles.push(file);
    }

    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(Array.from(e.target.files));
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Generate preview data for a file (runs in parallel with upload)
  const generatePreview = (file) => {
    if (file.size > 2 * 1024 * 1024) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      } catch {
        resolve(null);
      }
    });
  };

  // Process a single file (upload + save to history)
  const processSingleFile = async (file, index, totalFiles) => {
    try {
      // Start preview generation immediately (runs in parallel with API call)
      const previewPromise = generatePreview(file);

      setProcessingStatus(`Processing ${file.name}...`);

      // Upload and extract via API
      const result = await uploadFile(file, () => {});

      // Wait for preview (usually already done by now since uploads take longer)
      const previewData = await previewPromise;

      // Save to history
      const savedEntry = saveToHistory(result, previewData);

      // Update progress atomically
      setCompletedFiles(prev => {
        const updated = [...prev, { name: file.name, success: true }];
        setUploadProgress(Math.round((updated.length / totalFiles) * 100));
        return updated;
      });

      return { file, result: savedEntry, success: true };
    } catch (fileError) {
      console.error(`Error processing ${file.name}:`, fileError);
      setCompletedFiles(prev => {
        const updated = [...prev, { name: file.name, success: false }];
        setUploadProgress(Math.round((updated.length / totalFiles) * 100));
        return updated;
      });
      setFailedFiles(prev => [...prev, file]);
      return { file, error: fileError, success: false };
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    setCompletedFiles([]);
    setCurrentFileIndex(0);
    setFailedFiles([]);

    const totalFiles = selectedFiles.length;

    try {
      let results;

      if (totalFiles === 1) {
        // Single file — process directly
        setProcessingStatus(`Processing ${selectedFiles[0].name}...`);
        const res = await processSingleFile(selectedFiles[0], 0, 1);
        results = [res];
      } else {
        // Multiple files — process in parallel with concurrency cap of 3
        const MAX_CONCURRENT = 3;
        results = [];
        setProcessingStatus(`Processing ${totalFiles} files in parallel...`);

        for (let i = 0; i < totalFiles; i += MAX_CONCURRENT) {
          const batch = selectedFiles.slice(i, i + MAX_CONCURRENT);
          const batchPromises = batch.map((file, batchIdx) =>
            processSingleFile(file, i + batchIdx, totalFiles)
          );
          const batchResults = await Promise.allSettled(batchPromises);
          batchResults.forEach(r => {
            results.push(r.status === 'fulfilled' ? r.value : { file: null, success: false, error: r.reason });
          });
        }
      }

      setUploadProgress(100);
      setProcessingStatus('All files processed!');

      // Pass all successful results to App
      const successfulResults = results.filter(r => r.success);
      if (successfulResults.length > 0) {
        if (setResults) {
          const allResults = successfulResults.map(r => r.result);
          const allFiles = successfulResults.map(r => r.file);
          setResults(allResults, allFiles);
        } else {
          const lastResult = successfulResults[successfulResults.length - 1];
          setCurrentResult(lastResult.result);
          setUploadedFile(lastResult.file);
        }
        setUploadComplete(true);
      } else {
        setError('All files failed to process. Check the console for details.');
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      txt: '📝',
      docx: '📘',
      doc: '📘'
    };
    return icons[ext] || '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-cyan-100 
                        border-2 border-blue-200 px-5 py-2 rounded-full mb-6">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-bold text-blue-700">AI-Powered Extraction • Bulk Upload</span>
          </div>
          <h1 className="text-5xl font-extrabold text-gray-800 mb-4 leading-tight">
            Upload Medical<br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Referral Documents
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Upload up to <strong>{MAX_FILES} files</strong> at once for batch AI extraction
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 mb-10 border border-gray-100">
          {selectedFiles.length === 0 ? (
            <div
              className={`
                border-4 border-dashed rounded-2xl p-16 text-center transition-all duration-300
                cursor-pointer relative overflow-hidden
                ${dragActive 
                  ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50'
                }
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="relative">
                <div className="relative inline-block mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-2xl">
                    <Upload className="h-16 w-16 text-white" />
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-gray-800 mb-3">
                  Drop your files here
                </h3>
                <p className="text-lg text-gray-600 mb-8">
                  or click anywhere to browse • up to {MAX_FILES} files
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.doc"
                  onChange={handleFileInputChange}
                  className="hidden"
                  multiple
                />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 
                           text-white px-10 py-5 rounded-xl font-bold text-lg
                           hover:from-blue-700 hover:via-blue-800 hover:to-blue-900
                           transform hover:scale-105 transition-all duration-200
                           shadow-2xl hover:shadow-3xl relative overflow-hidden group"
                >
                  <Upload className="h-6 w-6" />
                  <span>Select Files to Upload</span>
                  <Zap className="h-5 w-5" />
                </button>
                
                <div className="mt-10 pt-8 border-t-2 border-gray-200">
                  <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-semibold">PDF, JPG, PNG, TXT, DOCX</span>
                    </div>
                    <div className="w-px h-6 bg-gray-300"></div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-semibold">Max 50MB each</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* File List Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <List className="h-6 w-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-800">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || selectedFiles.length >= MAX_FILES}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-sm disabled:opacity-50"
                  >
                    + Add More
                  </button>
                  <button
                    onClick={clearAllFiles}
                    disabled={uploading}
                    className="flex items-center space-x-1 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.doc"
                onChange={handleFileInputChange}
                className="hidden"
                multiple
              />

              {/* File List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedFiles.map((file, index) => {
                  const completed = completedFiles.find(f => f.name === file.name);
                  const isCurrentFile = uploading && index === currentFileIndex;
                  
                  return (
                    <div 
                      key={`${file.name}-${index}`}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all
                        ${isCurrentFile ? 'bg-blue-50 border-blue-300' : 
                          completed?.success ? 'bg-green-50 border-green-200' : 
                          completed?.success === false ? 'bg-red-50 border-red-200' : 
                          'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl">{getFileIcon(file.name)}</div>
                        <div>
                          <p className="font-semibold text-gray-800">{file.name}</p>
                          <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {isCurrentFile && (
                          <Loader className="h-5 w-5 animate-spin text-blue-600" />
                        )}
                        {completed?.success && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        {completed?.success === false && (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        {!uploading && (
                          <button
                            onClick={() => removeFile(index)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Display */}
              {uploading && (
                <div className="space-y-4 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Loader className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-gray-800 font-bold text-lg">
                        {processingStatus}
                      </span>
                    </div>
                    <span className="text-blue-600 font-bold text-2xl">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 h-4 rounded-full 
                               transition-all duration-300 ease-out relative overflow-hidden"
                      style={{ width: `${uploadProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    Processing file {currentFileIndex + 1} of {selectedFiles.length}
                  </div>
                </div>
              )}

              {/* Success Completion State */}
              {uploadComplete && (
                <div className="space-y-4 p-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-300">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                      <CheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-800 mb-2">
                      Processing Complete!
                    </h3>
                    <p className="text-green-700 text-lg mb-1">
                      {completedFiles.filter(f => f.success).length} of {completedFiles.length} file{completedFiles.length !== 1 ? 's' : ''} processed successfully
                    </p>
                    {completedFiles.some(f => !f.success) && (
                      <p className="text-red-600 text-sm">
                        {completedFiles.filter(f => !f.success).length} file{completedFiles.filter(f => !f.success).length !== 1 ? 's' : ''} failed
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate('/output')}
                    className="w-full py-5 rounded-2xl font-bold text-white text-xl
                      flex items-center justify-center space-x-3
                      bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 
                      hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 
                      hover:scale-[1.02] shadow-2xl transition-all duration-300 transform"
                  >
                    <FileText className="h-6 w-6" />
                    <span>View Extracted Results</span>
                    <span className="text-2xl">→</span>
                  </button>
                  <button
                    onClick={() => {
                      setUploadComplete(false);
                      setSelectedFiles([]);
                      setCompletedFiles([]);
                      setUploadProgress(0);
                    }}
                    className="w-full py-3 rounded-xl font-medium text-gray-600 text-sm
                      hover:bg-gray-100 transition-all duration-200 border border-gray-300"
                  >
                    Upload More Files
                  </button>
                </div>
              )}

              {/* Upload Button */}
              {!uploadComplete && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={`
                  w-full py-6 rounded-2xl font-bold text-white text-xl
                  flex items-center justify-center space-x-4
                  transition-all duration-300 transform
                  ${uploading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 hover:from-green-700 hover:via-green-800 hover:to-emerald-800 hover:scale-[1.02] shadow-2xl'
                  }
                `}
              >
                {uploading ? (
                  <>
                    <Loader className="h-7 w-7 animate-spin" />
                    <span>Processing {currentFileIndex + 1} of {selectedFiles.length}...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-7 w-7" />
                    <span>Upload & Extract {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}</span>
                    <Zap className="h-6 w-6" />
                  </>
                )}
              </button>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl">
              <div className="flex items-start space-x-4">
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertCircle className="h-7 w-7 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-800 text-xl mb-1">Error</p>
                  <p className="text-red-700 text-lg">{error}</p>
                </div>
              </div>
              {/* Retry Button */}
              <button
                onClick={() => {
                  setError(null);
                  if (failedFiles.length > 0) {
                    // Retry only the failed files
                    setSelectedFiles(failedFiles);
                    setFailedFiles([]);
                    setCompletedFiles([]);
                    setUploadProgress(0);
                  }
                  // User can click the upload button to retry
                }}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-semibold 
                         rounded-xl hover:bg-red-700 transition-all shadow-md"
              >
                <RefreshCw className="h-5 w-5" />
                <span>{failedFiles.length > 0 ? `Retry ${failedFiles.length} Failed File${failedFiles.length !== 1 ? 's' : ''}` : 'Try Again'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2 group">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-bold text-gray-800 mb-3 text-xl">Multi-Format Support</h3>
            <p className="text-gray-600 leading-relaxed">
              Works seamlessly with PDFs, images, text files, and Word documents
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2 group">
            <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-bold text-gray-800 mb-3 text-xl">Batch Processing</h3>
            <p className="text-gray-600 leading-relaxed">
              Upload up to {MAX_FILES} files at once with accurate progress tracking
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:-translate-y-2 group">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-bold text-gray-800 mb-3 text-xl">Lightning Fast</h3>
            <p className="text-gray-600 leading-relaxed">
              Get results in seconds with instant AI-powered processing
            </p>
          </div>
        </div>

        {/* Shimmer animation */}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
        `}</style>
      </div>
    </div>
  );
};

export default UploadPage;
