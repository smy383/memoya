import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import en from './en.json';
import ko from './ko.json';

const resources = {
  en: { translation: en },
  ko: { translation: ko },
};

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: (callback: (lng: string) => void) => {
    const locales = getLocales();
    const deviceLanguage = locales[0]?.languageCode || 'en';
    callback(deviceLanguage);
  },
  init: () => {},
  cacheUserLanguage: () => {},
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: __DEV__,
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;