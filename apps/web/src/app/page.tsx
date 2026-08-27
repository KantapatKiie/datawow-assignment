import { ArrowRight, CalendarCheck, ShieldCheck, Ticket, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';

const FEATURES = [
  {
    icon: <CalendarCheck size={20} />,
    title: 'One seat, one click',
    description:
      'Every concert shows live availability. Reserve a seat, change your mind, cancel it - the count updates immediately.',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'No double booking',
    description:
      'Seats are claimed inside a single database statement, so the last ticket can only ever go to one person.',
  },
  {
    icon: <Users size={20} />,
    title: 'Built for two roles',
    description:
      'Attendees browse and book. Administrators create listings and review the full reservation history.',
  },
];

export default async function LandingPage() {
  const session = await readSession();
  if (session) {
    redirect(session.role === 'ADMIN' ? '/admin' : '/concerts');
  }

  return (
    <div className="min-h-dvh bg-surface">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Ticket size={17} />
          </span>
          Concert Tickets
        </span>
        <Link href="/login" className="btn btn--ghost !min-h-9 !px-4 !py-2 text-sm">
          Sign in
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-14 pt-8 sm:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-dark">
                Free entry - limited seats
              </span>
              <h1 className="mt-4 text-[34px] font-semibold leading-[1.15] tracking-tight sm:text-5xl">
                Reserve your seat at the next free concert
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
                Browse everything that is on, take one seat per concert, and cancel any time
                before the doors open. Administrators publish new shows and watch every
                reservation as it happens.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn btn--primary">
                  Create an account
                  <ArrowRight size={17} />
                </Link>
                <Link href="/login" className="btn btn--ghost">
                  I already have one
                </Link>
              </div>

              <dl className="mt-9 grid max-w-md grid-cols-2 gap-3 text-sm">
                <div className="surface px-4 py-3">
                  <dt className="text-xs text-muted">Demo attendee</dt>
                  <dd className="mt-0.5 font-medium">user@datawow.io</dd>
                  <dd className="text-muted">User@1234</dd>
                </div>
                <div className="surface px-4 py-3">
                  <dt className="text-xs text-muted">Demo admin</dt>
                  <dd className="mt-0.5 font-medium">admin@datawow.io</dd>
                  <dd className="text-muted">Admin@1234</dd>
                </div>
              </dl>
            </div>

            <div className="surface hidden overflow-hidden p-6 lg:block">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">The Nights Concert</p>
                  <p className="mt-1 text-sm text-muted">
                    An open-air night of indie and pop from the bands that defined the last decade.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                  312 left
                </span>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-muted">
                  <span>188 of 500 seats reserved</span>
                  <span>38%</span>
                </div>
                <div className="seat-meter">
                  <div className="seat-meter__fill" style={{ width: '38%' }} />
                </div>
              </div>
              <button type="button" className="btn btn--primary btn--block mt-5" disabled>
                Reserve
              </button>
              <p className="mt-3 text-center text-xs text-muted">Preview only</p>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-canvas">
          <div className="mx-auto grid max-w-6xl gap-4 px-5 py-12 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="surface p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-dark">
                  {feature.icon}
                </span>
                <h2 className="mt-3.5 text-[15px] font-semibold">{feature.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-canvas">
        <p className="mx-auto max-w-6xl px-5 py-6 text-center text-xs text-muted">
          Free Concert Ticket - Next.js and NestJS
        </p>
      </footer>
    </div>
  );
}
