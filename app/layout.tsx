import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Learning Support',
  description: 'Document-grounded active learning platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
