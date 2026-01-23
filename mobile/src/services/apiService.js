import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/constants';
import NetInfo from '@react-native-community/netinfo';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;
          await AsyncStorage.setItem('access_token', access_token);
          await AsyncStorage.setItem('refresh_token', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Check network connectivity
const checkNetwork = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

// API Service
const apiService = {
  // Auth APIs
  auth: {
    register: async (email, password, fullName, organization) => {
      const response = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        organization,
      });
      return response.data;
    },

    login: async (email, password) => {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token } = response.data;
      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('refresh_token', refresh_token);
      return response.data;
    },

    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        console.log('Logout API error:', error);
      } finally {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      }
    },

    getProfile: async () => {
      const response = await api.get('/auth/me');
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    },

    updateProfile: async (fullName, organization) => {
      const response = await api.put('/user/profile', {
        full_name: fullName,
        organization,
      });
      return response.data;
    },

    changePassword: async (currentPassword, newPassword) => {
      const response = await api.post('/user/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response.data;
    },
  },

  // Analysis APIs
  analysis: {
    analyzeText: async (text) => {
      const response = await api.post('/analyze', {
        input_type: 'text',
        content: text,
      });
      return response.data;
    },

    analyzeFile: async (file, onProgress) => {
      const formData = new FormData();
      formData.append('input_type', 'file');
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      });

      const response = await api.post('/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress && onProgress(progress);
        },
      });

      return response.data;
    },

    analyzeBatch: async (files, onProgress) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', {
          uri: file.uri,
          type: file.type,
          name: file.name,
        });
      });

      const response = await api.post('/analyze/batch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress && onProgress(progress);
        },
      });

      return response.data;
    },

    getJobStatus: async (jobId) => {
      const response = await api.get(`/job/${jobId}`);
      return response.data;
    },

    getReport: async (reportId) => {
      const response = await api.get(`/report/${reportId}`);
      return response.data;
    },

    exportPDF: async (reportId) => {
      const response = await api.get(`/export/pdf/${reportId}`, {
        responseType: 'blob',
      });
      return response.data;
    },
  },

  // History APIs
  history: {
    getHistory: async (limit = 50, skip = 0, riskLevel = null) => {
      const params = { limit, skip };
      if (riskLevel) params.risk_level = riskLevel;

      const response = await api.get('/history', { params });
      return response.data;
    },
  },

  // Comparison APIs
  comparison: {
    compareReports: async (reportIds) => {
      const response = await api.post('/compare', { report_ids: reportIds });
      return response.data;
    },
  },

  // Analytics APIs
  analytics: {
    getSummary: async () => {
      const response = await api.get('/analytics/summary');
      return response.data;
    },
  },
};

export default apiService;
export { checkNetwork };
