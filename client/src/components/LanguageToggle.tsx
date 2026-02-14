import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Language } from '../i18n/translations';

const LANGUAGE_OPTIONS: { code: Language; native: string; label: string; flag: string }[] = [
  { code: 'English',    native: 'English',    label: 'English',    flag: '🇬🇧' },
  { code: 'Hindi',      native: 'हिन्दी',      label: 'Hindi',      flag: '🇮🇳' },
  { code: 'Punjabi',    native: 'ਪੰਜਾਬੀ',     label: 'Punjabi',    flag: '🇮🇳' },
  { code: 'Rajasthani', native: 'राजस्थानी',  label: 'Rajasthani', flag: '🇮🇳' },
  { code: 'Spanish',    native: 'Español',    label: 'Spanish',    flag: '🇪🇸' },
  { code: 'French',     native: 'Français',   label: 'French',     flag: '🇫🇷' },
  { code: 'Arabic',     native: 'العربية',    label: 'Arabic',     flag: '🇸🇦' },
];

interface LanguageToggleProps {
  disabled?: boolean;
}

export function LanguageToggle({ disabled }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const current = LANGUAGE_OPTIONS.find(l => l.code === language)!;

  function handleSelect(lang: Language) {
    setLanguage(lang);
    setOpen(false);
  }

  return (
    <div
      ref={wrapperRef}
      className={`lang-wrapper${disabled ? ' lang-disabled' : ''}`}
    >
      <button
        className="lang-trigger"
        onClick={() => !disabled && setOpen(o => !o)}
        title={disabled ? 'Cannot change language during a session' : 'Change agent language'}
        aria-label="Change language"
        aria-expanded={open}
      >
        <span className="lang-flag">{current.flag}</span>
        <span className="lang-name">{current.native}</span>
        <span className={`lang-chevron${open ? ' open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="lang-panel">
          <div className="lang-panel-header">Agent language</div>
          <div className="lang-grid">
            {LANGUAGE_OPTIONS.map(opt => (
              <button
                key={opt.code}
                className={`lang-cell${opt.code === language ? ' active' : ''}`}
                onClick={() => handleSelect(opt.code)}
              >
                <span className="lang-cell-flag">{opt.flag}</span>
                <span className="lang-cell-native">{opt.native}</span>
                <span className="lang-cell-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
