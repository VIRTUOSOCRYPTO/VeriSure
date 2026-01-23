import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useOffline } from '../../contexts/OfflineContext';
import apiService from '../../services/apiService';
import { ANALYSIS_CONFIG } from '../../config/constants';

const ImageAnalysisScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { isConnected } = useOffline();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const checkFileSize = (fileSize) => {
    if (fileSize > ANALYSIS_CONFIG.MAX_FILE_SIZE) {
      Toast.show({
        type: 'error',
        text1: 'File Too Large',
        text2: `Maximum file size is ${ANALYSIS_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
      return false;
    }
    return true;
  };

  const handleCamera = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: result.errorMessage,
      });
      return;
    }

    const asset = result.assets[0];
    if (checkFileSize(asset.fileSize)) {
      setSelectedImage(asset);
    }
  };

  const handleGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
      includeBase64: false,
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      Toast.show({
        type: 'error',
        text1: 'Gallery Error',
        text2: result.errorMessage,
      });
      return;
    }

    const asset = result.assets[0];
    if (checkFileSize(asset.fileSize)) {
      setSelectedImage(asset);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      Toast.show({
        type: 'error',
        text1: 'No Image Selected',
        text2: 'Please select an image first',
      });
      return;
    }

    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'No Internet',
        text2: 'Image analysis requires internet connection',
      });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const file = {
        uri: selectedImage.uri,
        type: selectedImage.type,
        name: selectedImage.fileName || 'image.jpg',
      };

      const result = await apiService.analysis.analyzeFile(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.job_id) {
        navigation.navigate('JobStatus', { jobId: result.job_id });
      } else if (result.report) {
        navigation.navigate('Result', { report: result.report });
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <Icon name="image" size={60} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Image Analysis</Text>
          <Text style={styles.headerSubtitle}>
            Detect AI-generated images and manipulations
          </Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          {!selectedImage ? (
            <View style={styles.uploadSection}>
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleCamera}
                data-testid="camera-button"
              >
                <Icon name="camera" size={48} color={colors.primary} />
                <Text style={[styles.uploadButtonText, { color: colors.text }]}>Take Photo</Text>
                <Text style={[styles.uploadButtonSubtext, { color: colors.textSecondary }]}>
                  Use camera to capture
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleGallery}
                data-testid="gallery-button"
              >
                <Icon name="image-multiple" size={48} color={colors.secondary} />
                <Text style={[styles.uploadButtonText, { color: colors.text }]}>Choose from Gallery</Text>
                <Text style={[styles.uploadButtonSubtext, { color: colors.textSecondary }]}>
                  Select existing photo
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.previewSection}>
              <Text style={[styles.label, { color: colors.text }]}>Selected Image</Text>
              <View style={[styles.imagePreviewContainer, { backgroundColor: colors.surface }]}>
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} resizeMode="contain" />
              </View>

              <View style={[styles.imageInfo, { backgroundColor: colors.surface }]}>
                <Icon name="information" size={20} color={colors.info} />
                <View style={styles.imageInfoContent}>
                  <Text style={[styles.imageInfoText, { color: colors.text }]}>
                    {selectedImage.fileName || 'image.jpg'}
                  </Text>
                  <Text style={[styles.imageInfoSubtext, { color: colors.textSecondary }]}>
                    {(selectedImage.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.changeButton, { backgroundColor: colors.surface }]}
                onPress={() => setSelectedImage(null)}
              >
                <Icon name="refresh" size={20} color={colors.primary} />
                <Text style={[styles.changeButtonText, { color: colors.primary }]}>Choose Different Image</Text>
              </TouchableOpacity>

              {isLoading && uploadProgress > 0 && (
                <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressText, { color: colors.text }]}>Uploading...</Text>
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
                data-testid="analyze-image-button"
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="shield-search" size={24} color="#FFFFFF" />
                    <Text style={styles.analyzeButtonText}>Analyze Image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.tipCard, { backgroundColor: colors.surface }]}>
            <Icon name="lightbulb-on" size={24} color={colors.info} />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>What We Detect</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                • AI-generated images{"\n"}
                • Photo manipulations & edits{"\n"}
                • Deepfakes and face swaps{"\n"}
                • Metadata analysis
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
    textAlign: 'center',
  },
  formContainer: {
    padding: 20,
  },
  uploadSection: {
    gap: 16,
  },
  uploadButton: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  uploadButtonSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  previewSection: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageInfo: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 12,
  },
  imageInfoContent: {
    flex: 1,
  },
  imageInfoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imageInfoSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  changeButton: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    padding: 16,
    borderRadius: 12,
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
    gap: 8,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
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

export default ImageAnalysisScreen;
