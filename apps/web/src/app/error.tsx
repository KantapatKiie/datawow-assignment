'use client';

import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted">
        The page could not be loaded. This usually means the API is still starting up or is
        unreachable.
      </p>
      <button type="button" className="btn btn--primary mt-2" onClick={reset}>
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}
