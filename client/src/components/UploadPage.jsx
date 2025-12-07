// src/components/UploadPage.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, Loader, CheckCircle, X, Sparkles, Zap } from 'lucide-react';
import { uploadFile } from '../services/api';
import { saveToHistory } from '../services/storage';

const UploadPage = ({ setCurrentResult, setUploadedFile }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'];

  const handleFileSelect = (file) => {
    setError(null);
    
    // Validate file type
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      setError(`Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`);
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size exceeds 50MB limit');
      return;
    }

    setSelectedFile(file);
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const result = await uploadFile(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      // Save to history
      saveToHistory(result);

      // Set current result and file for OutputPage
      setCurrentResult(result);
      setUploadedFile(selectedFile);

      // Navigate to output page
      navigate('/output');
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.detail || 
        err.message || 
        'Failed to upload file. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
            <span className="text-sm font-bold text-blue-700">AI-Powered Extraction</span>
          </div>
          <h1 className="text-5xl font-extrabold text-gray-800 mb-4 leading-tight">
            Upload Medical<br />
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Referral Document
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Upload a PDF, image, text file, or Word document to extract referral information using advanced AI technology
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 mb-10 border border-gray-100">
          {!selectedFile ? (
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
              {/* Animated background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                  backgroundSize: '32px 32px'
                }}></div>
              </div>

              <div className="relative">
                <div className="relative inline-block mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-2xl">
                    <Upload className="h-16 w-16 text-white" />
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-gray-800 mb-3">
                  Drop your file here
                </h3>
                <p className="text-lg text-gray-600 mb-8">
                  or click anywhere to browse your files
                </p>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.doc"
                  onChange={handleFileInputChange}
                  className="hidden"
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
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                  <Upload className="h-6 w-6 relative z-10" />
                  <span className="relative z-10">Select File to Upload</span>
                  <Zap className="h-5 w-5 relative z-10" />
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
                      <span className="font-semibold">Max 50MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Selected File Display */}
              <div className="flex items-center justify-between p-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 
                            rounded-2xl border-3 border-blue-200 shadow-lg">
                <div className="flex items-center space-x-6">
                  <div className="text-6xl animate-bounce">{getFileIcon(selectedFile.name)}</div>
                  <div>
                    <p className="font-bold text-gray-800 text-xl mb-1">{selectedFile.name}</p>
                    <p className="text-gray-600 font-semibold">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeSelectedFile}
                  disabled={uploading}
                  className="p-4 text-gray-500 hover:text-red-600 hover:bg-red-100 
                           rounded-xl transition-all duration-200 disabled:opacity-50 hover:scale-110"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-4 p-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Loader className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-gray-800 font-bold text-lg">
                        {uploadProgress < 100 ? 'Uploading Document...' : 'Processing with AI...'}
                      </span>
                    </div>
                    <span className="text-blue-600 font-bold text-2xl">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 h-4 rounded-full 
                               transition-all duration-500 ease-out relative overflow-hidden"
                      style={{ width: `${uploadProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-600 pt-2">
                    <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                    <span className="font-medium">AI is analyzing your document...</span>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={`
                  w-full py-6 rounded-2xl font-bold text-white text-xl
                  flex items-center justify-center space-x-4
                  transition-all duration-300 transform relative overflow-hidden
                  ${uploading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-600 via-green-700 to-emerald-700 hover:from-green-700 hover:via-green-800 hover:to-emerald-800 hover:scale-[1.02] shadow-2xl hover:shadow-3xl'
                  }
                `}
              >
                {!uploading && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 hover:opacity-20 transition-opacity"></div>
                )}
                {uploading ? (
                  <>
                    <Loader className="h-7 w-7 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-7 w-7" />
                    <span>Upload & Extract Data</span>
                    <Zap className="h-6 w-6" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-8 p-6 bg-gradient-to-r from-red-50 to-pink-50 border-3 border-red-200 rounded-2xl flex items-start space-x-4 shadow-lg">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-red-800 text-xl mb-1">Upload Failed</p>
                <p className="text-red-700 text-lg">{error}</p>
              </div>
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
            <h3 className="font-bold text-gray-800 mb-3 text-xl">AI-Powered Accuracy</h3>
            <p className="text-gray-600 leading-relaxed">
              Advanced AI extraction with exceptional accuracy and reliability
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

        {/* Add shimmer animation keyframes */}
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

//-----------------------------------------------------------------------------------------------------------------------------

// src/components/UploadPage.jsx
// import React, { useState, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Upload, FileText, AlertCircle, Loader, CheckCircle, X } from 'lucide-react';
// import { uploadFile } from '../services/api';
// import { saveToHistory } from '../services/storage';

// const UploadPage = ({ setCurrentResult, setUploadedFile }) => {
//   const navigate = useNavigate();
//   const fileInputRef = useRef(null);
  
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [dragActive, setDragActive] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [error, setError] = useState(null);

//   const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'];

//   const handleFileSelect = (file) => {
//     setError(null);
    
//     // Validate file type
//     const fileExt = '.' + file.name.split('.').pop().toLowerCase();
//     if (!allowedExtensions.includes(fileExt)) {
//       setError(`Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`);
//       return;
//     }

//     // Validate file size (50MB max)
//     const maxSize = 50 * 1024 * 1024;
//     if (file.size > maxSize) {
//       setError('File size exceeds 50MB limit');
//       return;
//     }

//     setSelectedFile(file);
//   };

//   const handleDrag = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === 'dragenter' || e.type === 'dragover') {
//       setDragActive(true);
//     } else if (e.type === 'dragleave') {
//       setDragActive(false);
//     }
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);

//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       handleFileSelect(e.dataTransfer.files[0]);
//     }
//   };

//   const handleFileInputChange = (e) => {
//     if (e.target.files && e.target.files[0]) {
//       handleFileSelect(e.target.files[0]);
//     }
//   };

//   const handleUpload = async () => {
//     if (!selectedFile) return;

//     setUploading(true);
//     setError(null);
//     setUploadProgress(0);

//     try {
//       const result = await uploadFile(selectedFile, (progress) => {
//         setUploadProgress(progress);
//       });

//       // Save to history
//       saveToHistory(result);

//       // Set current result and file for OutputPage
//       setCurrentResult(result);
//       setUploadedFile(selectedFile);

//       // Navigate to output page
//       navigate('/output');
//     } catch (err) {
//       console.error('Upload error:', err);
//       setError(
//         err.response?.data?.detail || 
//         err.message || 
//         'Failed to upload file. Please try again.'
//       );
//     } finally {
//       setUploading(false);
//     }
//   };

//   const removeSelectedFile = () => {
//     setSelectedFile(null);
//     setError(null);
//     if (fileInputRef.current) {
//       fileInputRef.current.value = '';
//     }
//   };

//   const getFileIcon = (filename) => {
//     const ext = filename.split('.').pop().toLowerCase();
//     const icons = {
//       pdf: '📄',
//       jpg: '🖼️',
//       jpeg: '🖼️',
//       png: '🖼️',
//       txt: '📝',
//       docx: '📘',
//       doc: '📘'
//     };
//     return icons[ext] || '📎';
//   };

//   const formatFileSize = (bytes) => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
//       <div className="max-w-4xl mx-auto">
//         {/* Header Section */}
//         <div className="text-center mb-10">
//           <div className="inline-block p-3 bg-blue-100 rounded-2xl mb-4">
//             <FileText className="h-12 w-12 text-blue-600" />
//           </div>
//           <h1 className="text-4xl font-bold text-gray-800 mb-3">
//             Upload Medical Referral Document
//           </h1>
//           <p className="text-lg text-gray-600 max-w-2xl mx-auto">
//             Upload a PDF, image, text file, or Word document to extract referral information using AI
//           </p>
//         </div>

//         {/* Upload Area */}
//         <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
//           {!selectedFile ? (
//             <div
//               className={`
//                 border-3 border-dashed rounded-xl p-12 text-center transition-all duration-300
//                 cursor-pointer
//                 ${dragActive 
//                   ? 'border-blue-500 bg-blue-50 scale-105' 
//                   : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
//                 }
//               `}
//               onDragEnter={handleDrag}
//               onDragLeave={handleDrag}
//               onDragOver={handleDrag}
//               onDrop={handleDrop}
//               onClick={() => fileInputRef.current?.click()}
//             >
//               <div className="relative inline-block mb-6">
//                 <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
//                 <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-full">
//                   <Upload className="h-12 w-12 text-white" />
//                 </div>
//               </div>
              
//               <h3 className="text-2xl font-bold text-gray-800 mb-2">
//                 Drop your file here
//               </h3>
//               <p className="text-gray-600 mb-6">
//                 or click anywhere to browse
//               </p>
              
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.doc"
//                 onChange={handleFileInputChange}
//                 className="hidden"
//               />
              
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   fileInputRef.current?.click();
//                 }}
//                 className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 
//                          text-white px-8 py-4 rounded-xl font-semibold text-lg
//                          hover:from-blue-700 hover:to-blue-800 
//                          transform hover:scale-105 transition-all duration-200
//                          shadow-lg hover:shadow-xl"
//               >
//                 <Upload className="h-5 w-5" />
//                 <span>Select File</span>
//               </button>
              
//               <div className="mt-6 pt-6 border-t border-gray-200">
//                 <p className="text-sm text-gray-500">
//                   <span className="font-semibold">Supported formats:</span> PDF, JPG, PNG, TXT, DOCX
//                   <span className="mx-2">•</span>
//                   <span className="font-semibold">Max size:</span> 50MB
//                 </p>
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-6">
//               {/* Selected File Display */}
//               <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 
//                             rounded-xl border-2 border-blue-200">
//                 <div className="flex items-center space-x-4">
//                   <div className="text-5xl">{getFileIcon(selectedFile.name)}</div>
//                   <div>
//                     <p className="font-bold text-gray-800 text-lg">{selectedFile.name}</p>
//                     <p className="text-sm text-gray-600 font-medium">
//                       {formatFileSize(selectedFile.size)}
//                     </p>
//                   </div>
//                 </div>
//                 <button
//                   onClick={removeSelectedFile}
//                   disabled={uploading}
//                   className="p-3 text-gray-500 hover:text-red-600 hover:bg-red-100 
//                            rounded-full transition-all duration-200 disabled:opacity-50"
//                 >
//                   <X className="h-6 w-6" />
//                 </button>
//               </div>

//               {/* Upload Progress */}
//               {uploading && (
//                 <div className="space-y-3 p-6 bg-blue-50 rounded-xl border border-blue-200">
//                   <div className="flex items-center justify-between">
//                     <span className="text-gray-700 font-semibold">
//                       {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
//                     </span>
//                     <span className="text-blue-600 font-bold">{uploadProgress}%</span>
//                   </div>
//                   <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
//                     <div
//                       className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full 
//                                transition-all duration-300 ease-out"
//                       style={{ width: `${uploadProgress}%` }}
//                     />
//                   </div>
//                   <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
//                     <Loader className="h-4 w-4 animate-spin" />
//                     <span>AI is analyzing your document...</span>
//                   </div>
//                 </div>
//               )}

//               {/* Upload Button */}
//               <button
//                 onClick={handleUpload}
//                 disabled={uploading}
//                 className={`
//                   w-full py-4 rounded-xl font-bold text-white text-lg
//                   flex items-center justify-center space-x-3
//                   transition-all duration-200 transform
//                   ${uploading 
//                     ? 'bg-gray-400 cursor-not-allowed' 
//                     : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:scale-105 shadow-lg hover:shadow-xl'
//                   }
//                 `}
//               >
//                 {uploading ? (
//                   <>
//                     <Loader className="h-6 w-6 animate-spin" />
//                     <span>Processing...</span>
//                   </>
//                 ) : (
//                   <>
//                     <CheckCircle className="h-6 w-6" />
//                     <span>Upload & Extract Data</span>
//                   </>
//                 )}
//               </button>
//             </div>
//           )}

//           {/* Error Display */}
//           {error && (
//             <div className="mt-6 p-5 bg-red-50 border-2 border-red-200 rounded-xl flex items-start space-x-3">
//               <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
//               <div>
//                 <p className="font-bold text-red-800 text-lg">Upload Failed</p>
//                 <p className="text-red-700">{error}</p>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Info Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
//             <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
//               <FileText className="h-7 w-7 text-blue-600" />
//             </div>
//             <h3 className="font-bold text-gray-800 mb-2 text-lg">Multi-Format Support</h3>
//             <p className="text-gray-600">
//               Works with PDFs, images, text files, and Word documents
//             </p>
//           </div>
          
//           <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
//             <div className="bg-green-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
//               <CheckCircle className="h-7 w-7 text-green-600" />
//             </div>
//             <h3 className="font-bold text-gray-800 mb-2 text-lg">AI-Powered Accuracy</h3>
//             <p className="text-gray-600">
//               Advanced AI extraction with high accuracy and reliability
//             </p>
//           </div>
          
//           <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
//             <div className="bg-purple-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
//               <Upload className="h-7 w-7 text-purple-600" />
//             </div>
//             <h3 className="font-bold text-gray-800 mb-2 text-lg">Lightning Fast</h3>
//             <p className="text-gray-600">
//               Get results in seconds, not minutes. Instant processing
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default UploadPage;