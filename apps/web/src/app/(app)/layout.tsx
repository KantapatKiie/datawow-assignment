import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { readSession } from '@/lib/session';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();

  // The middleware already redirects, this is the server-side backstop.
  if (!session) {
    redirect('/login');
  }

  return <AppShell user={session}>{children}</AppShell>;
}
