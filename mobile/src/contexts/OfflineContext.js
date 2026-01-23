import React, { createContext, useState, useContext, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import storageService from '../services/storageService';
import apiService from '../services/apiService';
import Toast from 'react-native-toast-message';

const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [queuedItems, setQueuedItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);

      // When coming back online, sync queued items
      if (connected && !isConnected) {
        syncQueue();
      }
    });

    // Load queued items from storage
    loadQueue();

    return () => unsubscribe();
  }, []);

  const loadQueue = async () => {
    const queue = await storageService.getOfflineQueue();
    setQueuedItems(queue);
  };

  const addToQueue = async (analysisRequest) => {
    const success = await storageService.addToOfflineQueue(analysisRequest);
    if (success) {
      await loadQueue();
      Toast.show({
        type: 'info',
        text1: 'Saved for Later',
        text2: 'Analysis will be processed when you\'re back online',
      });
    }
  };

  const syncQueue = async () => {
    if (isSyncing || queuedItems.length === 0) return;

    setIsSyncing(true);
    Toast.show({
      type: 'info',
      text1: 'Syncing',
      text2: `Processing ${queuedItems.length} queued analysis...`,
    });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < queuedItems.length; i++) {
      const item = queuedItems[i];
      try {
        if (item.type === 'text') {
          await apiService.analysis.analyzeText(item.content);
        } else if (item.type === 'file') {
          await apiService.analysis.analyzeFile(item.file);
        }
        await storageService.removeFromOfflineQueue(i);
        successCount++;
      } catch (error) {
        console.error('Sync error:', error);
        failCount++;
      }
    }

    await loadQueue();
    setIsSyncing(false);

    if (successCount > 0) {
      Toast.show({
        type: 'success',
        text1: 'Sync Complete',
        text2: `${successCount} analysis processed successfully`,
      });
    }

    if (failCount > 0) {
      Toast.show({
        type: 'error',
        text1: 'Sync Incomplete',
        text2: `${failCount} analysis failed`,
      });
    }
  };

  const clearQueue = async () => {
    await storageService.clearOfflineQueue();
    setQueuedItems([]);
    Toast.show({
      type: 'success',
      text1: 'Queue Cleared',
      text2: 'All queued items removed',
    });
  };

  return (
    <OfflineContext.Provider
      value={{
        isConnected,
        queuedItems,
        isSyncing,
        addToQueue,
        syncQueue,
        clearQueue,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};
