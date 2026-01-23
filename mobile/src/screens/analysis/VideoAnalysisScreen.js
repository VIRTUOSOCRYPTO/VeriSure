import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import DocumentPicker from 'react-native-document-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useOffline } from '../../contexts/OfflineContext';
import apiService from '../../services/apiService';
import { ANALYSIS_CONFIG } from '../../config/constants';

const VideoAnalysisScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { isConnected } = useOffline();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePickVideo = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
      });

      const video = result[0];
      if (video.size > ANALYSIS_CONFIG.MAX_FILE_SIZE) {
        Toast.show({
          type: 'error',
          text1: 'File Too Large',
          text2: `Maximum file size is ${ANALYSIS_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
        return;
      }

      setSelectedVideo(video);
    } catch (error) {
      if (DocumentPicker.isCancel(error)) return;
      Toast.show({
        type: 'error',
        text1: 'Selection Error',
        text2: error.message,
      });
    }
  };

  const handleAnalyze = async () => {
    if (!selectedVideo) {
      Toast.show({
        type: 'error',
        text1: 'No Video Selected',
        text2: 'Please select a video first',
      });
      return;
    }

    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'No Internet',
        text2: 'Video analysis requires internet connection',
      });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const file = {
        uri: selectedVideo.uri,
        type: selectedVideo.type,
        name: selectedVideo.name,
      };

      const result = await apiService.analysis.analyzeFile(file, (progress) => {
        setUploadProgress(progress);
      });

      // Video analysis is typically async
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
          <Icon name="video" size={60} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Video Analysis</Text>
          <Text style={styles.headerSubtitle}>
            Detect deepfakes and video manipulations
          </Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          {!selectedVideo ? (
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handlePickVideo}
              data-testid="pick-video-button"
            >
              <Icon name="video-plus" size={64} color={colors.primary} />
              <Text style={[styles.uploadButtonText, { color: colors.text }]}>Select Video</Text>
              <Text style={[styles.uploadButtonSubtext, { color: colors.textSecondary }]}>
                Choose from your device
              </Text>
              <Text style={[styles.uploadButtonHint, { color: colors.textSecondary }]}>
                Max {ANALYSIS_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB • MP4, MOV, AVI
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.selectedSection}>
              <View style={[styles.videoCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.videoIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Icon name="video" size={40} color={colors.primary} />
                </View>
                <View style={styles.videoInfo}>
                  <Text style={[styles.videoName, { color: colors.text }]} numberOfLines={1}>
                    {selectedVideo.name}
                  </Text>
                  <Text style={[styles.videoSize, { color: colors.textSecondary }]}>
                    {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.changeButton, { backgroundColor: colors.surface }]}
                onPress={() => setSelectedVideo(null)}
              >
                <Icon name="refresh" size={20} color={colors.primary} />
                <Text style={[styles.changeButtonText, { color: colors.primary }]}>Choose Different Video</Text>
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
                data-testid="analyze-video-button"
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="shield-search" size={24} color="#FFFFFF" />
                    <Text style={styles.analyzeButtonText}>Analyze Video</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.warningCard, { backgroundColor: colors.warning + '20' }]}>
            <Icon name="clock-alert" size={24} color={colors.warning} />
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, { color: colors.warning }]}>Processing Time</Text>
              <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                Video analysis may take 2-5 minutes depending on file size. You'll be notified when complete.
              </Text>
            </View>
          </View>

          <View style={[styles.tipCard, { backgroundColor: colors.surface }]}>
            <Icon name="lightbulb-on" size={24} color={colors.info} />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>What We Detect</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                • Deepfake videos{"\n"}
                • Face swapping{"\n"}
                • Video manipulations{"\n"}
                • Audio-video sync issues{"\n"}
                • Forensic analysis
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
  selectedSection: {
    gap: 16,
  },
  videoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  videoIcon: {
    width: 72,
    height: 72,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoSize: {
    fontSize: 14,
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
  warningCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
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

export default VideoAnalysisScreen;
