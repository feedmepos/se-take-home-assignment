import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@core/components/providers';

import '@core/i18next';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import '@core/style.css';

import '@core/assets/fonts/Inter.ttf';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider />
    </StrictMode>
);
