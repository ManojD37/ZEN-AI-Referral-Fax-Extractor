



// // src/components/OutputPage.jsx
// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Download, Edit2, Save, X, FileText, ArrowLeft, User, Building, Activity, AlertCircle, CheckCircle } from 'lucide-react';
// import FilePreview from './FilePreview';

// const OutputPage = ({ result, uploadedFile }) => {
//   const navigate = useNavigate();
//   const [editMode, setEditMode] = useState(false);
//   const [editedData, setEditedData] = useState(null);

//   useEffect(() => {
//     if (!result) {
//       navigate('/upload');
//       return;
//     }
//     setEditedData(result.extracted);
    
//     // Debug log to check if uploadedFile is being received
//     console.log('OutputPage - uploadedFile:', uploadedFile);
//     console.log('OutputPage - result:', result);
//   }, [result, uploadedFile, navigate]);

//   if (!result || !editedData) {
//     return null;
//   }

//   const handleInputChange = (path, value) => {
//     const pathArray = path.split('.');
//     const newData = { ...editedData };
//     let current = newData;
    
//     for (let i = 0; i < pathArray.length - 1; i++) {
//       if (!current[pathArray[i]]) {
//         current[pathArray[i]] = {};
//       }
//       current = current[pathArray[i]];
//     }
    
//     current[pathArray[pathArray.length - 1]] = value;
//     setEditedData(newData);
//   };

//   const handleArrayChange = (path, value) => {
//     const array = value.split('\n').filter(item => item.trim());
//     handleInputChange(path, array);
//   };

//   const downloadJSON = () => {
//     const dataStr = JSON.stringify(editedData, null, 2);
//     const dataBlob = new Blob([dataStr], { type: 'application/json' });
//     const url = URL.createObjectURL(dataBlob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `referral_${result.job_id}.json`;
//     link.click();
//     URL.revokeObjectURL(url);
//   };

//   const InputField = ({ label, value, path, type = 'text' }) => (
//     <div className="mb-4">
//       <label className="block text-sm font-semibold text-gray-700 mb-2">
//         {label}
//       </label>
//       {editMode ? (
//         <input
//           type={type}
//           value={value || ''}
//           onChange={(e) => handleInputChange(path, e.target.value)}
//           className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 
//                    focus:ring-blue-500 focus:border-blue-500 transition-all"
//         />
//       ) : (
//         <p className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg text-gray-800 border border-gray-200">
//           {value || '-'}
//         </p>
//       )}
//     </div>
//   );

//   const TextAreaField = ({ label, value, path }) => (
//     <div className="mb-4">
//       <label className="block text-sm font-semibold text-gray-700 mb-2">
//         {label}
//       </label>
//       {editMode ? (
//         <textarea
//           value={Array.isArray(value) ? value.join('\n') : value || ''}
//           onChange={(e) => 
//             Array.isArray(value) 
//               ? handleArrayChange(path, e.target.value)
//               : handleInputChange(path, e.target.value)
//           }
//           rows={4}
//           className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 
//                    focus:ring-blue-500 focus:border-blue-500 transition-all"
//         />
//       ) : (
//         <p className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg text-gray-800 whitespace-pre-wrap border border-gray-200">
//           {Array.isArray(value) ? value.join('\n') : value || '-'}
//         </p>
//       )}
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-24 pb-12 px-4">
//       <div className="max-w-7xl mx-auto">
//         {/* Header with Actions */}
//         <div className="mb-8">
//           <div className="flex items-center justify-between mb-6">
//             <button
//               onClick={() => navigate('/upload')}
//               className="flex items-center space-x-2 px-5 py-3 text-gray-700 hover:text-blue-600 
//                        hover:bg-white rounded-xl transition-all duration-200 font-medium border-2 border-transparent
//                        hover:border-blue-200 hover:shadow-lg"
//             >
//               <ArrowLeft className="h-5 w-5" />
//               <span>Back to Upload</span>
//             </button>
            
//             <div className="flex items-center space-x-3">
//               {editMode ? (
//                 <>
//                   <button
//                     onClick={() => setEditMode(false)}
//                     className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 
//                              rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold
//                              text-gray-700 hover:border-gray-400 hover:shadow-lg"
//                   >
//                     <X className="h-5 w-5" />
//                     <span>Cancel</span>
//                   </button>
//                   <button
//                     onClick={() => {
//                       setEditMode(false);
//                       // Could add save to backend here
//                     }}
//                     className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 
//                              text-white rounded-xl hover:from-green-700 hover:to-green-800 
//                              transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
//                   >
//                     <Save className="h-5 w-5" />
//                     <span>Save Changes</span>
//                   </button>
//                 </>
//               ) : (
//                 <button
//                   onClick={() => setEditMode(true)}
//                   className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
//                            text-white rounded-xl hover:from-blue-700 hover:to-blue-800 
//                            transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
//                 >
//                   <Edit2 className="h-5 w-5" />
//                   <span>Edit Data</span>
//                 </button>
//               )}
//               <button
//                 onClick={downloadJSON}
//                 className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 
//                          text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 
//                          transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
//               >
//                 <Download className="h-5 w-5" />
//                 <span>Download JSON</span>
//               </button>
//             </div>
//           </div>

