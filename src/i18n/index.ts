import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import es from './locales/es.json';
import de from './locales/de.json';

const resources = {
  en: { translation: en },
  ko: { translation: ko },
  ja: { translation: ja },
  zh: { translation: zh },
  es: { translation: es },
  de: { translation: de },
};

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem('selectedLanguage');
  
  if (!savedLanguage) {
    const deviceLanguage = RNLocalize.getLocales()[0].languageCode;
    const supportedLanguages = ['ko', 'ja', 'zh', 'es', 'de'];
    savedLanguage = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';
  }

  i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
};

export default i18n;
export { initI18n };