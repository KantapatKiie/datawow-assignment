'use client';

import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useToast } from '@/components/toast/toast-provider';
import { Button } from '@/components/ui/button';
import { TextAreaField, TextField } from '@/components/ui/field';
import { ApiError } from '@/lib/api-error';
import { api } from '@/lib/client-api';
import type { Concert } from '@/lib/types';
import { concertSchema, fieldErrors } from '@/lib/validation';

export function CreateConcertForm() {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawSeats = String(form.get('totalSeats') ?? '').trim();

    const parsed = concertSchema.safeParse({
      name: String(form.get('name') ?? ''),
      description: String(form.get('description') ?? ''),
      totalSeats: rawSeats === '' ? Number.NaN : Number(rawSeats),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const concert = await api.post<Concert>('/concerts', parsed.data);
      toast.success(`"${concert.name}" is now live with ${concert.totalSeats} seats`);
      setFormKey((key) => key + 1);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.length > 0) {
        // The API returns messages like "name must be at least 3 characters".
        setErrors(
          error.fieldErrors.reduce<Record<string, string>>((acc, message) => {
            const field = message.split(' ')[0];
            if (!acc[field]) acc[field] = message;
            return acc;
          }, {}),
        );
      }
      toast.error(error instanceof ApiError ? error.message : 'Could not create the concert.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Create</h2>
      <p className="mt-1 text-sm text-muted">Publish a new concert for attendees to reserve.</p>

      <form key={formKey} className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Concert Name"
            name="name"
            placeholder="Please input concert name"
            error={errors.name}
          />
          <TextField
            label="Total of seat"
            name="totalSeats"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="500"
            error={errors.totalSeats}
          />
        </div>

        <TextAreaField
          label="Description"
          name="description"
          rows={4}
          placeholder="Tell people what the concert is about"
          error={errors.description}
        />

        <div className="flex justify-end">
          <Button type="submit" variant="danger" loading={submitting}>
            <Save size={16} />
            {submitting ? 'Saving' : 'Save'}
          </Button>
        </div>
      </form>
    </section>
  );
}
