// src/components/FilePreview.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Image as ImageIcon, File, AlertCircle, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

const FilePreview = ({ file, activeField, onFieldHighlight }) => {
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pdfPages, setPdfPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const containerRef = useRef(null);

  // Field position mapping for sync highlighting (approximate positions)
  const fieldPositions = {
    'patient.full_name': { top: '15%', left: '20%' },
    'patient.date_of_birth': { top: '18%', left: '60%' },
    'referral.referral_to': { top: '25%', left: '20%' },
    'referral.referring_from': { top: '35%', left: '20%' },
    'diagnoses.primary_diagnoses': { top: '50%', left: '20%' },
    'reason_for_referral': { top: '65%', left: '20%' },
  };

  useEffect(() => {
    if (!file) {
      setPreview(null);
      setFileType(null);
      setPdfPages([]);
      return;
    }

    const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
    setFileType(ext);
    
    // If we have pre-generated base64 preview data (e.g., from history)
    if (file.previewData) {
      if (ext === 'txt') {
        try {
          const base64Content = file.previewData.split(',')[1];
          if (base64Content) {
            const decodedBytes = atob(base64Content);
            const bytes = new Uint8Array(decodedBytes.length);
            for (let i = 0; i < decodedBytes.length; i++) {
              bytes[i] = decodedBytes.charCodeAt(i);
            }
            const text = new TextDecoder('utf-8').decode(bytes);
            setPreview(text);
          } else {
            setPreview(file.previewData);
          }
        } catch (e) {
          console.error("Failed to decode text preview", e);
          setPreview(file.previewData);
        }
        setLoading(false);
        return;
      }
      
      if (ext === 'pdf') {
        setLoading(true);
        try {
          const pdfjsLib = window.pdfjsLib;
          if (pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const base64Content = file.previewData.split(',')[1];
            if (base64Content) {
              const binaryString = atob(base64Content);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const loadingTask = pdfjsLib.getDocument({ data: bytes });
              loadingTask.promise.then(async (pdf) => {
                const pages = [];
                for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
                  const page = await pdf.getPage(i);
                  const scale = 1.5;
                  const viewport = page.getViewport({ scale });
                  const canvas = document.createElement('canvas');
                  const context = canvas.getContext('2d');
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  await page.render({ canvasContext: context, viewport }).promise;
                  pages.push(canvas.toDataURL('image/png'));
                }
                setPdfPages(pages);
                if (pages.length > 0) {
                  setPreview(pages[0]);
                }
                setLoading(false);
              }).catch(e => {
                console.error("PDF rendering error", e);
                setPreview(null);
                setLoading(false);
              });
              return;
            }
          }
        } catch (e) {
          console.error("PDF init error", e);
        }
      }

      setPreview(file.previewData);
      setLoading(false);
      return;
    }

    // If this is a mock file from history and we have NO previewData,
    // we can't preview it since we don't have the Blob.
    if (file.isHistory) {
      setPreview(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Generate preview for images
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setPreview(reader.result);
        setLoading(false);
      };
      
      reader.onerror = () => {
        setError('Failed to load image');
        setLoading(false);
      };
      
      reader.readAsDataURL(file);
    }
    // For PDF files - create visual preview using canvas
    else if (ext === 'pdf') {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          // Use PDF.js via CDN for PDF rendering
          const pdfjsLib = window.pdfjsLib;
          if (pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            const loadingTask = pdfjsLib.getDocument({ data: reader.result });
            const pdf = await loadingTask.promise;
            
            const pages = [];
            for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) { // Limit to 5 pages
              const page = await pdf.getPage(i);
              const scale = 1.5;
              const viewport = page.getViewport({ scale });
              
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              
              await page.render({ canvasContext: context, viewport }).promise;
              pages.push(canvas.toDataURL('image/png'));
            }
            
            setPdfPages(pages);
            if (pages.length > 0) {
              setPreview(pages[0]);
            }
          } else {
            // Fallback if PDF.js not loaded
            setPreview(null);
          }
          setLoading(false);
        } catch (err) {
          console.error('PDF rendering error:', err);
          setError('PDF preview requires PDF.js library');
          setLoading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
    }
    // For text files, read content
    else if (ext === 'txt') {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setPreview(reader.result);
        setLoading(false);
      };
      
      reader.onerror = () => {
        setError('Failed to load text file');
        setLoading(false);
      };
      
      reader.readAsText(file);
    }
    // For other file types
    else {
      setLoading(false);
    }
  }, [file]);

  // Change page for PDF
  const handlePageChange = (delta) => {
    const newPage = Math.max(0, Math.min(pdfPages.length - 1, currentPage + delta));
    setCurrentPage(newPage);
    setPreview(pdfPages[newPage]);
  };

  const handleZoom = (delta) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // If no file but we have a filename (from history), show graceful fallback
  if (!file && !activeField && !onFieldHighlight) {
    // We don't have enough info inside FilePreview alone if just 'file' is missing
    // OutputPage should pass down 'result.filename' or we need to add a prop.
    // Let's check `file` props below:
  }

  if (!file) {
    // If it's a historical file passed as a mock object { name: '...', isHistory: true }
    // we would handle it here. Since OutputPage passes `null` right now if no file,
    // we need to change OutputPage to pass a mock file object.
    return (
      <div className="bg-white rounded-lg h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
        <div className="text-center py-12 px-4">
          <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-lg font-bold text-gray-700 mb-1">Preview Unavailable</p>
          <p className="text-sm text-gray-500 max-w-xs mx-auto text-center leading-relaxed">
            The original document preview is not available for historical extractions.
          </p>
        </div>
      </div>
    );
  }

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-semibold">{error}</p>
          <p className="text-sm text-gray-500 mt-2">{file.name}</p>
        </div>
      );
    }

    // Image preview
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileType)) {
      return (
        <div className="relative">
          {preview ? (
            <div 
              className="overflow-auto max-h-[70vh]"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            >
              <img
                src={preview}
                alt="Document preview"
                className="w-full rounded-lg shadow-md object-contain"
              />
              {/* Field highlight overlay */}
              {activeField && fieldPositions[activeField] && (
                <div 
                  className="absolute w-32 h-8 border-4 border-blue-500 rounded-lg animate-pulse bg-blue-200 bg-opacity-30"
                  style={fieldPositions[activeField]}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Image file</p>
            </div>
          )}
        </div>
      );
    }

    // PDF preview
    if (fileType === 'pdf') {
      return (
        <div className="relative">
          {preview ? (
            <>
              <div 
                className="overflow-auto max-h-[70vh]"
                ref={containerRef}
              >
                <img
                  src={preview}
                  alt={`PDF page ${currentPage + 1}`}
                  className="w-full rounded-lg shadow-md"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                />
                {/* Field highlight overlay */}
                {activeField && fieldPositions[activeField] && (
                  <div 
                    className="absolute w-32 h-8 border-4 border-blue-500 rounded-lg animate-pulse bg-blue-200 bg-opacity-30"
                    style={fieldPositions[activeField]}
                  />
                )}
              </div>
              {/* Page navigation */}
              {pdfPages.length > 1 && (
                <div className="flex items-center justify-center space-x-4 mt-4">
                  <button
                    onClick={() => handlePageChange(-1)}
                    disabled={currentPage === 0}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    Page {currentPage + 1} of {pdfPages.length}
                  </span>
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === pdfPages.length - 1}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-24 w-24 text-red-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-800">PDF Document</p>
              <p className="text-sm text-gray-600 mt-2">{file.name}</p>
              <p className="text-xs text-gray-400 mt-4">
                PDF preview loading... If not visible, PDF.js may not be loaded.
              </p>
            </div>
          )}
        </div>
      );
    }

    // Text file preview
    if (fileType === 'txt') {
      return (
        <div className="space-y-2">
          {preview ? (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-[70vh] overflow-y-auto">
              <p className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
                {preview.substring(0, 3000)}
                {preview.length > 3000 && '\n\n... (text truncated)'}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Text file</p>
            </div>
          )}
        </div>
      );
    }

    // Word document
    if (['docx', 'doc'].includes(fileType)) {
      return (
        <div className="text-center py-12">
          <FileText className="h-24 w-24 text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-800">Word Document</p>
          <p className="text-sm text-gray-600 mt-2">{file.name}</p>
          <p className="text-xs text-gray-400 mt-4">
            Document content has been processed by AI.
          </p>
        </div>
      );
    }

    // Default
    return (
      <div className="text-center py-12">
        <File className="h-24 w-24 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-800">
          {fileType ? `.${fileType}` : 'Unknown'} File
        </p>
        <p className="text-sm text-gray-600 mt-2">{file.name}</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg h-full">
      {/* Zoom controls */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <ImageIcon className="h-5 w-5 mr-2 text-blue-600" />
          Document Preview
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleZoom(-0.25)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-sm text-gray-600 font-medium min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.25)}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* File info */}
      <div className="text-xs text-gray-500 mb-3 flex items-center justify-between">
        <span>{file.name}</span>
        <span>{file.size ? (file.size / 1024).toFixed(2) + ' KB' : 'Unknown Size'}</span>
      </div>
      
      {/* Preview content */}
      {renderPreview()}
    </div>
  );
};

export default FilePreview;