import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import apiService from '../../services/apiService';
import storageService from '../../services/storageService';
import { getRiskColor, getRiskIcon } from '../../utils/riskUtils';

const ComparisonScreen = () => {
  const { colors } = useTheme();
  const [selectedReports, setSelectedReports] = useState([]);
  const [availableReports, setAvailableReports] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const cached = await storageService.getCachedReports();
      setAvailableReports(cached || []);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Load Failed',
        text2: 'Could not load reports',
      });
    }
  };

  const toggleReportSelection = (report) => {
    if (selectedReports.find((r) => r.report_id === report.report_id)) {
      setSelectedReports(selectedReports.filter((r) => r.report_id !== report.report_id));
    } else if (selectedReports.length < 3) {
      setSelectedReports([...selectedReports, report]);
    } else {
      Toast.show({
        type: 'info',
        text1: 'Maximum Reached',
        text2: 'You can compare up to 3 reports',
      });
    }
  };

  const handleCompare = async () => {
    if (selectedReports.length < 2) {
      Toast.show({
        type: 'error',
        text1: 'Select More Reports',
        text2: 'Please select at least 2 reports to compare',
      });
      return;
    }

    setIsLoading(true);
    try {
      const reportIds = selectedReports.map((r) => r.report_id);
      const result = await apiService.comparison.compareReports(reportIds);
      setComparisonResult(result);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Comparison Failed',
        text2: error.response?.data?.detail || 'Something went wrong',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderReportSelector = () => (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Select Reports to Compare ({selectedReports.length}/3)
      </Text>
      <ScrollView style={styles.reportsList} nestedScrollEnabled>
        {availableReports.slice(0, 10).map((report) => {
          const isSelected = selectedReports.find((r) => r.report_id === report.report_id);
          const riskColor = getRiskColor(report.risk_level, colors);

          return (
            <TouchableOpacity
              key={report.report_id}
              style={[
                styles.reportItem,
                {
                  backgroundColor: isSelected ? colors.primary + '20' : colors.background,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => toggleReportSelection(report)}
              data-testid={`report-selector-${report.report_id}`}
            >
              <View style={styles.reportItemContent}>
                <View style={[styles.reportIcon, { backgroundColor: riskColor + '20' }]}>
                  <Icon name={getRiskIcon(report.risk_level)} size={20} color={riskColor} />
                </View>
                <View style={styles.reportInfo}>
                  <Text style={[styles.reportType, { color: colors.text }]}>
                    {report.input_type || 'Analysis'}
                  </Text>
                  <Text style={[styles.reportRisk, { color: riskColor }]}>
                    {report.risk_level?.toUpperCase()}
                  </Text>
                </View>
              </View>
              {isSelected && <Icon name="check-circle" size={24} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity
        style={[styles.compareButton, { backgroundColor: colors.primary }]}
        onPress={handleCompare}
        disabled={isLoading || selectedReports.length < 2}
        data-testid="compare-button"
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Icon name="compare" size={24} color="#FFFFFF" />
            <Text style={styles.compareButtonText}>Compare Selected</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderComparisonResult = () => (
    <View style={styles.resultSection}>
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Icon name="chart-bar" size={24} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Comparison Summary</Text>
        </View>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {comparisonResult.summary || 'Comparison completed successfully.'}
        </Text>
      </View>

      {comparisonResult.common_patterns && comparisonResult.common_patterns.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Icon name="alert" size={24} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Common Patterns</Text>
          </View>
          {comparisonResult.common_patterns.map((pattern, index) => (
            <View key={index} style={styles.patternItem}>
              <Icon name="checkbox-marked" size={20} color={colors.warning} />
              <Text style={[styles.patternText, { color: colors.text }]}>{pattern}</Text>
            </View>
          ))}
        </View>
      )}

      {comparisonResult.differences && comparisonResult.differences.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Icon name="vector-difference" size={24} color={colors.info} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Differences</Text>
          </View>
          {comparisonResult.differences.map((diff, index) => (
            <View key={index} style={styles.differenceItem}>
              <Text style={[styles.differenceText, { color: colors.textSecondary }]}>{diff}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.resetButton, { backgroundColor: colors.surface }]}
        onPress={() => {
          setComparisonResult(null);
          setSelectedReports([]);
        }}
      >
        <Icon name="refresh" size={20} color={colors.primary} />
        <Text style={[styles.resetButtonText, { color: colors.primary }]}>New Comparison</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <Icon name="compare" size={60} color="#FFFFFF" />
        <Text style={styles.headerTitle}>Compare Reports</Text>
        <Text style={styles.headerSubtitle}>Find patterns across multiple analyses</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {comparisonResult ? renderComparisonResult() : renderReportSelector()}
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
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  reportsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
  },
  reportItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportType: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  reportRisk: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  compareButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  compareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultSection: {
    flex: 1,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
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
  differenceItem: {
    padding: 12,
    marginBottom: 8,
  },
  differenceText: {
    fontSize: 14,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ComparisonScreen;
