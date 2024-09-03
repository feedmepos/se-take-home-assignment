import { createLazyFileRoute } from '@tanstack/react-router';
import { Dashboard } from '@feat/dashboard';

export const Route = createLazyFileRoute('/')({
    component: () => <Dashboard />,
});
