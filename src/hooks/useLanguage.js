import { useState, useEffect } from 'react';
import { translations, defaultLanguage } from '../translations';

export const useLanguage = () => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('circadian-language');
    return saved || defaultLanguage;
  });

  useEffect(() => {
    localStorage.setItem('circadian-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key, defaultValue = '') => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    return value || defaultValue;
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  return { language, setLanguage, t, toggleLanguage };
};