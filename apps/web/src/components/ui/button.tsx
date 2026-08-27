import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

type Variant = 'primary' | 'danger' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: 'btn--primary',
  danger: 'btn--danger',
  ghost: 'btn--ghost',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', block, loading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn('btn', variantClass[variant], block && 'btn--block', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
