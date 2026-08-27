'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { useToast } from '@/components/toast/toast-provider';
import { ApiError } from '@/lib/api-error';
import { authRequest } from '@/lib/client-api';
import type { SessionUser } from '@/lib/types';
import { fieldErrors, loginSchema } from '@/lib/validation';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    };

    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      const { user } = await authRequest<{ user: SessionUser }>('/api/auth/login', parsed.data);
      toast.success(`Welcome back, ${user.name}`);

      // Only same-origin paths are followed, so ?next= cannot be used as an open redirect.
      const next = searchParams.get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      const fallback = user.role === 'ADMIN' ? '/admin' : '/concerts';
      router.replace((safeNext ?? fallback) as Route);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Cannot reach the server. Please try again.';
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Use your account to reserve a seat.</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
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
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password}
        />
        <Button type="submit" block loading={submitting}>
          {submitting ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        No account yet?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}
