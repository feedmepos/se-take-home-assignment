import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { i18n, i18nAtom } from '@core/i18next';

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const lang = useAtomValue(i18nAtom);

    useEffect(() => {
        i18n.changeLanguage(lang);
    }, [lang]);

    return children;
}
