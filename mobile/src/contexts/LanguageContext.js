import React, { createContext, useState, useContext, useEffect } from 'react';
import storageService from '../services/storageService';
import { translations } from '../locales';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    const savedLanguage = await storageService.getLanguage();
    if (savedLanguage) {
      setLanguageState(savedLanguage);
    }
  };

  const setLanguage = async (lang) => {
    setLanguageState(lang);
    await storageService.setLanguage(lang);
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return value || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        availableLanguages: Object.keys(translations),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