//           {/* Success Banner */}
//           <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-8 shadow-lg">
//             <div className="flex items-center space-x-4">
//               <div className="bg-green-100 p-3 rounded-full">
//                 <CheckCircle className="h-8 w-8 text-green-600" />
//               </div>
//               <div>
//                 <h2 className="text-2xl font-bold text-gray-800">Extraction Complete!</h2>
//                 <p className="text-gray-600">Your medical referral data has been successfully extracted and is ready for review.</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Stats Bar */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
//             <div className="flex items-center justify-between mb-2">
//               <p className="text-sm text-gray-600 font-medium">Job ID</p>
//               <FileText className="h-5 w-5 text-blue-500" />
//             </div>
//             <p className="font-bold text-gray-800 truncate text-lg">{result.job_id}</p>
//           </div>
//           <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
//             <div className="flex items-center justify-between mb-2">
//               <p className="text-sm text-gray-600 font-medium">File Type</p>
//               <FileText className="h-5 w-5 text-purple-500" />
//             </div>
//             <p className="font-bold text-gray-800 text-lg uppercase">{result.file_type}</p>
//           </div>
//           <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
//             <div className="flex items-center justify-between mb-2">
//               <p className="text-sm text-gray-600 font-medium">Characters</p>
//               <Activity className="h-5 w-5 text-green-500" />
//             </div>
//             <p className="font-bold text-gray-800 text-lg">
//               {result.text_stats?.character_count?.toLocaleString() || 0}
//             </p>
//           </div>
//           <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
//             <div className="flex items-center justify-between mb-2">
//               <p className="text-sm text-gray-600 font-medium">Words</p>
//               <Activity className="h-5 w-5 text-orange-500" />
//             </div>
//             <p className="font-bold text-gray-800 text-lg">
//               {result.text_stats?.word_count?.toLocaleString() || 0}
//             </p>
//           </div>
//         </div>

//         {/* File Preview - Full Width */}
//         {uploadedFile ? (
//           <div className="mb-8">
//             <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
//               <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
//                 <div className="bg-blue-100 p-2 rounded-lg mr-3">
//                   <FileText className="h-6 w-6 text-blue-600" />
//                 </div>
//                 Original Document Preview
//               </h2>
//               <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-xl border border-gray-200">
//                 <FilePreview file={uploadedFile} />
//               </div>
//             </div>
//           </div>
//         ) : (
//           <div className="mb-8">
//             <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 p-6 rounded-2xl shadow-lg">
//               <div className="flex items-start space-x-4">
//                 <div className="bg-amber-100 p-2 rounded-lg">
//                   <AlertCircle className="h-6 w-6 text-amber-600" />
//                 </div>
//                 <div>
//                   <p className="font-bold text-amber-900 mb-1 text-lg">File Preview Not Available</p>
//                   <p className="text-amber-800">
//                     The original document preview is not available. The file may have been cleared from memory.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Extracted Data - Enhanced Cards */}
//         <div className="space-y-8">
//           {/* Document Metadata */}
//           <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
//               <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl mr-3 shadow-lg">
//                 <FileText className="h-6 w-6 text-white" />
//               </div>
//               Document Metadata
//             </h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <InputField
//                 label="Document Title"
//                 value={editedData.document_meta?.title}
//                 path="document_meta.title"
//               />
//               <InputField
//                 label="Document Date"
//                 value={editedData.document_meta?.date}
//                 path="document_meta.date"
//                 type="date"
//               />
//             </div>
//           </div>

//           {/* Referral Information */}
//           <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
//               <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl mr-3 shadow-lg">
//                 <Building className="h-6 w-6 text-white" />
//               </div>
//               Referral Information
//             </h2>
            
