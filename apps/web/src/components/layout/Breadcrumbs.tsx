'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { resolveBreadcrumbs } from '@/config/routeRegistry';
import type { NavigationFilterOptions } from '@/config/navigation';

export interface BreadcrumbsProps {
  /** Optional filter overrides for unit testing or role/permission injection. */
  readonly filterOptions?: NavigationFilterOptions;
}

export function Breadcrumbs({ filterOptions }: BreadcrumbsProps) {
  const pathname = usePathname() ?? '/';

  const items = useMemo(
    () => resolveBreadcrumbs(pathname, filterOptions),
    [pathname, filterOptions],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      data-testid="workspace-breadcrumbs"
      className="px-6 pt-3 pb-1 text-xs text-fg-muted"
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
              {idx > 0 && (
                <span aria-hidden="true" className="text-fg-subtle select-none">
                  &gt;
                </span>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-fg-secondary hover:text-fg-primary transition-colors rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={
                    isLast
                      ? 'font-medium text-fg-primary'
                      : 'text-fg-muted uppercase tracking-wider text-[11px] font-semibold'
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
