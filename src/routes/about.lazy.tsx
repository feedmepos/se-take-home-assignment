import { createLazyFileRoute } from '@tanstack/react-router';
import { About } from '@feat/about';

export const Route = createLazyFileRoute('/about')({
    component: () => <About />,
});