//             <div className="mb-8 p-8 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
//               <h3 className="font-bold text-gray-800 mb-6 text-xl flex items-center">
//                 <ArrowLeft className="h-5 w-5 mr-2 text-blue-600 rotate-180" />
//                 Referring To
//               </h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <InputField
//                   label="Facility/Doctor"
//                   value={editedData.referral?.referral_to}
//                   path="referral.referral_to"
//                 />
//                 <InputField
//                   label="Contact Person"
//                   value={editedData.referral?.referral_focal_point}
//                   path="referral.referral_focal_point"
//                 />
//                 <InputField
//                   label="Phone Number"
//                   value={editedData.referral?.referral_phone}
//                   path="referral.referral_phone"
//                 />
//                 <InputField
//                   label="Email Address"
//                   value={editedData.referral?.referral_email}
//                   path="referral.referral_email"
//                 />
//               </div>
//             </div>
            
//             <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
//               <h3 className="font-bold text-gray-800 mb-6 text-xl flex items-center">
//                 <ArrowLeft className="h-5 w-5 mr-2 text-green-600" />
//                 Referring From
//               </h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <InputField
//                   label="Facility/Doctor"
//                   value={editedData.referral?.referring_from}
//                   path="referral.referring_from"
//                 />
//                 <InputField
//                   label="Contact Person"
//                   value={editedData.referral?.referring_focal_point}
//                   path="referral.referring_focal_point"
//                 />
//                 <InputField
//                   label="Phone Number"
//                   value={editedData.referral?.referring_phone}
//                   path="referral.referring_phone"
//                 />
//                 <InputField
//                   label="Email Address"
//                   value={editedData.referral?.referring_email}
//                   path="referral.referring_email"
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Patient Information */}
//           <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
//               <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl mr-3 shadow-lg">
//                 <User className="h-6 w-6 text-white" />
//               </div>
//               Patient Information
//             </h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <InputField
//                 label="Full Name"
//                 value={editedData.patient?.full_name}
//                 path="patient.full_name"
//               />
//               <InputField
//                 label="Phone Number"
//                 value={editedData.patient?.phone}
//                 path="patient.phone"
//               />
//               <InputField
//                 label="Date of Birth"
//                 value={editedData.patient?.date_of_birth}
//                 path="patient.date_of_birth"
//                 type="date"
//               />
//               <InputField
//                 label="Gender"
//                 value={editedData.patient?.gender}
//                 path="patient.gender"
//               />
//               <div className="md:col-span-2">
//                 <InputField
//                   label="Address"
//                   value={editedData.patient?.address}
//                   path="patient.address"
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Medical Information */}
//           <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
//               <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-xl mr-3 shadow-lg">
//                 <Activity className="h-6 w-6 text-white" />
//               </div>
//               Medical Information
//             </h2>
//             <TextAreaField
//               label="Primary Diagnoses (one per line)"
//               value={editedData.diagnoses?.primary_diagnoses}
//               path="diagnoses.primary_diagnoses"
//             />
//             <TextAreaField
//               label="Other Diagnoses (one per line)"
//               value={editedData.diagnoses?.other_diagnoses}
//               path="diagnoses.other_diagnoses"
//             />
//             <TextAreaField
//               label="Treatments Provided (one per line)"
//               value={editedData.treatments}
//               path="treatments"
//             />
//             <TextAreaField
//               label="Reason for Referral"
//               value={editedData.reason_for_referral}
//               path="reason_for_referral"
//             />
//           </div>

//           {/* Additional Information */}
//           <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
//               <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-xl mr-3 shadow-lg">
//                 <FileText className="h-6 w-6 text-white" />
//               </div>
//               Additional Information
//             </h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               <InputField
//                 label="Compiled By"
//                 value={editedData.compiled_by}
//                 path="compiled_by"
//               />
//               <InputField
//                 label="Position/Title"
//                 value={editedData.position}
//                 path="position"
//               />
//               <InputField
//                 label="Signature"
//                 value={editedData.signature}
//                 path="signature"
//               />
//               <InputField
//                 label="File Number"
//                 value={editedData.file_number}
//                 path="file_number"
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OutputPage;

// # -----------------------------------------------------------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Edit2, Save, X, FileText, ArrowLeft, User, Building, Activity, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import FilePreview from './FilePreview';

