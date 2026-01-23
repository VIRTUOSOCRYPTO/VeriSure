// API Base URL - Change this based on environment
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:8001/api' // Android Emulator
  // ? 'http://localhost:8001/api' // iOS Simulator
  : 'https://your-production-api.com/api';

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'VeriSure',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@verisure.com',
  PRIVACY_URL: 'https://verisure.com/privacy',
  TERMS_URL: 'https://verisure.com/terms',
};

// Analysis Configuration
export const ANALYSIS_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_BATCH_FILES: 10,
  SUPPORTED_IMAGE_FORMATS: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  SUPPORTED_VIDEO_FORMATS: ['video/mp4', 'video/mov', 'video/avi'],
  SUPPORTED_AUDIO_FORMATS: ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg'],
  MAX_TEXT_LENGTH: 10000,
  POLL_INTERVAL: 3000, // 3 seconds for async job polling
};

// Cache Configuration
export const CACHE_CONFIG = {
  MAX_CACHE_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  MAX_CACHED_REPORTS: 100,
  OFFLINE_QUEUE_LIMIT: 50,
};

// Theme Colors
export const COLORS = {
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  secondary: '#EC4899',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Risk levels
  riskHigh: '#DC2626',
  riskMedium: '#F59E0B',
  riskLow: '#10B981',
  
  // Light theme
  light: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    card: '#FFFFFF',
  },
  
  // Dark theme
  dark: {
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    card: '#1F2937',
  },
};

// Risk Levels
export const RISK_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// Analysis Types
export const ANALYSIS_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  URL: 'url',
  FILE: 'file',
};
