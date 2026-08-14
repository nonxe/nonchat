import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NONCHAT',
  description: 'NONCHAT primarily runs on AS CLOUD HOST — a fast, minimal, end-to-end chat platform.',
  keywords: ['chat', 'messaging', 'nonchat', 'secure'],
  authors: [{ name: 'NONCHAT' }],
  openGraph: {
    title: 'NONCHAT',
    description: 'NONCHAT primarily runs on AS CLOUD HOST',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
