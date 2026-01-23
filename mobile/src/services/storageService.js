import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_CONFIG } from '../config/constants';

const KEYS = {
  REPORTS: 'cached_reports',
  OFFLINE_QUEUE: 'offline_queue',
  USER: 'user',
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  THEME: 'theme',
  LANGUAGE: 'language',
  LAST_SYNC: 'last_sync',
};

const storageService = {
  // Generic storage methods
  set: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },

  get: async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  remove: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },

  clear: async () => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },

  // Report caching
  cacheReport: async (reportId, reportData) => {
    try {
      const cached = await storageService.get(KEYS.REPORTS) || {};
      cached[reportId] = {
        data: reportData,
        timestamp: Date.now(),
      };

      // Limit cache size
      const reportIds = Object.keys(cached);
      if (reportIds.length > CACHE_CONFIG.MAX_CACHED_REPORTS) {
        // Remove oldest reports
        const sorted = reportIds.sort(
          (a, b) => cached[a].timestamp - cached[b].timestamp
        );
        const toRemove = sorted.slice(
          0,
          reportIds.length - CACHE_CONFIG.MAX_CACHED_REPORTS
        );
        toRemove.forEach((id) => delete cached[id]);
      }

      await storageService.set(KEYS.REPORTS, cached);
    } catch (error) {
      console.error('Cache report error:', error);
    }
  },

  getCachedReport: async (reportId) => {
    try {
      const cached = await storageService.get(KEYS.REPORTS) || {};
      const report = cached[reportId];

      if (!report) return null;

      // Check if cache is expired
      const age = Date.now() - report.timestamp;
      if (age > CACHE_CONFIG.MAX_CACHE_AGE) {
        delete cached[reportId];
        await storageService.set(KEYS.REPORTS, cached);
        return null;
      }

      return report.data;
    } catch (error) {
      console.error('Get cached report error:', error);
      return null;
    }
  },

  getAllCachedReports: async () => {
    try {
      const cached = await storageService.get(KEYS.REPORTS) || {};
      return Object.entries(cached).map(([id, data]) => ({
        reportId: id,
        ...data.data,
      }));
    } catch (error) {
      console.error('Get all cached reports error:', error);
      return [];
    }
  },

  clearExpiredCache: async () => {
    try {
      const cached = await storageService.get(KEYS.REPORTS) || {};
      const now = Date.now();
      let modified = false;

      Object.keys(cached).forEach((id) => {
        const age = now - cached[id].timestamp;
        if (age > CACHE_CONFIG.MAX_CACHE_AGE) {
          delete cached[id];
          modified = true;
        }
      });

      if (modified) {
        await storageService.set(KEYS.REPORTS, cached);
      }
    } catch (error) {
      console.error('Clear expired cache error:', error);
    }
  },

  // Offline queue management
  addToOfflineQueue: async (analysisRequest) => {
    try {
      const queue = await storageService.get(KEYS.OFFLINE_QUEUE) || [];
      
      // Limit queue size
      if (queue.length >= CACHE_CONFIG.OFFLINE_QUEUE_LIMIT) {
        queue.shift(); // Remove oldest
      }

      queue.push({
        ...analysisRequest,
        queuedAt: Date.now(),
      });

      await storageService.set(KEYS.OFFLINE_QUEUE, queue);
      return true;
    } catch (error) {
      console.error('Add to offline queue error:', error);
      return false;
    }
  },

  getOfflineQueue: async () => {
    try {
      return await storageService.get(KEYS.OFFLINE_QUEUE) || [];
    } catch (error) {
      console.error('Get offline queue error:', error);
      return [];
    }
  },

  removeFromOfflineQueue: async (index) => {
    try {
      const queue = await storageService.get(KEYS.OFFLINE_QUEUE) || [];
      queue.splice(index, 1);
      await storageService.set(KEYS.OFFLINE_QUEUE, queue);
    } catch (error) {
      console.error('Remove from offline queue error:', error);
    }
  },

  clearOfflineQueue: async () => {
    try {
      await storageService.set(KEYS.OFFLINE_QUEUE, []);
    } catch (error) {
      console.error('Clear offline queue error:', error);
    }
  },

  // User data
  setUser: async (user) => {
    await storageService.set(KEYS.USER, user);
  },

  getUser: async () => {
    return await storageService.get(KEYS.USER);
  },

  removeUser: async () => {
    await storageService.remove(KEYS.USER);
  },

  // Tokens
  setTokens: async (accessToken, refreshToken) => {
    await AsyncStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
    await AsyncStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
  },

  getAccessToken: async () => {
    return await AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
  },

  getRefreshToken: async () => {
    return await AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
  },

  removeTokens: async () => {
    await AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.REFRESH_TOKEN]);
  },

  // App settings
  setTheme: async (theme) => {
    await storageService.set(KEYS.THEME, theme);
  },

  getTheme: async () => {
    return await storageService.get(KEYS.THEME);
  },

  setLanguage: async (language) => {
    await storageService.set(KEYS.LANGUAGE, language);
  },

  getLanguage: async () => {
    return await storageService.get(KEYS.LANGUAGE);
  },

  // Last sync timestamp
  setLastSync: async () => {
    await storageService.set(KEYS.LAST_SYNC, Date.now());
  },

  getLastSync: async () => {
    return await storageService.get(KEYS.LAST_SYNC);
  },
};

export default storageService;
export { KEYS };
