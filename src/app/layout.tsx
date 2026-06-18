import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "McDonald's Order Controller",
  description: 'Automated cooking-bot order management system — FeedMe take-home',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Warm amber-tinted background complements the red/gold brand palette */}
      <body className="min-h-screen bg-amber-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
