import React, { useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const LanguageSelector = () => {
  const { language, setLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative" data-testid="language-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-slate-200 rounded-sm px-3 py-2 hover:bg-slate-50 transition-all"
        aria-label="Select language"
      >
        <Languages className="w-4 h-4 text-slate-600" />
        <span className="text-lg">{languages.find(l => l.code === language)?.flag}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-slate-200 rounded-sm shadow-lg z-20">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors ${
                  language === lang.code ? 'bg-slate-100' : ''
                }`}
                data-testid={`lang-${lang.code}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <div className="text-left">
                    <div className="font-sans text-sm text-slate-900">{lang.nativeName}</div>
                    <div className="font-sans text-xs text-slate-500">{lang.name}</div>
                  </div>
                </div>
                {language === lang.code && (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
