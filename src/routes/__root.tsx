import { createRootRoute } from '@tanstack/react-router';
import { Layout } from '@core/layout';

export const Route = createRootRoute({
    component: () => <Layout />,
});
