import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isConnected, queuedItems } = useOffline();

  const analysisOptions = [
    {
      title: 'Text Analysis',
      icon: 'text-box',
      color: '#7C3AED',
      screen: 'TextAnalysis',
      description: 'Analyze messages & content',
    },
    {
      title: 'Image Analysis',
      icon: 'image',
      color: '#EC4899',
      screen: 'ImageAnalysis',
      description: 'Scan photos & screenshots',
    },
    {
      title: 'Video Analysis',
      icon: 'video',
      color: '#F59E0B',
      screen: 'VideoAnalysis',
      description: 'Check videos for deepfakes',
    },
    {
      title: 'Audio Analysis',
      icon: 'microphone',
      color: '#10B981',
      screen: 'AudioAnalysis',
      description: 'Verify voice recordings',
    },
    {
      title: 'Batch Analysis',
      icon: 'file-multiple',
      color: '#3B82F6',
      screen: 'BatchAnalysis',
      description: 'Process multiple files',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
          </View>
          <Icon name="shield-check" size={40} color="#FFFFFF" />
        </View>

        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Icon name="wifi-off" size={16} color="#FFFFFF" />
            <Text style={styles.offlineText}>
              Offline Mode {queuedItems.length > 0 && `• ${queuedItems.length} queued`}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Select Analysis Type
        </Text>

        <View style={styles.gridContainer}>
          {analysisOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => navigation.navigate(option.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                <Icon name={option.icon} size={32} color={option.color} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {option.title}
              </Text>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                {option.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Icon name="chart-line" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {user?.api_calls_count || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Analyses Done
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <Icon name="clock-check" size={24} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {user?.api_calls_limit || 100}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Daily Limit
            </Text>
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
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  card: {
    width: (width - 56) / 2,
    margin: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 11,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default HomeScreen;
