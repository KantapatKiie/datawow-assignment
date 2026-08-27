import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'success' | 'danger' | 'info';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-[#f1f3f7] text-muted',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-primary-soft text-primary-dark',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
