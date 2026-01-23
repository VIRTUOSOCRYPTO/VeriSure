import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import DocumentPicker from 'react-native-document-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useOffline } from '../../contexts/OfflineContext';
import apiService from '../../services/apiService';
import { ANALYSIS_CONFIG } from '../../config/constants';

const BatchAnalysisScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { isConnected } = useOffline();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePickFiles = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.video, DocumentPicker.types.audio],
        allowMultiSelection: true,
      });

      if (results.length > ANALYSIS_CONFIG.MAX_BATCH_FILES) {
        Toast.show({
          type: 'error',
          text1: 'Too Many Files',
          text2: `Maximum ${ANALYSIS_CONFIG.MAX_BATCH_FILES} files allowed`,
        });
        return;
      }

      // Check total size
      const totalSize = results.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > ANALYSIS_CONFIG.MAX_FILE_SIZE * ANALYSIS_CONFIG.MAX_BATCH_FILES) {
        Toast.show({
          type: 'error',
          text1: 'Total Size Too Large',
          text2: 'Please select smaller files',
        });
        return;
      }

      setSelectedFiles(results);
    } catch (error) {
      if (DocumentPicker.isCancel(error)) return;
      Toast.show({
        type: 'error',
        text1: 'Selection Error',
        text2: error.message,
      });
    }
  };

  const handleRemoveFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No Files Selected',
        text2: 'Please select files first',
      });
      return;
    }

    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'No Internet',
        text2: 'Batch analysis requires internet connection',
      });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const files = selectedFiles.map((file) => ({
        uri: file.uri,
        type: file.type,
        name: file.name,
      }));

      const result = await apiService.analysis.analyzeBatch(files, (progress) => {
        setUploadProgress(progress);
      });

      if (result.job_id) {
        navigation.navigate('JobStatus', { jobId: result.job_id });
      } else if (result.reports) {
        // Show batch results summary
        Toast.show({
          type: 'success',
          text1: 'Batch Complete',
          text2: `Analyzed ${result.reports.length} files`,
        });
        navigation.navigate('History');
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Analysis Failed',
        text2: error.response?.data?.detail || 'Something went wrong',
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const getFileIcon = (type) => {
    if (type?.includes('image')) return 'image';
    if (type?.includes('video')) return 'video';
    if (type?.includes('audio')) return 'music';
    return 'file';
  };

  const getFileColor = (type) => {
    if (type?.includes('image')) return colors.secondary;
    if (type?.includes('video')) return colors.warning;
    if (type?.includes('audio')) return colors.success;
    return colors.primary;
  };

  const renderFileItem = ({ item, index }) => (
    <View style={[styles.fileItem, { backgroundColor: colors.surface }]} data-testid={`file-item-${index}`}>
      <View style={[styles.fileIcon, { backgroundColor: getFileColor(item.type) + '20' }]}>
        <Icon name={getFileIcon(item.type)} size={24} color={getFileColor(item.type)} />
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
          {(item.size / (1024 * 1024)).toFixed(2)} MB
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleRemoveFile(index)} style={styles.removeButton}>
        <Icon name="close-circle" size={24} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <Icon name="file-multiple" size={60} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Batch Analysis</Text>
        <Text style={styles.headerSubtitle}>Process multiple files at once</Text>
      </LinearGradient>

      <View style={styles.content}>
        {selectedFiles.length === 0 ? (
          <View style={styles.emptyState}>
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handlePickFiles}
              data-testid="pick-files-button"
            >
              <Icon name="file-plus" size={64} color={colors.primary} />
              <Text style={[styles.uploadButtonText, { color: colors.text }]}>Select Files</Text>
              <Text style={[styles.uploadButtonSubtext, { color: colors.textSecondary }]}>
                Choose up to {ANALYSIS_CONFIG.MAX_BATCH_FILES} files
              </Text>
              <Text style={[styles.uploadButtonHint, { color: colors.textSecondary }]}>
                Images, Videos, or Audio files
              </Text>
            </TouchableOpacity>

            <View style={[styles.tipCard, { backgroundColor: colors.surface }]}>
              <Icon name="information" size={24} color={colors.info} />
              <View style={styles.tipContent}>
                <Text style={[styles.tipTitle, { color: colors.text }]}>Batch Processing</Text>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  • Upload multiple files in one go{"\n"}
                  • Save time with bulk analysis{"\n"}
                  • Get comprehensive reports{"\n"}
                  • Max {ANALYSIS_CONFIG.MAX_BATCH_FILES} files per batch
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <ScrollView style={styles.filesList} contentContainerStyle={styles.filesListContent}>
            <View style={styles.filesHeader}>
              <Text style={[styles.filesTitle, { color: colors.text }]}>
                Selected Files ({selectedFiles.length}/{ANALYSIS_CONFIG.MAX_BATCH_FILES})
              </Text>
              <TouchableOpacity onPress={handlePickFiles}>
                <Text style={[styles.addMoreText, { color: colors.primary }]}>Add More</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={selectedFiles}
              renderItem={renderFileItem}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.fileItemsList}
            />

            {isLoading && uploadProgress > 0 && (
              <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressText, { color: colors.text }]}>Uploading batch...</Text>
                  <Text style={[styles.progressPercent, { color: colors.text }]}>{uploadProgress}%</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[styles.progressFill, { backgroundColor: colors.primary, width: `${uploadProgress}%` }]}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.analyzeButton, { backgroundColor: colors.primary }]}
              onPress={handleAnalyze}
              disabled={isLoading}
              data-testid="analyze-batch-button"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="shield-search" size={24} color="#FFFFFF" />
                  <Text style={styles.analyzeButtonText}>Analyze All Files</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.surface }]}
              onPress={() => setSelectedFiles([])}
              disabled={isLoading}
            >
              <Icon name="delete" size={20} color={colors.error} />
              <Text style={[styles.clearButtonText, { color: colors.error }]}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 32,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    gap: 24,
  },
  uploadButton: {
    padding: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  uploadButtonSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  uploadButtonHint: {
    fontSize: 12,
    marginTop: 8,
  },
  filesList: {
    flex: 1,
  },
  filesListContent: {
    paddingBottom: 20,
  },
  filesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filesTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileItemsList: {
    gap: 12,
  },
  fileItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
  },
  removeButton: {
    padding: 4,
  },
  progressContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  analyzeButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

export default BatchAnalysisScreen;
