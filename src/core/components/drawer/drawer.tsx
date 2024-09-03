import { Paper } from '@mantine/core';
import { motion } from 'framer-motion';
import { useIsMobile, useIsHover, useIsLocked, useIsExpand } from './state';
import { DrawerContent } from './content';

type DesktopDrawerProps = {
    shrinkedWidth: number | string;
    expandedWidth: number | string;
};

export function Drawer({ shrinkedWidth, expandedWidth }: DesktopDrawerProps) {
    const negativeWidth = typeof expandedWidth === 'number' ? -expandedWidth : `-${expandedWidth}`;
    const isMobile = useIsMobile();
    const [_, setIsHover] = useIsHover();
    const [isLocked] = useIsLocked();
    const isExpand = useIsExpand();
    const width = !isMobile && !isExpand ? shrinkedWidth : expandedWidth;
    const marginLeft = isMobile && !isLocked ? negativeWidth : 0;

    return (
        <Paper
            className="fixed z-20 h-full overflow-hidden"
            shadow="sm"
            withBorder
            component={motion.nav}
            animate={{ width, marginLeft }}
            transition={{ duration: 0.4, type: 'spring' }}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
        >
            <DrawerContent />
        </Paper>
    );
}
