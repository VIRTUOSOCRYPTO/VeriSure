import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import { useOffline } from '../../contexts/OfflineContext';
import apiService from '../../services/apiService';
import { ANALYSIS_CONFIG } from '../../config/constants';

const TextAnalysisScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { isConnected, queueItem } = useOffline();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Empty Text',
        text2: 'Please enter some text to analyze',
      });
      return;
    }

    if (text.length > ANALYSIS_CONFIG.MAX_TEXT_LENGTH) {
      Toast.show({
        type: 'error',
        text1: 'Text Too Long',
        text2: `Maximum ${ANALYSIS_CONFIG.MAX_TEXT_LENGTH} characters allowed`,
      });
      return;
    }

    if (!isConnected) {
      await queueItem({
        type: 'text_analysis',
        data: { text },
        timestamp: Date.now(),
      });
      Toast.show({
        type: 'info',
        text1: 'Queued for Later',
        text2: 'Analysis will be processed when you\'re online',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiService.analysis.analyzeText(text);
      
      if (result.job_id) {
        // Async processing
        navigation.navigate('JobStatus', { jobId: result.job_id });
      } else if (result.report) {
        // Immediate result
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
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getString();
      if (clipboardContent && clipboardContent.trim()) {
        setText(clipboardContent);
        Toast.show({
          type: 'success',
          text1: 'Pasted from Clipboard',
          text2: `${clipboardContent.length} characters pasted`,
        });
      } else {
        Toast.show({
          type: 'info',
          text1: 'Clipboard Empty',
          text2: 'No text found in clipboard',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Paste Failed',
        text2: 'Could not read clipboard',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <Icon name="text-box" size={60} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Text Analysis</Text>
          <Text style={styles.headerSubtitle}>
            Analyze messages, emails, or any text content
          </Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <View style={styles.inputHeader}>
            <Text style={[styles.label, { color: colors.text }]}>Enter Text</Text>
            <TouchableOpacity onPress={handlePaste} style={styles.pasteButton}>
              <Icon name="content-paste" size={20} color={colors.primary} />
              <Text style={[styles.pasteText, { color: colors.primary }]}>Paste</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.textInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Paste or type your message here...\n\nExample: 'You have won ₹10 lakh! Click here to claim now...'"
              placeholderTextColor={colors.textSecondary}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />
          </View>

          <Text style={[styles.charCount, { color: colors.textSecondary }]}>
            {text.length} / {ANALYSIS_CONFIG.MAX_TEXT_LENGTH} characters
          </Text>

          <TouchableOpacity
            style={[styles.analyzeButton, { backgroundColor: colors.primary }]}
            onPress={handleAnalyze}
            disabled={isLoading}
            data-testid="analyze-text-button"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="shield-search" size={24} color="#FFFFFF" />
                <Text style={styles.analyzeButtonText}>Analyze Text</Text>
              </>
            )}
          </TouchableOpacity>

          {!isConnected && (
            <View style={[styles.offlineNotice, { backgroundColor: colors.warning + '20' }]}>
              <Icon name="wifi-off" size={20} color={colors.warning} />
              <Text style={[styles.offlineText, { color: colors.warning }]}>
                You're offline. Analysis will be queued.
              </Text>
            </View>
          )}

          <View style={[styles.tipCard, { backgroundColor: colors.surface }]}>
            <Icon name="lightbulb-on" size={24} color={colors.info} />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>Tips</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                • Works best with SMS, emails, WhatsApp messages{"\n"}
                • Detects phishing, scams, and fake offers{"\n"}
                • Supports multiple Indian languages
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pasteText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textInputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
  },
  textInput: {
    fontSize: 16,
    minHeight: 180,
  },
  charCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
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
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  offlineText: {
    fontSize: 14,
    flex: 1,
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

export default TextAnalysisScreen;
