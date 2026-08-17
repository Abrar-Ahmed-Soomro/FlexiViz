import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorProvider } from '@/contexts/ErrorContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'FlexiViz - Turn Excel into Insights',
    template: '%s | FlexiViz',
  },
  description: 'FlexiViz converts raw Excel data into meaningful, interactive visualizations with zero coding required. Upload, select, and visualize in minutes.',
  keywords: ['data visualization', 'excel', 'charts', 'analytics', 'business intelligence', 'duckdb', 'mongodb'],
  authors: [{ name: 'FlexiViz' }],
  creator: 'FlexiViz',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://flexiviz.com',
    siteName: 'FlexiViz',
    title: 'FlexiViz - Turn Excel into Insights',
    description: 'Convert raw Excel data into meaningful, interactive visualizations with zero coding required.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FlexiViz - Turn Excel into Insights',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FlexiViz - Turn Excel into Insights',
    description: 'Convert raw Excel data into meaningful, interactive visualizations with zero coding required.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorProvider>
      </body>
    </html>
  );
}
