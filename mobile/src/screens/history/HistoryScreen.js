import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import apiService from '../../services/apiService';
import storageService from '../../services/storageService';
import { getRiskColor, getRiskIcon } from '../../utils/riskUtils';
import { timeAgo } from '../../utils/dateUtils';
import { RISK_LEVELS } from '../../config/constants';

const HistoryScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [selectedFilter]);

  const loadHistory = async () => {
    try {
      const data = await apiService.history.getHistory(50, 0, selectedFilter);
      setReports(data.reports || []);
      
      // Cache reports for offline viewing
      await storageService.cacheReports(data.reports || []);
    } catch (error) {
      // Try loading from cache if API fails
      const cached = await storageService.getCachedReports();
      if (cached && cached.length > 0) {
        setReports(cached);
        Toast.show({
          type: 'info',
          text1: 'Offline Mode',
          text2: 'Showing cached reports',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Load Failed',
          text2: error.response?.data?.detail || 'Could not load history',
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadHistory();
  }, [selectedFilter]);

  const handleReportPress = (report) => {
    navigation.navigate('Result', { report });
  };

  const renderFilterButton = (label, value) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { 
          backgroundColor: selectedFilter === value ? colors.primary : colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={() => setSelectedFilter(selectedFilter === value ? null : value)}
      data-testid={`filter-${value || 'all'}`}
    >
      <Text
        style={[
          styles.filterButtonText,
          { color: selectedFilter === value ? '#FFFFFF' : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderReportItem = ({ item }) => {
    const riskColor = getRiskColor(item.risk_level, colors);
    const riskIcon = getRiskIcon(item.risk_level);

    return (
      <TouchableOpacity
        style={[styles.reportCard, { backgroundColor: colors.surface }]}
        onPress={() => handleReportPress(item)}
        data-testid={`report-item-${item.report_id}`}
      >
        <View style={[styles.riskBadge, { backgroundColor: riskColor + '20' }]}>
          <Icon name={riskIcon} size={24} color={riskColor} />
        </View>

        <View style={styles.reportContent}>
          <View style={styles.reportHeader}>
            <Text style={[styles.reportType, { color: colors.text }]} numberOfLines={1}>
              {item.input_type || 'Analysis'}
            </Text>
            <View style={[styles.riskLabel, { backgroundColor: riskColor + '20' }]}>
              <Text style={[styles.riskLabelText, { color: riskColor }]}>
                {item.risk_level?.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={[styles.reportVerdict, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.verdict || 'No verdict available'}
          </Text>

          <View style={styles.reportFooter}>
            <Icon name="clock-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.reportTime, { color: colors.textSecondary }]}>
              {timeAgo(item.timestamp)}
            </Text>
          </View>
        </View>

        <Icon name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="history" size={80} color={colors.textSecondary} opacity={0.3} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No History Yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Your analysis reports will appear here
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.filtersContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {renderFilterButton('All', null)}
          {renderFilterButton('High Risk', RISK_LEVELS.HIGH)}
          {renderFilterButton('Medium Risk', RISK_LEVELS.MEDIUM)}
          {renderFilterButton('Low Risk', RISK_LEVELS.LOW)}
        </ScrollView>
      </View>

      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.report_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  filters: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    gap: 12,
    flexGrow: 1,
  },
  reportCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  riskBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportContent: {
    flex: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textTransform: 'capitalize',
  },
  riskLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskLabelText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  reportVerdict: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportTime: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HistoryScreen;
