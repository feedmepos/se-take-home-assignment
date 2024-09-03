import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { Menu, ActionIcon } from '@mantine/core';
import { IconLanguage, IconSquareRoundedCheckFilled } from '@tabler/icons-react';
import { i18nAtom } from '@core/i18next';

function Check() {
    return <IconSquareRoundedCheckFilled size={16} className="text-red-400" />;
}

export function Locale() {
    const [lang, setLang] = useAtom(i18nAtom);

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });

    return (
        <Menu shadow="md" width={200} position="bottom-start">
            <Menu.Target>
                <ActionIcon variant="subtle" size="lg">
                    <IconLanguage size={20} />
                </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Label>{tc('language')}</Menu.Label>
                <Menu.Item rightSection={lang === 'en' && <Check />} onClick={() => setLang('en')}>
                    English
                </Menu.Item>
                <Menu.Item rightSection={lang === 'zh' && <Check />} onClick={() => setLang('zh')}>
                    中文
                </Menu.Item>
                <Menu.Item rightSection={lang === 'ms' && <Check />} onClick={() => setLang('ms')}>
                    Bahasa Malaysia
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}
