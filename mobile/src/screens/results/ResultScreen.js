import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import Share from 'react-native-share';
import { useTheme } from '../../contexts/ThemeContext';
import { getRiskColor, getRiskIcon } from '../../utils/riskUtils';
import { formatDate } from '../../utils/dateUtils';

const ResultScreen = ({ route }) => {
  const { report } = route.params;
  const { colors } = useTheme();

  const handleShare = async () => {
    try {
      const shareMessage = `VeriSure Analysis Report\n\nRisk Level: ${report.risk_level.toUpperCase()}\nVerdict: ${report.verdict}\n\nAnalyzed on ${formatDate(report.timestamp)}`;
      
      await Share.open({
        message: shareMessage,
        title: 'VeriSure Report',
      });
    } catch (error) {
      if (error.message !== 'User did not share') {
        Toast.show({
          type: 'error',
          text1: 'Share Failed',
          text2: error.message,
        });
      }
    }
  };

  const handleExportPDF = () => {
    Toast.show({
      type: 'info',
      text1: 'Export PDF',
      text2: 'PDF export feature coming soon',
    });
  };

  const riskColor = getRiskColor(report.risk_level, colors);
  const riskIcon = getRiskIcon(report.risk_level);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={[riskColor, riskColor + 'CC']}
          style={styles.header}
        >
          <Icon name={riskIcon} size={80} color="#FFFFFF" />
          <Text style={styles.riskLevel}>{report.risk_level.toUpperCase()} RISK</Text>
          <Text style={styles.verdict}>{report.verdict}</Text>
        </LinearGradient>

        <View style={styles.sections}>
          {/* Summary Section */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <Icon name="information" size={24} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Summary</Text>
            </View>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {report.summary || 'Analysis completed successfully.'}
            </Text>
          </View>

          {/* Scam Patterns */}
          {report.scam_patterns && report.scam_patterns.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Icon name="alert" size={24} color={colors.error} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Detected Patterns</Text>
              </View>
              {report.scam_patterns.map((pattern, index) => (
                <View key={index} style={styles.patternItem}>
                  <Icon name="checkbox-marked-circle" size={20} color={colors.error} />
                  <Text style={[styles.patternText, { color: colors.text }]}>{pattern}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Evidence */}
          {report.evidence && report.evidence.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Icon name="file-document" size={24} color={colors.info} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Evidence</Text>
              </View>
              {report.evidence.map((item, index) => (
                <View key={index} style={[styles.evidenceItem, { backgroundColor: colors.background }]}>
                  <Text style={[styles.evidenceTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.evidenceDescription, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>
                  {item.confidence && (
                    <View style={styles.confidenceBar}>
                      <Text style={[styles.confidenceLabel, { color: colors.textSecondary }]}>
                        Confidence: {item.confidence}%
                      </Text>
                      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                        <View
                          style={[
                            styles.progressFill,
                            { backgroundColor: colors.primary, width: `${item.confidence}%` },
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHeader}>
                <Icon name="lightbulb" size={24} color={colors.success} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Recommendations</Text>
              </View>
              {report.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Icon name="check-circle" size={20} color={colors.success} />
                  <Text style={[styles.recommendationText, { color: colors.text }]}>{rec}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Metadata */}
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <Icon name="clock" size={24} color={colors.textSecondary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Details</Text>
            </View>
            <View style={styles.metadataGrid}>
              <View style={styles.metadataItem}>
                <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>Analyzed</Text>
                <Text style={[styles.metadataValue, { color: colors.text }]}>
                  {formatDate(report.timestamp)}
                </Text>
              </View>
              <View style={styles.metadataItem}>
                <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>Type</Text>
                <Text style={[styles.metadataValue, { color: colors.text }]}>
                  {report.input_type || 'Unknown'}
                </Text>
              </View>
              {report.report_id && (
                <View style={styles.metadataItem}>
                  <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>Report ID</Text>
                  <Text style={[styles.metadataValue, { color: colors.text }]} numberOfLines={1}>
                    {report.report_id}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleShare}
              data-testid="share-report-button"
            >
              <Icon name="share" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.secondary }]}
              onPress={handleExportPDF}
              data-testid="export-pdf-button"
            >
              <Icon name="file-pdf-box" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Export PDF</Text>
            </TouchableOpacity>
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
    padding: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  riskLevel: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
  },
  verdict: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  sections: {
    padding: 20,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  patternText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  evidenceItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  evidenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  evidenceDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  confidenceBar: {
    marginTop: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  metadataGrid: {
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataLabel: {
    fontSize: 14,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResultScreen;
