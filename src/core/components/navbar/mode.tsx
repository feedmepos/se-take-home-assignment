import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, ActionIcon, useMantineColorScheme, type MantineColorScheme } from '@mantine/core';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import {
    IconSun,
    IconMoon,
    IconDeviceDesktop,
    IconSquareRoundedCheckFilled,
} from '@tabler/icons-react';

const schemeAtom = atomWithStorage<MantineColorScheme>('color-scheme', 'auto');

function Check() {
    return <IconSquareRoundedCheckFilled size={16} className="text-red-400" />;
}

export function Mode() {
    const [scheme, setScheme] = useAtom(schemeAtom);
    const { setColorScheme } = useMantineColorScheme();

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });

    useEffect(() => {
        setColorScheme(scheme);
    }, [scheme, setColorScheme]);

    return (
        <Menu shadow="md" width={200} position="bottom-start">
            <Menu.Target>
                <ActionIcon variant="subtle" size="lg">
                    {scheme === 'light' ? (
                        <IconSun size={20} />
                    ) : scheme === 'dark' ? (
                        <IconMoon size={20} />
                    ) : (
                        <IconDeviceDesktop size={20} />
                    )}
                </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Label>{tc('colorScheme')}</Menu.Label>
                <Menu.Item
                    leftSection={<IconSun size={16} />}
                    rightSection={scheme === 'light' && <Check />}
                    onClick={() => setScheme('light')}
                >
                    {tc('light')}
                </Menu.Item>
                <Menu.Item
                    leftSection={<IconMoon size={16} />}
                    rightSection={scheme === 'dark' && <Check />}
                    onClick={() => setScheme('dark')}
                >
                    {tc('dark')}
                </Menu.Item>
                <Menu.Item
                    leftSection={<IconDeviceDesktop size={16} />}
                    rightSection={scheme === 'auto' && <Check />}
                    onClick={() => setScheme('auto')}
                >
                    {tc('system')}
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}
