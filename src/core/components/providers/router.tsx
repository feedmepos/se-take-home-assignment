import { RouterProvider as RP, createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';

const router = createRouter({ routeTree, basepath: '/FeedMe-Take-Home-Assignment' });

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

export function RouterProvider() {
    return <RP router={router} />;
}
