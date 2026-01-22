import React, { useState, useEffect } from 'react';
import { useToast } from '../hooks/use-toast';

const WhatsAppBotPage = () => {
  const { toast } = useToast();
  const [botStatus, setBotStatus] = useState({
    connected: false,
    status: 'unknown',
    qr_code: null
  });
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Fetch bot status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/whatsapp/status`);
      if (response.ok) {
        const data = await response.json();
        setBotStatus(data);
      } else {
        console.error('Failed to fetch bot status');
      }
    } catch (error) {
      console.error('Error fetching bot status:', error);
    }
  };

  // Auto-refresh status every 5 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Initialize bot
  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/whatsapp/init`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast({
          title: "Bot Initializing",
          description: "WhatsApp bot is starting. QR code will appear shortly.",
          variant: "default"
        });
        
        // Start polling for QR code
        setTimeout(fetchStatus, 2000);
      } else {
        const error = await response.json();
        toast({
          title: "Initialization Failed",
          description: error.detail || "Failed to initialize bot",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to bot service",
        variant: "destructive"
      });
    } finally {
      setInitializing(false);
    }
  };

  // Logout bot
  const handleLogout = async () => {
    if (!window.confirm('Are you sure you want to logout? You will need to scan QR code again.')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/whatsapp/logout`, {
        method: 'POST'
      });
      
      if (response.ok) {
        toast({
          title: "Bot Logged Out",
          description: "WhatsApp bot has been disconnected",
          variant: "default"
        });
        fetchStatus();
      } else {
        toast({
          title: "Logout Failed",
          description: "Failed to logout bot",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout bot",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get status color and icon
  const getStatusInfo = () => {
    switch (botStatus.status) {
      case 'connected':
        return {
          color: 'text-green-600',
          bg: 'bg-green-100',
          icon: '✅',
          text: 'Connected'
        };
      case 'qr_ready':
        return {
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          icon: '📱',
          text: 'Scan QR Code'
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          icon: '⏳',
          text: 'Connecting...'
        };
      case 'disconnected':
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          icon: '⚪',
          text: 'Disconnected'
        };
      case 'error':
        return {
          color: 'text-red-600',
          bg: 'bg-red-100',
          icon: '❌',
          text: 'Error'
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-100',
          icon: '❓',
          text: 'Unknown'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 text-white text-3xl mb-4">
            💬
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            WhatsApp Bot Control
          </h1>
          <p className="text-gray-600">
            Manage your VeriSure WhatsApp bot integration
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{statusInfo.icon}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Bot Status</h2>
                <p className={`text-lg font-semibold ${statusInfo.color}`}>
                  {statusInfo.text}
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              {!botStatus.connected && botStatus.status !== 'qr_ready' && botStatus.status !== 'connecting' && (
                <button
                  onClick={handleInitialize}
                  disabled={initializing}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {initializing ? 'Initializing...' : '🚀 Initialize Bot'}
                </button>
              )}
              
              {botStatus.connected && (
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Logging out...' : '🚪 Logout'}
                </button>
              )}
            </div>
          </div>

          {/* QR Code Display */}
          {botStatus.qr_code && botStatus.status === 'qr_ready' && (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                📱 Scan QR Code with WhatsApp
              </h3>
              <p className="text-gray-600 mb-6">
                Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
              </p>
              
              <div className="inline-block p-4 bg-white rounded-xl shadow-lg">
                <img 
                  src={botStatus.qr_code} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64 mx-auto"
                />
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                QR code refreshes automatically every few seconds
              </p>
            </div>
          )}

          {/* Connected Info */}
          {botStatus.connected && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl">✅</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-900 mb-2">
                    Bot is Connected!
                  </h3>
                  <p className="text-green-700 mb-4">
                    Your WhatsApp bot is now active and ready to receive messages.
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      How to use:
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>📝 Send text messages to check for scam content</li>
                      <li>🖼️ Send images with text to analyze</li>
                      <li>🎥 Send videos for deepfake detection</li>
                      <li>🎵 Send audio for voice cloning detection</li>
                      <li>💡 Type "help" for available commands</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Disconnected Info */}
          {botStatus.status === 'disconnected' && (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <span className="text-3xl">⚪</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Bot is Disconnected
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Click "Initialize Bot" to start the WhatsApp bot service.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Features Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            🎯 WhatsApp Bot Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="font-semibold text-gray-900">Auto-Detection</h3>
                <p className="text-sm text-gray-600">
                  Automatically analyzes all incoming messages
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl">🔴🟡🟢</span>
              <div>
                <h3 className="font-semibold text-gray-900">Emoji Indicators</h3>
                <p className="text-sm text-gray-600">
                  Color-coded risk levels for quick assessment
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-semibold text-gray-900">Fast Analysis</h3>
                <p className="text-sm text-gray-600">
                  Text & images analyzed in 2-5 seconds
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl">🎥</span>
              <div>
                <h3 className="font-semibold text-gray-900">Async Processing</h3>
                <p className="text-sm text-gray-600">
                  Videos & audio processed in background
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl">🛡️</span>
              <div>
                <h3 className="font-semibold text-gray-900">Rate Limiting</h3>
                <p className="text-sm text-gray-600">
                  10 analyses per day for free users
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="font-semibold text-gray-900">PDF Reports</h3>
                <p className="text-sm text-gray-600">
                  Type "pdf [report_id]" to get full report
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Commands Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            💬 Available Commands
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <code className="px-3 py-1 bg-blue-200 text-blue-900 rounded font-mono text-sm font-semibold">
                help
              </code>
              <p className="text-gray-700">Show all available commands</p>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <code className="px-3 py-1 bg-purple-200 text-purple-900 rounded font-mono text-sm font-semibold">
                status [job_id]
              </code>
              <p className="text-gray-700">Check video/audio analysis status</p>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <code className="px-3 py-1 bg-green-200 text-green-900 rounded font-mono text-sm font-semibold">
                pdf [report_id]
              </code>
              <p className="text-gray-700">Get full PDF report (coming soon)</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            🔐 Secure • 🔒 Private • 🇮🇳 Made in India
          </p>
          <p className="mt-2">
            Bot uses <strong>Baileys</strong> - unofficial WhatsApp Web API
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppBotPage;
