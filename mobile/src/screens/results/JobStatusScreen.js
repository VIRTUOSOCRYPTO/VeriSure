import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import apiService from '../../services/apiService';
import { ANALYSIS_CONFIG } from '../../config/constants';

const JobStatusScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const { colors } = useTheme();
  const [jobStatus, setJobStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    pollJobStatus();
  }, []);

  const pollJobStatus = async () => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await apiService.analysis.getJobStatus(jobId);
        setJobStatus(status);
        setProgress(status.progress || 0);

        if (status.status === 'completed' && status.report_id) {
          clearInterval(pollInterval);
          setIsPolling(false);
          
          // Fetch the report
          const report = await apiService.analysis.getReport(status.report_id);
          navigation.replace('Result', { report });
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setIsPolling(false);
          Toast.show({
            type: 'error',
            text1: 'Analysis Failed',
            text2: status.error || 'Something went wrong',
          });
          navigation.goBack();
        }
      } catch (error) {
        clearInterval(pollInterval);
        setIsPolling(false);
        Toast.show({
          type: 'error',
          text1: 'Status Check Failed',
          text2: error.response?.data?.detail || 'Something went wrong',
        });
        navigation.goBack();
      }
    }, ANALYSIS_CONFIG.POLL_INTERVAL);

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  };

  const getStatusMessage = () => {
    if (!jobStatus) return 'Initializing...';
    
    switch (jobStatus.status) {
      case 'queued':
        return 'Queued for processing...';
      case 'processing':
        return 'Analyzing content...';
      case 'completed':
        return 'Complete! Loading results...';
      case 'failed':
        return 'Analysis failed';
      default:
        return 'Processing...';
    }
  };

  const getStatusIcon = () => {
    if (!jobStatus || jobStatus.status === 'queued') return 'clock-outline';
    if (jobStatus.status === 'processing') return 'cog';
    if (jobStatus.status === 'completed') return 'check-circle';
    if (jobStatus.status === 'failed') return 'alert-circle';
    return 'dots-horizontal';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <Icon name="cloud-upload" size={60} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Processing</Text>
        <Text style={styles.headerSubtitle}>Please wait while we analyze your content</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statusIconContainer}>
            {isPolling ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <Icon name={getStatusIcon()} size={64} color={colors.primary} />
            )}
          </View>

          <Text style={[styles.statusText, { color: colors.text }]}>
            {getStatusMessage()}
          </Text>

          {jobStatus && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  Progress
                </Text>
                <Text style={[styles.progressPercent, { color: colors.text }]}>
                  {progress}%
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.primary, width: `${progress}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Icon name="information" size={24} color={colors.info} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>What's Happening?</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              • Uploading your file to secure servers{"\n"}
              • Running advanced AI analysis{"\n"}
              • Checking against scam databases{"\n"}
              • Generating detailed report{"\n"}\n
              This usually takes 2-5 minutes for videos and audio files.
            </Text>
          </View>
        </View>

        {jobStatus?.eta && (
          <View style={[styles.etaCard, { backgroundColor: colors.warning + '20' }]}>
            <Icon name="clock-outline" size={20} color={colors.warning} />
            <Text style={[styles.etaText, { color: colors.warning }]}>
              Estimated time remaining: {Math.ceil(jobStatus.eta / 60)} minutes
            </Text>
          </View>
        )}
      </ScrollView>
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
    textAlign: 'center',
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  statusCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  statusIconContainer: {
    marginBottom: 24,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressSection: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
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
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  etaCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default JobStatusScreen;
