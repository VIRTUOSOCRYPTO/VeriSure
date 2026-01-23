import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import storageService from '../../services/storageService';
import { APP_CONFIG } from '../../config/constants';

const SettingsScreen = () => {
  const { colors, isDark, isAutomatic, toggleTheme, setAutomaticTheme } = useTheme();
  const { user, changePassword } = useAuth();
  const { currentLanguage, setLanguage, availableLanguages } = useLanguage();
  const [showLanguages, setShowLanguages] = useState(false);

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'Are you sure you want to clear all cached data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await storageService.clearCache();
          Toast.show({
            type: 'success',
            text1: 'Cache Cleared',
            text2: 'All cached data has been removed',
          });
        },
      },
    ]);
  };

  const handleClearQueue = () => {
    Alert.alert('Clear Offline Queue', 'Are you sure you want to clear the offline queue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await storageService.clearOfflineQueue();
          Toast.show({
            type: 'success',
            text1: 'Queue Cleared',
            text2: 'Offline queue has been cleared',
          });
        },
      },
    ]);
  };

  const renderLanguageOption = (lang) => (
    <TouchableOpacity
      key={lang.code}
      style={[
        styles.languageItem,
        {
          backgroundColor: currentLanguage === lang.code ? colors.primary + '20' : colors.background,
          borderColor: currentLanguage === lang.code ? colors.primary : colors.border,
        },
      ]}
      onPress={() => {
        setLanguage(lang.code);
        setShowLanguages(false);
        Toast.show({
          type: 'success',
          text1: 'Language Changed',
          text2: `Switched to ${lang.name}`,
        });
      }}
    >
      <Text style={[styles.languageName, { color: colors.text }]}>{lang.name}</Text>
      {currentLanguage === lang.code && <Icon name="check" size={20} color={colors.primary} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Icon name="palette" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {isAutomatic ? 'Follow system' : isDark ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={isDark ? colors.primary : colors.surface}
              disabled={isAutomatic}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Auto Theme</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>Follow system theme</Text>
            </View>
            <Switch
              value={isAutomatic}
              onValueChange={setAutomaticTheme}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={isAutomatic ? colors.primary : colors.surface}
            />
          </View>
        </View>

        {/* Language Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Icon name="translate" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Language</Text>
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowLanguages(!showLanguages)}
            data-testid="language-selector"
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>App Language</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {availableLanguages.find((l) => l.code === currentLanguage)?.name || 'English'}
              </Text>
            </View>
            <Icon
              name={showLanguages ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showLanguages && (
            <View style={styles.languageList}>{availableLanguages.map(renderLanguageOption)}</View>
          )}
        </View>

        {/* Storage Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Icon name="database" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage</Text>
          </View>

          <TouchableOpacity style={styles.settingItem} onPress={handleClearCache} data-testid="clear-cache-button">
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Clear Cache</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>Remove cached reports</Text>
            </View>
            <Icon name="delete" size={24} color={colors.error} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleClearQueue} data-testid="clear-queue-button">
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Clear Offline Queue</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>Remove queued items</Text>
            </View>
            <Icon name="delete-sweep" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Icon name="information" size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>App Name</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{APP_CONFIG.APP_NAME}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{APP_CONFIG.VERSION}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Support</Text>
            <Text style={[styles.infoValue, { color: colors.primary }]}>{APP_CONFIG.SUPPORT_EMAIL}</Text>
          </View>
        </View>

        {/* Legal Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Privacy Policy</Text>
            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Terms of Service</Text>
            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  languageList: {
    marginTop: 8,
    gap: 8,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  languageName: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SettingsScreen;
