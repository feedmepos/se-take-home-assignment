import { getRouterContext, Outlet, useMatches, useMatch } from '@tanstack/react-router';
import { useIsPresent, motion, MotionProps, Variants, AnimatePresence } from 'framer-motion';
import { cloneDeep } from 'lodash';
import { forwardRef, useContext, useRef } from 'react';

const variants: Variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
};

export const TransitionProps = {} as const;

const AnimatedOutlet = forwardRef<HTMLDivElement, MotionProps>((props, ref) => {
    const isPresent = useIsPresent();

    const matches = useMatches();
    const prevMatches = useRef(matches);

    const RouterContext = getRouterContext();
    const routerContext = useContext(RouterContext);

    let renderedContext = routerContext;

    if (isPresent) {
        prevMatches.current = cloneDeep(matches);
    } else {
        renderedContext = cloneDeep(routerContext);
        renderedContext.__store.state.matches = [
            ...matches.map((m, i) => ({
                ...(prevMatches.current[i] || m),
                id: m.id,
            })),
            ...prevMatches.current.slice(matches.length),
        ];
    }

    return (
        <motion.div
            ref={ref}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', duration: 0.5 }}
            {...props}
        >
            <RouterContext.Provider value={renderedContext}>
                <Outlet />
            </RouterContext.Provider>
        </motion.div>
    );
});

export function TransitionOutlet() {
    const matches = useMatches();
    const match = useMatch({ strict: false });
    const nextMatchIndex = matches.findIndex((d) => d.id === match.id) + 1;
    const nextMatch = matches[nextMatchIndex];

    return (
        <AnimatePresence mode="wait">
            <AnimatedOutlet key={nextMatch?.id} />
        </AnimatePresence>
    );
}
