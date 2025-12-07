// src/services/storage.js
// Local storage for now, will be replaced with Azure Blob Storage

const STORAGE_KEY = 'medical_referral_history';

/**
 * Save extraction result to local storage
 * @param {Object} result - Extraction result from backend
 */
export const saveToHistory = (result) => {
  try {
    const history = getHistory();
    const newEntry = {
      ...result,
      timestamp: new Date().toISOString(),
      id: result.job_id,
    };
    
    history.unshift(newEntry); // Add to beginning
    
    // Keep only last 50 entries
    const trimmedHistory = history.slice(0, 50);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    return newEntry;
  } catch (error) {
    console.error('Error saving to history:', error);
    throw error;
  }
};

/**
 * Get all history entries
 * @returns {Array} Array of extraction results
 */
export const getHistory = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
};

/**
 * Get a specific history entry by ID
 * @param {string} id - Job ID
 * @returns {Object|null} Extraction result or null
 */
export const getHistoryById = (id) => {
  try {
    const history = getHistory();
    return history.find(item => item.id === id || item.job_id === id) || null;
  } catch (error) {
    console.error('Error getting history item:', error);
    return null;
  }
};

/**
 * Delete a history entry
 * @param {string} id - Job ID
 */
export const deleteHistoryItem = (id) => {
  try {
    const history = getHistory();
    const filtered = history.filter(item => item.id !== id && item.job_id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting history item:', error);
    throw error;
  }
};

/**
 * Clear all history
 */
export const clearHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
};

// TODO: Azure Blob Storage integration
// When ready, replace these functions with Azure Blob Storage API calls
// Example structure:
/*
export const saveToAzureBlob = async (result) => {
  const { BlobServiceClient } = require('@azure/storage-blob');
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  // ... Azure Blob implementation
};
*/