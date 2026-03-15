// src/services/storage.js
// Local storage for now, will be replaced with Azure Blob Storage

const STORAGE_KEY = 'medical_referral_history';

/**
 * Normalize history entries — ensure every entry has an `id` and `status`.
 */
const normalizeEntry = (entry, idx) => {
  const id = entry.id || entry.job_id || `local_${entry.timestamp || idx}_${idx}`;
  return {
    ...entry,
    id,
    status: entry.status || 'new',
  };
};

/**
 * Save extraction result to local storage
 * @param {Object} result - Extraction result from backend
 */
/**
 * Save extraction result to local storage
 * @param {Object} result - Extraction result from backend
 * @param {string} [previewData] - Optional base64 representation of the document for preview
 */
export const saveToHistory = (result, previewData = null) => {
  try {
    const history = getHistory();
    const newEntry = {
      ...result,
      timestamp: new Date().toISOString(),
      id: result.job_id || `local_${Date.now()}`,
      status: 'new',
      previewData: previewData,
    };
    
    history.unshift(newEntry);
    const trimmedHistory = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    return newEntry;
  } catch (error) {
    console.error('Error saving to history:', error);
    throw error;
  }
};

/**
 * Get all history entries (normalized with id and status)
 * @returns {Array} Array of extraction results
 */
export const getHistory = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const raw = JSON.parse(data);
    return raw.map(normalizeEntry);
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
    return history.find(item => item.id === id) || null;
  } catch (error) {
    console.error('Error getting history item:', error);
    return null;
  }
};

/**
 * Update the status of a document in history
 * @param {string} id - Document ID
 * @param {string} status - New status ('new', 'completed', 'rejected')
 * @returns {Object|null} Updated entry or null
 */
export const updateDocumentStatus = (id, status) => {
  try {
    const history = getHistory();
    const index = history.findIndex(item => item.id === id);
    if (index === -1) {
      console.warn('updateDocumentStatus: no match for id', id);
      return null;
    }
    history[index] = { ...history[index], status };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return history[index];
  } catch (error) {
    console.error('Error updating document status:', error);
    throw error;
  }
};

/**
 * Delete a history entry
 * @param {string} id - Document ID
 */
export const deleteHistoryItem = (id) => {
  try {
    const history = getHistory();
    const filtered = history.filter(item => item.id !== id);
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