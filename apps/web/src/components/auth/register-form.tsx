'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { useToast } from '@/components/toast/toast-provider';
import { ApiError } from '@/lib/api-error';
import { authRequest } from '@/lib/client-api';
import type { SessionUser } from '@/lib/types';
import { fieldErrors, registerSchema } from '@/lib/validation';

export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    };

    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const { user } = await authRequest<{ user: SessionUser }>('/api/auth/register', parsed.data);
      toast.success(`Account created. Welcome, ${user.name}`);
      router.replace('/concerts');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErrors({ email: error.message });
      }
      toast.error(
        error instanceof ApiError ? error.message : 'Cannot reach the server. Please try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Create an account</h1>
      <p className="mt-1 text-sm text-muted">New accounts can browse and reserve seats.</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          error={errors.name}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          hint="Must contain at least one letter and one number."
          error={errors.password}
        />
        <Button type="submit" block loading={submitting}>
          {submitting ? 'Creating account' : 'Create account'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Already registered?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
