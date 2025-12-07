// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import UploadPage from './components/UploadPage';
import OutputPage from './components/OutputPage';
import HistoryPage from './components/HistoryPage';
import './App.css';

function App() {
  const [currentResult, setCurrentResult] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/upload" 
            element={
              <UploadPage 
                setCurrentResult={setCurrentResult}
                setUploadedFile={setUploadedFile}
              />
            } 
          />
          <Route 
            path="/output" 
            element={
              <OutputPage 
                result={currentResult}
                uploadedFile={uploadedFile}
              />
            } 
          />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

// src/App.jsx - TEMPORARY TEST VERSION
// src/App.jsx - Test imports one by one
// import React from 'react';
// import { BrowserRouter as Router } from 'react-router-dom';
// import Navbar from './components/Navbar';

// function App() {
//   return (
//     <Router>
//       <div className="min-h-screen bg-gray-50">
//         <Navbar />
//         <h1>Testing...</h1>
//       </div>
//     </Router>
//   );
// }

// export default App;