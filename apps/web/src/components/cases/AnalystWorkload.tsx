'use client';

/**
 * Per-analyst workload.
 *
 * Depth 9.3 (parity 5.6 remainder). There was no workload surface anywhere:
 * a lead could not answer "who is carrying what" without reading the case
 * list by hand.
 *
 * The honesty rules this panel exists under, each one a defect this
 * repository has shipped:
 *
 * - **No `fallbackData`.** Setting it disables revalidation, so a mock stops
 *   being a first paint and becomes what the view *shows*. There is no mock
 *   here at all, and the first paint is a loading state.
 * - **`mean_hours_to_close: null` renders as "no data", never `0.0`.** A
 *   zero there reads as "closed instantly", which is the opposite of what it
 *   means, and that exact confusion left two console figures wrong for
 *   months.
 * - **Every mean shows the count it was taken over.** A mean over three
 *   cases and a mean over three hundred are different claims.
 * - **An error says it is an error.** No invented rows, no empty list
 *   standing in for a failed fetch.
 */

import useSWR from 'swr';

import { caseDepthApi, type AnalystWorkloadRow } from '@/lib/api';

function MeanToClose({ row }: { row: AnalystWorkloadRow }) {
  if (row.mean_hours_to_close === null) {
    return (
      <span className="text-fg-subtle" title="This analyst has closed no cases in the window, so there is nothing to average.">
        no data
      </span>
    );
  }
  return (
    <span className="text-fg-secondary">
      {row.mean_hours_to_close.toFixed(1)}h{' '}
      <span className="text-fg-subtle text-[11px]">over {row.mean_over_cases}</span>
    </span>
  );
}

export function AnalystWorkload({ days = 30 }: { days?: number }) {
  const { data, error, isLoading } = useSWR(['case-workload', days], () => caseDepthApi.workload(days), {
    refreshInterval: 60_000,
  });

  return (
    <section
      className="bg-surface-card border border-surface-border rounded-xl overflow-hidden"
      aria-label="Analyst workload"
    >
      <header className="px-4 py-3 border-b border-surface-border flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-fg-primary">Analyst workload</h2>
        <span className="text-[11px] text-fg-muted">last {days} days</span>
      </header>

      {isLoading ? (
        <p className="px-4 py-6 text-xs text-fg-muted">Loading…</p>
      ) : error ? (
        <p className="px-4 py-6 text-xs text-red-400" role="alert">
          Couldn&apos;t load workload. The cases API didn&apos;t respond.
        </p>
      ) : !data || data.analysts.length === 0 ? (
        <p className="px-4 py-6 text-xs text-fg-muted">
          No case has an assignee in this window, so there is no workload to show.
          {data ? ` ${data.unassigned.open_cases} open case(s) are unassigned.` : ''}
        </p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-fg-muted border-b border-surface-border">
              <th className="text-left font-normal px-4 py-2">Analyst</th>
              <th className="text-right font-normal px-3 py-2">Open</th>
              <th className="text-right font-normal px-3 py-2">High / critical</th>
              <th className="text-right font-normal px-3 py-2">Overdue</th>
              <th className="text-right font-normal px-3 py-2">Closed</th>
              <th className="text-right font-normal px-4 py-2">Mean to close</th>
            </tr>
          </thead>
          <tbody>
            {data.analysts.map((row) => (
              <tr key={row.analyst} className="border-b border-surface-border/60 last:border-0">
                <td className="px-4 py-2 text-fg-primary truncate max-w-[14rem]">{row.analyst}</td>
                <td className="px-3 py-2 text-right text-fg-secondary">{row.open_cases}</td>
                <td className="px-3 py-2 text-right text-orange-300">{row.open_high_or_critical}</td>
                <td className="px-3 py-2 text-right text-red-300">{row.overdue}</td>
                <td className="px-3 py-2 text-right text-fg-muted">{row.closed_cases}</td>
                <td className="px-4 py-2 text-right">
                  <MeanToClose row={row} />
                </td>
              </tr>
            ))}
            {data.unassigned.open_cases > 0 && (
              <tr className="border-t border-surface-border bg-surface-elevated/50">
                <td className="px-4 py-2 text-fg-muted italic">Unassigned</td>
                <td className="px-3 py-2 text-right text-fg-secondary">{data.unassigned.open_cases}</td>
                <td className="px-3 py-2 text-right text-orange-300">{data.unassigned.open_high_or_critical}</td>
                <td className="px-3 py-2 text-right text-fg-subtle">—</td>
                <td className="px-3 py-2 text-right text-fg-subtle">—</td>
                <td className="px-4 py-2 text-right text-fg-subtle">—</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
