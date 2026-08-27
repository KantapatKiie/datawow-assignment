import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface Shared {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<
  HTMLInputElement,
  Shared & InputHTMLAttributes<HTMLInputElement>
>(function TextField({ label, error, hint, className, id, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={cn('field-input', className)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  Shared & TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextAreaField({ label, error, hint, className, id, ...props }, ref) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        className={cn('field-input resize-y min-h-[104px]', className)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error ? (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
});
