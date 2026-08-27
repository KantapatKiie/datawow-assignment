'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/toast/toast-provider';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-error';
import { api } from '@/lib/client-api';
import type { Concert } from '@/lib/types';

/**
 * Deleting a concert also releases every seat still held for it, so it asks first and says how
 * many people are affected.
 */
export function DeleteConcertButton({ concert }: { concert: Concert }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirming) return;

    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirming(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirming]);

  async function remove() {
    setDeleting(true);
    try {
      const result = await api.delete<{ releasedReservations: number }>(`/concerts/${concert.id}`);
      toast.success(
        result.releasedReservations > 0
          ? `"${concert.name}" deleted, ${result.releasedReservations} reservation(s) released`
          : `"${concert.name}" deleted`,
      );
      setConfirming(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not delete the concert.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setConfirming(true)}>
        <Trash2 size={16} />
        Delete
      </Button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-body"
            className="surface w-full max-w-md p-5 sm:p-6"
          >
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                <AlertTriangle size={18} />
              </span>
              <div>
                <h2 id="delete-title" className="text-base font-semibold">
                  Delete this concert?
                </h2>
                <p id="delete-body" className="mt-1.5 text-sm text-muted">
                  <span className="font-medium text-ink">{concert.name}</span> will be removed from
                  the listing.
                  {concert.reservedSeats > 0
                    ? ` ${concert.reservedSeats} reserved seat(s) will be released and the holders will see the cancellation in their history.`
                    : ' Nobody is holding a seat for it.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                ref={cancelRef}
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Keep it
              </Button>
              <Button variant="danger" loading={deleting} onClick={remove}>
                {deleting ? 'Deleting' : 'Yes, delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
