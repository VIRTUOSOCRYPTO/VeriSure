import React, { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const LanguageSelector = () => {
  const { language, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (langCode) => {
    setLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative" data-testid="language-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-slate-200 rounded-sm px-4 py-2 hover:bg-slate-50 transition-all min-h-[44px]"
        data-testid="language-toggle"
        aria-label="Select language"
      >
        <Globe className="w-5 h-5 text-slate-600" />
        <span className="font-mono text-sm text-slate-900">
          {languages.find(l => l.code === language)?.flag || '🌐'}
        </span>
        <span className="font-mono text-sm text-slate-700">
          {languages.find(l => l.code === language)?.nativeName || 'Language'}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div 
            className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-sm shadow-lg z-50"
            data-testid="language-dropdown"
          >
            <div className="p-2">
              <div className="font-mono text-xs uppercase tracking-widest text-slate-500 px-3 py-2">
                Select Language
              </div>
              <div className="space-y-1">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-sm text-left transition-all ${
                      language === lang.code
                        ? 'bg-slate-900 text-white'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                    data-testid={`lang-${lang.code}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div>
                        <div className="font-sans text-sm font-medium">
                          {lang.nativeName}
                        </div>
                        <div className={`font-mono text-xs ${
                          language === lang.code ? 'text-slate-300' : 'text-slate-500'
                        }`}>
                          {lang.name}
                        </div>
                      </div>
                    </div>
                    {language === lang.code && (
                      <Check className="w-5 h-5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
