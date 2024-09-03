import i18n from 'i18next';
import { atomWithStorage } from 'jotai/utils';
import { initReactI18next } from 'react-i18next';
import { en } from './en';
import { zh } from './zh';
import { ms } from './ms';

type Lang = 'en' | 'ms' | 'zh';

export const i18nAtom = atomWithStorage<Lang>('lang', 'en');

i18n.use(initReactI18next).init({
    fallbackLng: 'en',
    resources: {
        en: { translation: en },
        ms: { translation: ms },
        zh: { translation: zh },
    },
    interpolation: { escapeValue: false },
});

export default i18n;
