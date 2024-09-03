import { createLazyFileRoute } from '@tanstack/react-router';
import { Orders } from '@feat/orders';

export const Route = createLazyFileRoute('/orders')({
    component: () => <Orders />,
});
