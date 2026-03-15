// src/App.jsx
// Main application component — sets up routing, manages global state.
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import UploadPage from './components/UploadPage';
import OutputPage from './components/OutputPage';

import AdminSettings from './components/AdminSettings';
import './App.css';

function App() {
  // Support multiple results for bulk upload
  const [allResults, setAllResults] = useState([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [allUploadedFiles, setAllUploadedFiles] = useState([]);

  // Get current result and file
  const currentResult = allResults[currentResultIndex] || null;
  const uploadedFile = allUploadedFiles[currentResultIndex] || null;

  // Handlers for setting results
  const handleSetResults = (results, files) => {
    setAllResults(results);
    setAllUploadedFiles(files);
    setCurrentResultIndex(0);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage setResults={handleSetResults} />} />
          <Route 
            path="/upload" 
            element={
              <UploadPage 
                setResults={handleSetResults}
                setCurrentResult={(r) => handleSetResults([r], [])}
                setUploadedFile={() => {}}
              />
            } 
          />
          <Route 
            path="/output" 
            element={
              <OutputPage 
                result={currentResult}
                uploadedFile={uploadedFile}
                allResults={allResults}
                allUploadedFiles={allUploadedFiles}
                currentIndex={currentResultIndex}
                setCurrentIndex={setCurrentResultIndex}
              />
            } 
          />

          <Route path="/admin" element={<AdminSettings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
