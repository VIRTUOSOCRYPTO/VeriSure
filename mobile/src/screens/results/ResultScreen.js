import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import Share from 'react-native-share';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
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

  const handleExportPDF = async () => {
    try {
      // Request storage permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Toast.show({
            type: 'error',
            text1: 'Permission Denied',
            text2: 'Storage permission is required to save PDF',
          });
          return;
        }
      }

      const riskColor = getRiskColor(report.risk_level, colors);
      
      // Generate HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>VeriSure Analysis Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            .header {
              background: linear-gradient(135deg, #7C3AED, #6D28D9);
              color: white;
              padding: 30px;
              border-radius: 12px;
              text-align: center;
              margin-bottom: 30px;
            }
            .risk-badge {
              background: ${riskColor};
              color: white;
              padding: 10px 20px;
              border-radius: 8px;
              font-size: 24px;
              font-weight: bold;
              display: inline-block;
              margin: 10px 0;
            }
            .section {
              margin-bottom: 25px;
              padding: 20px;
              background: #f9f9f9;
              border-radius: 8px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #7C3AED;
              margin-bottom: 15px;
            }
            .pattern-item, .recommendation-item {
              margin: 10px 0;
              padding-left: 20px;
            }
            .evidence-item {
              background: white;
              padding: 15px;
              margin: 10px 0;
              border-radius: 6px;
              border-left: 4px solid #7C3AED;
            }
            .metadata {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e0e0e0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛡️ VeriSure</h1>
            <h2>AI Scam Detection Report</h2>
            <div class="risk-badge">${report.risk_level?.toUpperCase() || 'UNKNOWN'} RISK</div>
            <p style="margin-top: 15px; font-size: 16px;">${report.verdict || 'Analysis Complete'}</p>
          </div>

          <div class="section">
            <div class="section-title">📋 Summary</div>
            <p>${report.summary || 'Analysis completed successfully.'}</p>
          </div>

          ${report.scam_patterns && report.scam_patterns.length > 0 ? `
          <div class="section">
            <div class="section-title">⚠️ Detected Patterns</div>
            ${report.scam_patterns.map(pattern => `
              <div class="pattern-item">• ${pattern}</div>
            `).join('')}
          </div>
          ` : ''}

          ${report.evidence && report.evidence.length > 0 ? `
          <div class="section">
            <div class="section-title">📄 Evidence</div>
            ${report.evidence.map(item => `
              <div class="evidence-item">
                <strong>${item.title}</strong>
                <p>${item.description}</p>
                ${item.confidence ? `<p><em>Confidence: ${item.confidence}%</em></p>` : ''}
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${report.recommendations && report.recommendations.length > 0 ? `
          <div class="section">
            <div class="section-title">💡 Recommendations</div>
            ${report.recommendations.map(rec => `
              <div class="recommendation-item">✓ ${rec}</div>
            `).join('')}
          </div>
          ` : ''}

          <div class="metadata">
            <div>
              <strong>Analysis Date:</strong><br>
              ${formatDate(report.timestamp)}
            </div>
            <div>
              <strong>Content Type:</strong><br>
              ${report.input_type || 'Unknown'}
            </div>
            <div>
              <strong>Report ID:</strong><br>
              ${report.report_id || 'N/A'}
            </div>
          </div>

          <div class="footer">
            <p>Generated by VeriSure - AI-Powered Scam Detection Platform</p>
            <p>This report is confidential and for the intended recipient only.</p>
          </div>
        </body>
        </html>
      `;

      // Generate PDF
      const options = {
        html: htmlContent,
        fileName: `VeriSure_Report_${Date.now()}`,
        directory: Platform.OS === 'android' ? 'Documents' : 'Documents',
      };

      const file = await RNHTMLtoPDF.convert(options);
      
      Toast.show({
        type: 'success',
        text1: 'PDF Generated',
        text2: 'Report exported successfully',
      });

      // Share the PDF
      await Share.open({
        url: `file://${file.filePath}`,
        type: 'application/pdf',
        title: 'Share VeriSure Report',
      });
    } catch (error) {
      if (error.message !== 'User did not share') {
        Toast.show({
          type: 'error',
          text1: 'Export Failed',
          text2: error.message || 'Could not generate PDF',
        });
      }
    }
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
