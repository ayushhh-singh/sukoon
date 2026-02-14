import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import translations, { type Language } from '../i18n/translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'English',
  setLanguage: () => {},
  t: (key: string) => key,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('sukoon_language');
    return (stored as Language) || 'English';
  });

  useEffect(() => {
    localStorage.setItem('sukoon_language', language);
    // Set dir attribute for RTL languages
    document.documentElement.setAttribute('dir', language === 'Arabic' ? 'rtl' : 'ltr');
  }, [language]);

  function t(key: string): string {
    return translations[language]?.[key] ?? translations['English'][key] ?? key;
  }

  function setLanguage(lang: Language) {
    setLanguageState(lang);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
