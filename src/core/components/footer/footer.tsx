import { Anchor } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconHeartFilled } from '@tabler/icons-react';

export function Footer() {
    const { t } = useTranslation(undefined, { keyPrefix: 'footer' });

    return (
        <footer className="flex items-center justify-center gap-1.5 py-4 text-lg font-medium">
            <span>{t('c1')}</span>
            <IconHeartFilled className="mt-1 inline-block animate-bounce text-red-500" />
            <span>{t('c2')}</span>
            <Anchor
                href="https://github.com/AdmiJW"
                target="_blank"
                className="text-lg font-bold"
                underline="never"
            >
                AdmiJW
            </Anchor>
        </footer>
    );
}
