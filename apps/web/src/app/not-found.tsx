import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <Link href="/" className="btn btn--primary mt-2">
        Back to home
      </Link>
    </div>
  );
}
