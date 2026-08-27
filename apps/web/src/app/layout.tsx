import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/toast/toast-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Free Concert Ticket',
    template: '%s | Free Concert Ticket',
  },
  description: 'Browse free concerts, reserve your seat and manage listings.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1692ec',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
