import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: 'Gauteng Health Assets Control',
  description:
    'Asset management system for the Gauteng Department of Health — track, manage, and audit health facility assets across all districts.',
  icons: {
    icon: '/health-logo.avif',
    shortcut: '/health-logo.avif',
    apple: '/health-logo.avif',
  },
  openGraph: {
    title: 'Gauteng Health Assets Control',
    description:
      'Asset management system for the Gauteng Department of Health.',
    images: ['/health-logo.avif'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
