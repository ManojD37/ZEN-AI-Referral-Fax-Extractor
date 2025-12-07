// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for large files
});

/**
 * Upload a file and get extracted referral information
 * @param {File} file - The file to upload (PDF, JPG, PNG, TXT, DOCX)
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise} Response with extracted data
 */
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Get supported file formats
 * @returns {Promise} List of supported formats
 */
export const getSupportedFormats = async () => {
  try {
    const response = await api.get('/supported-formats');
    return response.data;
  } catch (error) {
    console.error('Error fetching supported formats:', error);
    return {
      supported_formats: ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'],
      descriptions: {
        '.pdf': 'Portable Document Format (OCR)',
        '.jpg': 'JPEG Image (OCR)',
        '.jpeg': 'JPEG Image (OCR)',
        '.png': 'PNG Image (OCR)',
        '.txt': 'Plain Text',
        '.docx': 'Microsoft Word Document'
      }
    };
  }
};

/**
 * Health check
 * @returns {Promise} Server status
 */
export const healthCheck = async () => {
  try {
    const response = await api.get('/');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

