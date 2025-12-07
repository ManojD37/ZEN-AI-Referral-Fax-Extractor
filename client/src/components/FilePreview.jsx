






// src/components/FilePreview.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, File, AlertCircle } from 'lucide-react';

const FilePreview = ({ file }) => {
  const [preview, setPreview] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      setFileType(null);
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    setFileType(ext);
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
    // For other file types, just show info (no preview)
    else {
      setLoading(false);
    }
  }, [file]);

  if (!file) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-12">
          <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No file uploaded</p>
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

    switch (fileType) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return (
          <div className="space-y-2">
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Document preview"
                  className="w-full rounded-lg shadow-md object-contain max-h-96"
                />
                <div className="text-xs text-gray-500 text-center">
                  {file.name} • {(file.size / 1024).toFixed(2)} KB
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Image file</p>
                <p className="text-sm text-gray-500 mt-2">{file.name}</p>
              </div>
            )}
          </div>
        );

      case 'pdf':
        return (
          <div className="text-center py-12">
            <FileText className="h-24 w-24 text-red-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-800">PDF Document</p>
            <p className="text-sm text-gray-600 mt-2">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(2)} KB
            </p>
            <p className="text-xs text-gray-400 mt-4">
              PDF preview not available. Document has been processed.
            </p>
          </div>
        );

      case 'txt':
        return (
          <div className="space-y-2">
            {preview ? (
              <>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                  <p className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
                    {preview.substring(0, 2000)}
                    {preview.length > 2000 && '\n\n... (text truncated)'}
                  </p>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {file.name} • {(file.size / 1024).toFixed(2)} KB
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Text file</p>
                <p className="text-sm text-gray-500 mt-2">{file.name}</p>
              </div>
            )}
          </div>
        );

      case 'docx':
      case 'doc':
        return (
          <div className="text-center py-12">
            <FileText className="h-24 w-24 text-blue-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-800">Word Document</p>
            <p className="text-sm text-gray-600 mt-2">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(2)} KB
            </p>
            <p className="text-xs text-gray-400 mt-4">
              Document preview not available. File has been processed.
            </p>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <File className="h-24 w-24 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-800">
              {fileType ? `.${fileType}` : 'Unknown'} File
            </p>
            <p className="text-sm text-gray-600 mt-2">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <ImageIcon className="h-5 w-5 mr-2" />
        Document Preview
      </h2>
      {renderPreview()}
    </div>
  );
};

export default FilePreview;