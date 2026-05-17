import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "McDonald's Order Kitchen (Prototype)",
  description: "Automated kitchen order controller take-home",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-stone-950 text-stone-100 antialiased">{children}</body>
    </html>
  );
}
