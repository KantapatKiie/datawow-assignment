'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'create', label: 'Create' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function AdminTabs({ overview, create }: { overview: ReactNode; create: ReactNode }) {
  const [active, setActive] = useState<TabId>('overview');

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-line" role="tablist" aria-label="Admin views">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-[15px] transition-colors',
              active === tab.id
                ? 'border-primary font-medium text-primary'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" hidden={active !== 'overview'}>
        {overview}
      </div>
      <div role="tabpanel" id="panel-create" aria-labelledby="tab-create" hidden={active !== 'create'}>
        {create}
      </div>
    </div>
  );
}
