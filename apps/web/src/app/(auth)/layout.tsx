import { Ticket } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <Ticket size={17} />
        </span>
        Concert Tickets
      </Link>
      <div className="surface w-full max-w-[420px] p-6 sm:p-8">{children}</div>
    </div>
  );
}
