import React from 'react';
import { motion } from 'framer-motion';

export function Title({ children, ...props }: React.ComponentProps<'h1'>) {
    return (
        <h1
            className="flex flex-wrap items-center gap-4 pb-6 pt-3 text-3xl font-bold text-red-500 drop-shadow-sm sm:text-4xl dark:text-gray-200"
            {...props}
        >
            {children}
        </h1>
    );
}

export function Content({ children, ...props }: React.ComponentProps<typeof motion.main>) {
    return (
        <motion.main
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.3, delay: 0.2 }}
            {...props}
        >
            {children}
        </motion.main>
    );
}
