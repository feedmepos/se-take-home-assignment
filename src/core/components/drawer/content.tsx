import { Divider } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { motion, type Variants } from 'framer-motion';
import { IconNote, IconRobot, IconHelp, IconHome } from '@tabler/icons-react';
import { useIsExpand } from './state';
import { DrawerHeader } from './header';
import { DrawerLink } from './link';

const container: Variants = {
    hidden: {},
    visible: {
        transition: { delayChildren: 0.15, staggerChildren: 0.1, type: 'spring', duration: 0.3 },
    },
};

function DrawerMenu() {
    const isExpand = useIsExpand();

    const { t: tc } = useTranslation(undefined, { keyPrefix: 'common' });

    return (
        <motion.div
            className="flex flex-1 flex-col"
            variants={container}
            initial="hidden"
            animate={isExpand ? 'visible' : 'hidden'}
        >
            <DrawerLink
                href="/"
                label={tc('dashboard')}
                leftSection={<IconHome stroke={1.7} size={24} />}
            />
            <DrawerLink
                href="/orders"
                label={tc('orders')}
                leftSection={<IconNote stroke={1.7} size={24} />}
            />
            <DrawerLink
                href="/bots"
                label={tc('bots')}
                leftSection={<IconRobot stroke={1.7} size={24} />}
            />

            <div className="flex-1" />
            <Divider />
            <DrawerLink
                href="/about"
                label={tc('about')}
                leftSection={<IconHelp stroke={1.7} size={24} />}
            />
        </motion.div>
    );
}

export function DrawerContent() {
    return (
        <div className="flex h-full flex-col">
            <DrawerHeader />
            <DrawerMenu />
        </div>
    );
}