const OutputPage = ({ result, uploadedFile }) => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);

  useEffect(() => {
    if (!result) {
      navigate('/upload');
      return;
    }
    setEditedData(result.extracted);
    
    console.log('OutputPage - uploadedFile:', uploadedFile);
    console.log('OutputPage - result:', result);
    console.log('OutputPage - classification:', result.classification);
  }, [result, uploadedFile, navigate]);

  if (!result || !editedData) {
    return null;
  }

  const handleInputChange = (path, value) => {
    const pathArray = path.split('.');
    const newData = { ...editedData };
    let current = newData;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    setEditedData(newData);
  };

  const handleArrayChange = (path, value) => {
    const array = value.split('\n').filter(item => item.trim());
    handleInputChange(path, array);
  };

  const downloadJSON = () => {
    const dataStr = JSON.stringify(editedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `referral_${result.job_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const InputField = ({ label, value, path, type = 'text' }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      {editMode ? (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => handleInputChange(path, e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
      ) : (
        <p className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg text-gray-800 border border-gray-200">
          {value || '-'}
        </p>
      )}
    </div>
  );

  const TextAreaField = ({ label, value, path }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
      </label>
      {editMode ? (
        <textarea
          value={Array.isArray(value) ? value.join('\n') : value || ''}
          onChange={(e) => 
            Array.isArray(value) 
              ? handleArrayChange(path, e.target.value)
              : handleInputChange(path, e.target.value)
          }
          rows={4}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
      ) : (
        <p className="px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg text-gray-800 whitespace-pre-wrap border border-gray-200">
          {Array.isArray(value) ? value.join('\n') : value || '-'}
        </p>
      )}
    </div>
  );

  // Safe access to classification data
  const classification = result.classification || {};
  const isReferral = classification.is_referral === true;
  const hasConfidence = typeof classification.confidence === 'number';
  const hasDetails = classification.details && typeof classification.details === 'object';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center space-x-2 px-5 py-3 text-gray-700 hover:text-blue-600 
                       hover:bg-white rounded-xl transition-all duration-200 font-medium border-2 border-transparent
                       hover:border-blue-200 hover:shadow-lg"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Upload</span>
            </button>
            
            <div className="flex items-center space-x-3">
              {editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 
                             rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold
                             text-gray-700 hover:border-gray-400 hover:shadow-lg"
                  >
                    <X className="h-5 w-5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                    }}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 
                             text-white rounded-xl hover:from-green-700 hover:to-green-800 
                             transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Save className="h-5 w-5" />
                    <span>Save Changes</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 
                           text-white rounded-xl hover:from-blue-700 hover:to-blue-800 
                           transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Edit2 className="h-5 w-5" />
                  <span>Edit Data</span>
                </button>
              )}
              <button
                onClick={downloadJSON}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 
                         text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 
                         transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Download className="h-5 w-5" />
                <span>Download JSON</span>
              </button>
            </div>
          </div>

          {/* Classification Banner */}
          {result.classification && (
            <div className={`p-6 rounded-2xl shadow-lg mb-8 ${
              isReferral
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
                : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200'
            }`}>
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-full ${
                  isReferral ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {isReferral ? (
                    <Shield className="h-8 w-8 text-green-600" />
                  ) : (
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                    Classification: {isReferral ? '✓ Medical Referral' : '⚠ Non-Referral Document'}
                  </h3>
                  <p className="text-gray-700 mb-3">{classification.reason || 'No reason provided'}</p>
                  
                  {/* Confidence Bar */}
                  {hasConfidence && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">Confidence Score</span>
                        <span className="text-sm font-bold text-gray-800">
                          {(classification.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            classification.confidence >= 0.7 
                              ? 'bg-gradient-to-r from-green-500 to-green-600' 
                              : classification.confidence >= 0.4
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                              : 'bg-gradient-to-r from-red-500 to-red-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, classification.confidence * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Classification Details */}
                  {hasDetails && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {typeof classification.score === 'number' && (
                        <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                          <p className="text-gray-600 font-medium">Total Score</p>
                          <p className="text-lg font-bold text-gray-800">{classification.score}</p>
                        </div>
                      )}
                      {typeof classification.details.strong_keywords === 'number' && (
                        <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                          <p className="text-gray-600 font-medium">Referral Keywords</p>
                          <p className="text-lg font-bold text-gray-800">{classification.details.strong_keywords}</p>
                        </div>
                      )}
                      {typeof classification.details.medical_keywords === 'number' && (
                        <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                          <p className="text-gray-600 font-medium">Medical Terms</p>
                          <p className="text-lg font-bold text-gray-800">{classification.details.medical_keywords}</p>
                        </div>
                      )}
                      {typeof classification.details.pattern_matches === 'number' && (
                        <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                          <p className="text-gray-600 font-medium">Pattern Matches</p>
                          <p className="text-lg font-bold text-gray-800">{classification.details.pattern_matches}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Banner */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Extraction Complete!</h2>
                <p className="text-gray-600">Your document data has been successfully extracted and is ready for review.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 font-medium">Job ID</p>
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <p className="font-bold text-gray-800 truncate text-lg">{result.job_id}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 font-medium">File Type</p>
              <FileText className="h-5 w-5 text-purple-500" />
            </div>
            <p className="font-bold text-gray-800 text-lg uppercase">{result.file_type}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 font-medium">Characters</p>
              <Activity className="h-5 w-5 text-green-500" />
            </div>
            <p className="font-bold text-gray-800 text-lg">
              {result.text_stats?.character_count?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 font-medium">Words</p>
              <Activity className="h-5 w-5 text-orange-500" />
            </div>
            <p className="font-bold text-gray-800 text-lg">
              {result.text_stats?.word_count?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {/* File Preview - Full Width */}
        {uploadedFile ? (
          <div className="mb-8">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                Original Document Preview
              </h2>
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                <FilePreview file={uploadedFile} />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 p-6 rounded-2xl shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-amber-900 mb-1 text-lg">File Preview Not Available</p>
                  <p className="text-amber-800">
                    The original document preview is not available. The file may have been cleared from memory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extracted Data - Enhanced Cards */}
        <div className="space-y-8">
          {/* Document Metadata */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl mr-3 shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              Document Metadata
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Document Title"
                value={editedData.document_meta?.title}
                path="document_meta.title"
              />
              <InputField
                label="Document Date"
                value={editedData.document_meta?.date}
                path="document_meta.date"
                type="date"
              />
            </div>
          </div>

          {/* Referral Information */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl mr-3 shadow-lg">
                <Building className="h-6 w-6 text-white" />
              </div>
              Referral Information
            </h2>
            
            <div className="mb-8 p-8 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
              <h3 className="font-bold text-gray-800 mb-6 text-xl flex items-center">
                <ArrowLeft className="h-5 w-5 mr-2 text-blue-600 rotate-180" />
                Referring To
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Facility/Doctor"
                  value={editedData.referral?.referral_to}
                  path="referral.referral_to"
                />
                <InputField
                  label="Contact Person"
                  value={editedData.referral?.referral_focal_point}
                  path="referral.referral_focal_point"
                />
                <InputField
                  label="Phone Number"
                  value={editedData.referral?.referral_phone}
                  path="referral.referral_phone"
                />
                <InputField
                  label="Email Address"
                  value={editedData.referral?.referral_email}
                  path="referral.referral_email"
                />
              </div>
            </div>
            
            <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
              <h3 className="font-bold text-gray-800 mb-6 text-xl flex items-center">
                <ArrowLeft className="h-5 w-5 mr-2 text-green-600" />
                Referring From
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Facility/Doctor"
                  value={editedData.referral?.referring_from}
                  path="referral.referring_from"
                />
                <InputField
                  label="Contact Person"
                  value={editedData.referral?.referring_focal_point}
                  path="referral.referring_focal_point"
                />
                <InputField
                  label="Phone Number"
                  value={editedData.referral?.referring_phone}
                  path="referral.referring_phone"
                />
                <InputField
                  label="Email Address"
                  value={editedData.referral?.referring_email}
                  path="referral.referring_email"
                />
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl mr-3 shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              Patient Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Full Name"
                value={editedData.patient?.full_name}
                path="patient.full_name"
              />
              <InputField
                label="Phone Number"
                value={editedData.patient?.phone}
                path="patient.phone"
              />
              <InputField
                label="Date of Birth"
                value={editedData.patient?.date_of_birth}
                path="patient.date_of_birth"
                type="date"
              />
              <InputField
                label="Gender"
                value={editedData.patient?.gender}
                path="patient.gender"
              />
              <div className="md:col-span-2">
                <InputField
                  label="Address"
                  value={editedData.patient?.address}
                  path="patient.address"
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-xl mr-3 shadow-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              Medical Information
            </h2>
            <TextAreaField
              label="Primary Diagnoses (one per line)"
              value={editedData.diagnoses?.primary_diagnoses}
              path="diagnoses.primary_diagnoses"
            />
            <TextAreaField
              label="Other Diagnoses (one per line)"
              value={editedData.diagnoses?.other_diagnoses}
              path="diagnoses.other_diagnoses"
            />
            <TextAreaField
              label="Treatments Provided (one per line)"
              value={editedData.treatments}
              path="treatments"
            />
            <TextAreaField
              label="Reason for Referral"
              value={editedData.reason_for_referral}
              path="reason_for_referral"
            />
          </div>

          {/* Additional Information */}
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-xl mr-3 shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              Additional Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Compiled By"
                value={editedData.compiled_by}
                path="compiled_by"
              />
              <InputField
                label="Position/Title"
                value={editedData.position}
                path="position"
              />
              <InputField
                label="Signature"
                value={editedData.signature}
                path="signature"
              />
              <InputField
                label="File Number"
                value={editedData.file_number}
                path="file_number"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutputPage;