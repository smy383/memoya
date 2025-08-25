import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ko from './locales/ko.json';

const resources = {
  en: { translation: en },
  ko: { translation: ko },
};

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem('selectedLanguage');
  
  if (!savedLanguage) {
    const deviceLanguage = RNLocalize.getLocales()[0].languageCode;
    savedLanguage = deviceLanguage === 'ko' ? 'ko' : 'en';
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