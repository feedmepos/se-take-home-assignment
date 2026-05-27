/* eslint-disable react-refresh/only-export-components */

import "../styles/globals.scss";

import { AntdRegistry } from "@ant-design/nextjs-registry";

import "@ant-design/v5-patch-for-react-19";

export { metadata } from "./metadata";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
