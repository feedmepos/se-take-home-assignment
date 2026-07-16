import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/application/app-providers';
import { StyledComponentsRegistry } from '@/application/registry/styled-components-registry';

export const metadata: Metadata = {
  title: "McDonald's Order Controller",
  description:
    "Automated cooking-bot order management prototype for McDonald's.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <AppProviders>{children}</AppProviders>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
