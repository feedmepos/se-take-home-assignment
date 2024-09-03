import { motion } from 'framer-motion';
import { Drawer } from './drawer';
import { useIsMobile, useIsLocked } from './state';

type DrawerLayoutProps = {
    shrinkedWidth?: number | string;
    expandedWidth?: number | string;
    children?: React.ReactNode;
};

export function DrawerLayout({
    shrinkedWidth = 60,
    expandedWidth = 260,
    children,
}: DrawerLayoutProps) {
    const isMobile = useIsMobile();
    const [isLocked, setIsLocked] = useIsLocked();
    const isBackdropActive = isMobile && isLocked;
    const marginLeft = isMobile ? 0 : isLocked ? expandedWidth : shrinkedWidth;
    const transform = isBackdropActive ? 'scale(0.95)' : 'scale(1)';

    return (
        <div className="flex">
            <Drawer shrinkedWidth={shrinkedWidth} expandedWidth={expandedWidth} />

            {/* Backdrop */}
            <motion.div
                animate={{
                    opacity: isBackdropActive ? 1 : 0,
                    backdropFilter: isBackdropActive ? 'blur(2px)' : 'none',
                }}
                transition={{ duration: 0.4, type: 'spring' }}
                className="fixed inset-0 z-10 bg-black/70"
                style={{ pointerEvents: isBackdropActive ? 'all' : 'none' }}
                onClick={() => setIsLocked(false)}
            />

            {/* Content */}
            <motion.div
                className="flex-1"
                animate={{ marginLeft, transform }}
                transition={{ duration: 0.4, type: 'spring' }}
            >
                {children}
            </motion.div>
        </div>
    );
}
