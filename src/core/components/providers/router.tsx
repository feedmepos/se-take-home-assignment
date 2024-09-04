import { RouterProvider as RP, createRouter, createHashHistory } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';

const history = createHashHistory();
const router = createRouter({ routeTree, history });

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}

export function RouterProvider() {
    return <RP router={router} />;
}
