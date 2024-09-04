import { NavLink, type NavLinkProps } from '@mantine/core';
import { motion, type Variants } from 'framer-motion';
import { useNavigate, useLocation, type ParseRoute } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';

type ValidRoutes = ParseRoute<typeof routeTree>['fullPath'];

const item: Variants = {
    hidden: { opacity: 0, translateX: -20, scale: 0.9 },
    visible: { opacity: 1, translateX: 0, scale: 1 },
};

export function DrawerLink({ label, href, ...rest }: NavLinkProps & { href: ValidRoutes }) {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <NavLink
            component={motion.a}
            whileHover={{ scale: 1.05, translateX: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            label={
                <motion.span className="block whitespace-nowrap text-base" variants={item}>
                    {label}
                </motion.span>
            }
            className="flex items-center gap-4 p-4"
            onClick={() => navigate({ to: href })}
            active={location.pathname === href}
            {...rest}
        />
    );
}
