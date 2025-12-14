

//----------------------------------------------------------------------------------------------------------------------------------

// src/components/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Zap, Shield, Clock, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { getSupportedFormats } from '../services/api';

const HomePage = () => {
  const navigate = useNavigate();
  const [supportedFormats, setSupportedFormats] = useState(null);

  useEffect(() => {
    loadSupportedFormats();
  }, []);

  const loadSupportedFormats = async () => {
    try {
      const data = await getSupportedFormats();
      setSupportedFormats(data);
    } catch (error) {
      console.error('Error loading formats:', error);
    }
  };

  const features = [
    {
      icon: FileText,
      title: 'Multi-Format Support',
      description: 'Upload PDF, images (JPG, PNG), text files, or Word documents',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100'
    },
    {
      icon: Zap,
      title: 'AI-Powered Extraction',
      description: 'Advanced AI automatically identifies and extracts referral information',
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-50',
      iconBg: 'bg-yellow-100'
    },
    {
      icon: Shield,
      title: 'Secure Processing',
      description: 'Your documents are processed securely and never stored permanently',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100'
    },
    {
      icon: Clock,
      title: 'Fast Results',
      description: 'Get structured data in seconds, ready for review and export',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Upload Document',
      description: 'Select and upload your medical referral document in any supported format',
      icon: Upload
    },
    {
      step: 2,
      title: 'AI Analysis',
      description: 'Our AI extracts text and identifies key referral information automatically',
      icon: Sparkles
    },
    {
      step: 3,
      title: 'Review & Edit',
      description: 'Review the extracted information and make any necessary edits',
      icon: FileText
    },
    {
      step: 4,
      title: 'Export Data',
      description: 'Download the structured data as JSON or integrate with your systems',
      icon: CheckCircle
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Section - Enhanced with overlay and pattern */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-800/20 to-blue-900/40"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 
                          px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-semibold text-white">AI-Powered Technology</span>
            </div>
            
            <h1 className="text-6xl font-extrabold mb-6 text-white leading-tight">
              Medical Referral<br />
              <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                Extractor
              </span>
            </h1>
            
            <p className="text-xl mb-10 text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Automatically extract structured information from medical referral documents 
              using AI-powered text recognition and intelligent data extraction
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/upload')}
                className="group bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-bold 
                         hover:bg-blue-50 transition-all duration-300 shadow-2xl hover:shadow-3xl
                         flex items-center space-x-3 hover:scale-105 transform"
              >
                <Upload className="h-6 w-6" />
                <span>Upload Document</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                className="bg-blue-500/20 backdrop-blur-sm border-2 border-white/30 text-white px-8 py-4 
                         rounded-xl text-lg font-bold hover:bg-blue-500/30 transition-all duration-300
                         flex items-center space-x-2"
              >
                <span>Learn How</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-16 fill-slate-50">
            <path d="M0,0 C150,80 350,80 600,50 C850,20 1050,20 1200,50 L1200,120 L0,120 Z"></path>
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-gray-800">
            Powerful Features
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to streamline your medical referral processing
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl 
                       transition-all duration-300 border border-gray-100 hover:border-transparent
                       hover:-translate-y-2"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 
                             group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
              
              <div className="relative">
                <div className={`${feature.iconBg} w-16 h-16 rounded-xl flex items-center justify-center mb-6
                              group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-8 w-8 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} 
                               style={{WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text'}} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-gray-800">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Four simple steps to extract your medical referral data
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-8 rounded-2xl shadow-lg 
                              hover:shadow-xl transition-all duration-300 border border-gray-100 h-full">
                  {/* Step number badge */}
                  <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 
                                text-white rounded-xl text-2xl font-bold mb-6 shadow-lg">
                    {item.step}
                  </div>
                  
                  {/* Icon */}
                  <div className="bg-white w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow">
                    <item.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3 text-gray-800">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </div>
                
                {/* Connector arrow */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-4 z-10 items-center justify-center">
                    <ArrowRight className="h-8 w-8 text-blue-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Supported Formats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-gray-800">
            Supported File Formats
          </h2>
          <p className="text-lg text-gray-600">
            Upload any of these file types for instant processing
          </p>
        </div>
        
        {supportedFormats && (
          <div className="bg-white rounded-2xl shadow-xl p-10 max-w-4xl mx-auto border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {supportedFormats.supported_formats.map((format, index) => (
                <div
                  key={format}
                  className="flex items-start space-x-4 p-5 bg-gradient-to-br from-slate-50 to-blue-50 
                           rounded-xl hover:shadow-lg transition-all duration-300 border border-gray-100
                           hover:border-blue-200"
                >
                  <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 mb-1">{format}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {supportedFormats.descriptions[format]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        {/* Pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Ready to Extract Your Medical Referrals?
          </h2>
          <p className="text-xl mb-10 text-blue-100 max-w-2xl mx-auto">
            Upload your first document and experience the power of AI-driven extraction
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="group bg-white text-blue-600 px-10 py-5 rounded-xl text-lg font-bold 
                     hover:bg-blue-50 transition-all duration-300 shadow-2xl
                     inline-flex items-center space-x-3 hover:scale-105 transform"
          >
            <Upload className="h-6 w-6" />
            <span>Get Started Now</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-12 border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <FileText className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-bold text-white">Medical Referral Extractor</span>
            </div>
            <p className="text-slate-400 mb-2">
              © 2025 Medical Referral Extractor. All rights reserved.
            </p>
            <p className="text-slate-500 text-sm">
              Powered by Azure OpenAI & Advanced AI Technology
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;