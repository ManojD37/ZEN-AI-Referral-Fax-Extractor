// src/components/AdminSettings.jsx
// Admin settings page with extraction mode toggle and enhanced cost dashboard
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, LogOut, Cpu, Sparkles, DollarSign, TrendingUp, TrendingDown,
  FileText, AlertCircle, CheckCircle, ArrowLeft, RefreshCw,
  BarChart3, PieChart, Clock, Zap, Activity, Calendar, Target
} from 'lucide-react';
import AdminLogin from './AdminLogin';

const AdminSettings = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Settings state
  const [settings, setSettings] = useState({
    extraction_mode: 'gpt',
    auto_fallback: true,
    confidence_threshold: 0.6
  });
  
  // Cost analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  // Get stored token
  const getToken = () => localStorage.getItem('adminToken');

  // Verify authentication
  const verifyAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsAuthenticated(false);
      setShowLogin(true);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        setShowLogin(false);
        await loadSettings();
        await loadAnalytics();
      } else {
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
        setShowLogin(true);
      }
    } catch (err) {
      console.error('Auth verification failed:', err);
      setIsAuthenticated(false);
      setShowLogin(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  // Load settings
  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await fetch(`/api/stats/cost?days=${selectedPeriod}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
    setAnalyticsLoading(false);
  };

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(settings)
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    }
    setSaving(false);
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setShowLogin(true);
  };

  // Login success handler
  const handleLoginSuccess = (token) => {
    setIsAuthenticated(true);
    setShowLogin(false);
    loadSettings();
    loadAnalytics();
  };

  // Calculate additional metrics
  const calculateMetrics = () => {
    if (!analytics) return null;

    const avgCostPerDoc = analytics.total_documents > 0 
      ? (analytics.total_cost / analytics.total_documents).toFixed(4)
      : 0;

    const freeUsagePercent = analytics.total_documents > 0
      ? ((analytics.free_count / analytics.total_documents) * 100).toFixed(1)
      : 0;

    const projectedMonthlyCost = (analytics.total_cost / selectedPeriod) * 30;
    const projectedMonthlySavings = (analytics.savings / selectedPeriod) * 30;

    // Calculate daily averages
    const dailyAvgDocs = (analytics.total_documents / selectedPeriod).toFixed(1);
    const dailyAvgCost = (analytics.total_cost / selectedPeriod).toFixed(2);

    return {
      avgCostPerDoc,
      freeUsagePercent,
      projectedMonthlyCost: projectedMonthlyCost.toFixed(2),
      projectedMonthlySavings: projectedMonthlySavings.toFixed(2),
      dailyAvgDocs,
      dailyAvgCost
    };
  };

  const metrics = calculateMetrics();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-20">
        <AdminLogin 
          onLoginSuccess={handleLoginSuccess}
          onClose={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-white rounded-lg transition-all"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage extraction settings and view analytics</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg 
                     hover:bg-red-100 transition-all font-medium"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Period Selector */}
        <div className="mb-6 flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Analytics Period:</span>
          <div className="flex gap-2">
            {[7, 30, 90].map(days => (
              <button
                key={days}
                onClick={() => {
                  setSelectedPeriod(days);
                  loadAnalytics();
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedPeriod === days
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
          <button
            onClick={loadAnalytics}
            disabled={analyticsLoading}
            className="ml-auto p-2 hover:bg-white rounded-lg transition-all"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${analyticsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Quick Stats Cards */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="text-sm text-gray-500 mb-1">Total Documents</h3>
            <p className="text-3xl font-bold text-gray-800">{analytics?.total_documents || 0}</p>
            <p className="text-xs text-gray-500 mt-2">
              Avg: {metrics?.dailyAvgDocs || 0}/day
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <TrendingDown className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="text-sm text-gray-500 mb-1">Total Savings</h3>
            <p className="text-3xl font-bold text-green-600">${analytics?.savings || 0}</p>
            <p className="text-xs text-gray-500 mt-2">
              {analytics?.savings_percent || 0}% reduction
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <Activity className="h-5 w-5 text-purple-500" />
            </div>
            <h3 className="text-sm text-gray-500 mb-1">Free OCR Usage</h3>
            <p className="text-3xl font-bold text-purple-600">{metrics?.freeUsagePercent || 0}%</p>
            <p className="text-xs text-gray-500 mt-2">
              {analytics?.free_count || 0} documents
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Extraction Mode Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              Extraction Mode
            </h2>

            <div className="space-y-4">
              {/* GPT Option */}
              <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                settings.extraction_mode === 'gpt'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="mode"
                    value="gpt"
                    checked={settings.extraction_mode === 'gpt'}
                    onChange={(e) => setSettings({ ...settings, extraction_mode: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <span className="font-semibold text-gray-800">GPT-4 Vision</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                        Premium
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Azure GPT-4o Vision for highest accuracy extraction
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>✓ 95%+ accuracy</span>
                      <span>✓ Handwriting support</span>
                      <span>~$0.015/doc</span>
                    </div>
                  </div>
                </div>
              </label>

              {/* Free OCR Option */}
              <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                settings.extraction_mode === 'free'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="mode"
                    value="free"
                    checked={settings.extraction_mode === 'free'}
                    onChange={(e) => setSettings({ ...settings, extraction_mode: e.target.value })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-gray-800">Tesseract + spaCy</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        Free
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Open-source OCR with NER extraction - zero cost
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>✓ 70-85% accuracy</span>
                      <span>✓ Typed docs only</span>
                      <span>$0.00/doc</span>
                    </div>
                  </div>
                </div>
              </label>
            </div>

            {/* Auto-fallback toggle */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-medium text-gray-800">Auto-fallback to GPT</span>
                  <p className="text-sm text-gray-500">
                    Switch to GPT if free OCR confidence is below threshold
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.auto_fallback}
                  onChange={(e) => setSettings({ ...settings, auto_fallback: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>
            </div>

            {/* Save button */}
            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white 
                       font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all
                       disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Save Settings
                </>
              )}
            </button>
          </div>

          {/* Enhanced Analytics Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                Cost Analytics
              </h2>
            </div>

            {analytics ? (
              <div className="space-y-6">
                {/* Cost Breakdown */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <h3 className="text-sm font-semibold text-blue-800 mb-3">Cost Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">GPT-4 Vision</span>
                      <span className="font-bold text-blue-900">{analytics.gpt_count} docs → ${analytics.gpt_cost}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">Free OCR</span>
                      <span className="font-bold text-green-700">{analytics.free_count} docs → $0.00</span>
                    </div>
                    <hr className="border-blue-200" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700">Avg Cost/Doc</span>
                      <span className="font-bold text-blue-900">${metrics?.avgCostPerDoc || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Projections */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Monthly Projections
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-700">Projected Cost</span>
                      <span className="font-bold text-purple-900">${metrics?.projectedMonthlyCost || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-700">Projected Savings</span>
                      <span className="font-bold text-green-600">${metrics?.projectedMonthlySavings || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-700">Daily Avg Cost</span>
                      <span className="font-bold text-purple-900">${metrics?.dailyAvgCost || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Performance Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500">GPT Accuracy</p>
                      <p className="text-lg font-bold text-purple-600">{analytics.avg_gpt_confidence}%</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500">Free OCR Accuracy</p>
                      <p className="text-lg font-bold text-green-600">{analytics.avg_free_confidence}%</p>
                    </div>
                  </div>
                </div>

                {/* Savings Highlight */}
                <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Total Savings ({selectedPeriod} days)</p>
                      <p className="text-3xl font-bold">{analytics.savings_percent}%</p>
                      <p className="text-sm opacity-90 mt-1">${analytics.savings} saved</p>
                    </div>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-8 w-8" />
                    </div>
                  </div>
                </div>

                {/* All-time stats */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">All-Time Statistics</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">GPT Extractions:</span>
                      <span className="ml-2 font-bold text-gray-800">{analytics.all_time.total_gpt}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Free Extractions:</span>
                      <span className="ml-2 font-bold text-green-600">{analytics.all_time.total_free}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Cost:</span>
                      <span className="ml-2 font-bold text-gray-800">${analytics.all_time.total_cost_gpt}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Saved:</span>
                      <span className="ml-2 font-bold text-green-600">
                        ${((analytics.all_time.total_gpt + analytics.all_time.total_free) * 0.015 - analytics.all_time.total_cost_gpt).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <PieChart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No analytics data available</p>
                <p className="text-sm">Process some documents to see stats</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
