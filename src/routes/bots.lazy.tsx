import { createLazyFileRoute } from '@tanstack/react-router';
import { Bots } from '@feat/bots';

export const Route = createLazyFileRoute('/bots')({
    component: () => <Bots />,
});
