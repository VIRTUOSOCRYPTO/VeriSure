import React, { useState, useRef } from 'react';
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
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { useTheme } from '../../contexts/ThemeContext';
import { useOffline } from '../../contexts/OfflineContext';
import apiService from '../../services/apiService';
import { ANALYSIS_CONFIG } from '../../config/constants';

const audioRecorderPlayer = new AudioRecorderPlayer();

const AudioAnalysisScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { isConnected } = useOffline();
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState('00:00');
  const [recordedAudioPath, setRecordedAudioPath] = useState(null);
  const recordingTimerRef = useRef(null);

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
      });

      const audio = result[0];
      if (audio.size > ANALYSIS_CONFIG.MAX_FILE_SIZE) {
        Toast.show({
          type: 'error',
          text1: 'File Too Large',
          text2: `Maximum file size is ${ANALYSIS_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
        return;
      }

      setSelectedAudio(audio);
    } catch (error) {
      if (DocumentPicker.isCancel(error)) return;
      Toast.show({
        type: 'error',
        text1: 'Selection Error',
        text2: error.message,
      });
    }
  };

  const handleRecord = async () => {
    if (isRecording) {
      // Stop recording
      try {
        const result = await audioRecorderPlayer.stopRecorder();
        audioRecorderPlayer.removeRecordBackListener();
        setIsRecording(false);
        setRecordedAudioPath(result);
        
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }

        // Create audio object from recorded file
        const fileName = result.split('/').pop();
        setSelectedAudio({
          uri: result,
          name: fileName,
          type: 'audio/m4a',
          size: 0, // Will be calculated on upload
        });

        Toast.show({
          type: 'success',
          text1: 'Recording Saved',
          text2: 'Your audio has been recorded successfully',
        });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Recording Failed',
          text2: error.message,
        });
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const path = Platform.select({
          ios: 'recording.m4a',
          android: 'recording.mp4',
        });
        
        await audioRecorderPlayer.startRecorder(path);
        audioRecorderPlayer.addRecordBackListener((e) => {
          const minutes = Math.floor(e.currentPosition / 60000);
          const seconds = Math.floor((e.currentPosition % 60000) / 1000);
          setRecordingTime(
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
        });
        
        setIsRecording(true);
        Toast.show({
          type: 'info',
          text1: 'Recording Started',
          text2: 'Tap the button again to stop',
        });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Recording Failed',
          text2: error.message,
        });
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedAudio) {
      Toast.show({
        type: 'error',
        text1: 'No Audio Selected',
        text2: 'Please select an audio file first',
      });
      return;
    }

    if (!isConnected) {
      Toast.show({
        type: 'error',
        text1: 'No Internet',
        text2: 'Audio analysis requires internet connection',
      });
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const file = {
        uri: selectedAudio.uri,
        type: selectedAudio.type,
        name: selectedAudio.name,
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
          <Icon name="microphone" size={60} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Audio Analysis</Text>
          <Text style={styles.headerSubtitle}>
            Detect voice clones and audio manipulations
          </Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          {!selectedAudio ? (
            <View style={styles.uploadSection}>
              <TouchableOpacity
                style={[styles.recordButton, { backgroundColor: isRecording ? colors.error : colors.error + '20', borderColor: colors.error }]}
                onPress={handleRecord}
                data-testid="record-audio-button"
              >
                <View style={[styles.recordIcon, { backgroundColor: isRecording ? '#FFFFFF' : colors.error }]}>
                  <Icon name={isRecording ? 'stop' : 'microphone'} size={32} color={isRecording ? colors.error : '#FFFFFF'} />
                </View>
                <Text style={[styles.recordButtonText, { color: colors.text }]}>
                  {isRecording ? 'Stop Recording' : 'Record Audio'}
                </Text>
                {isRecording ? (
                  <Text style={[styles.recordingTime, { color: colors.error }]}>{recordingTime}</Text>
                ) : (
                  <Text style={[styles.recordButtonSubtext, { color: colors.textSecondary }]}>
                    Record voice message
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handlePickAudio}
                data-testid="pick-audio-button"
              >
                <Icon name="file-music" size={48} color={colors.primary} />
                <Text style={[styles.uploadButtonText, { color: colors.text }]}>Select Audio File</Text>
                <Text style={[styles.uploadButtonSubtext, { color: colors.textSecondary }]}>
                  Choose from your device
                </Text>
                <Text style={[styles.uploadButtonHint, { color: colors.textSecondary }]}>
                  Max {ANALYSIS_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB • MP3, WAV, M4A
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectedSection}>
              <View style={[styles.audioCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.audioIcon, { backgroundColor: colors.success + '20' }]}>
                  <Icon name="music" size={40} color={colors.success} />
                </View>
                <View style={styles.audioInfo}>
                  <Text style={[styles.audioName, { color: colors.text }]} numberOfLines={1}>
                    {selectedAudio.name}
                  </Text>
                  <Text style={[styles.audioSize, { color: colors.textSecondary }]}>
                    {(selectedAudio.size / (1024 * 1024)).toFixed(2)} MB
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.changeButton, { backgroundColor: colors.surface }]}
                onPress={() => setSelectedAudio(null)}
              >
                <Icon name="refresh" size={20} color={colors.primary} />
                <Text style={[styles.changeButtonText, { color: colors.primary }]}>Choose Different Audio</Text>
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
                data-testid="analyze-audio-button"
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="shield-search" size={24} color="#FFFFFF" />
                    <Text style={styles.analyzeButtonText}>Analyze Audio</Text>
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
                • AI voice cloning{"\n"}
                • Audio manipulations{"\n"}
                • Background noise analysis{"\n"}
                • Voice authenticity verification
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
  recordButton: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  recordIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  recordButtonSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  recordingTime: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 16,
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
  uploadButtonHint: {
    fontSize: 12,
    marginTop: 8,
  },
  selectedSection: {
    gap: 16,
  },
  audioCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  audioIcon: {
    width: 72,
    height: 72,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioInfo: {
    flex: 1,
  },
  audioName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  audioSize: {
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
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
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

export default AudioAnalysisScreen;
