import React, { createContext, useState, useContext, useEffect } from 'react';
import { Appearance } from 'react-native';
import { COLORS } from '../config/constants';
import storageService from '../services/storageService';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(Appearance.getColorScheme() === 'dark');
  const [isAutomatic, setIsAutomatic] = useState(true);

  useEffect(() => {
    // Load saved theme preference
    loadThemePreference();

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (isAutomatic) {
        setIsDark(colorScheme === 'dark');
      }
    });

    return () => subscription.remove();
  }, [isAutomatic]);

  const loadThemePreference = async () => {
    const savedTheme = await storageService.getTheme();
    if (savedTheme) {
      setIsAutomatic(savedTheme.automatic);
      if (!savedTheme.automatic) {
        setIsDark(savedTheme.dark);
      }
    }
  };

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    setIsAutomatic(false);
    await storageService.setTheme({ dark: newIsDark, automatic: false });
  };

  const setAutomaticTheme = async (automatic) => {
    setIsAutomatic(automatic);
    if (automatic) {
      setIsDark(Appearance.getColorScheme() === 'dark');
    }
    await storageService.setTheme({ dark: isDark, automatic });
  };

  const theme = isDark ? COLORS.dark : COLORS.light;

  const colors = {
    ...COLORS,
    ...theme,
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        isAutomatic,
        theme,
        colors,
        toggleTheme,
        setAutomaticTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
