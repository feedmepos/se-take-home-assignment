import { ActionIcon } from '@mantine/core';
import { IconLock, IconLockOpen } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useIsExpand, useIsLocked } from './state';

import mcDonalds from '@core/assets/img/mcdonalds.svg';

export function DrawerHeader() {
    const [isLocked, setIsLocked] = useIsLocked();
    const isExpand = useIsExpand();

    return (
        <div className="flex items-center justify-start gap-4 bg-red-600 px-2 py-6">
            <motion.img
                src={mcDonalds}
                alt="McDonalds"
                className="ml-1"
                animate={{ width: isExpand ? 52 : 32, height: isExpand ? 52 : 32 }}
                transition={{ type: 'spring', duration: 0.3 }}
            />
            <motion.span
                className="text-2xl font-extrabold text-white drop-shadow-sm"
                animate={{ x: isExpand ? 0 : -50, opacity: isExpand ? 1 : 0 }}
                style={{ fontFamily: 'Inter' }}
            >
                McDonald's
            </motion.span>
            <ActionIcon
                component={motion.button}
                className="absolute right-1 top-1"
                color="gray.0"
                animate={{ opacity: isExpand ? 1 : 0 }}
                variant="subtle"
                onClick={() => setIsLocked((locked) => !locked)}
            >
                {isLocked ? (
                    <IconLock size={18} stroke={2.5} />
                ) : (
                    <IconLockOpen size={18} stroke={2.5} />
                )}
            </ActionIcon>
        </div>
    );
}
