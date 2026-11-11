'use client';

import useSWR from 'swr';
import { authedFetcher } from '@/lib/api';

interface HeatmapCell {
  category: string;
  status: string;
  count: number;
}

interface HeatmapData {
  framework: string;
  framework_name: string;
  categories: string[];
  statuses: string[];
  cells: HeatmapCell[];
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-green-600',
  collected: 'bg-blue-500',
  review: 'bg-yellow-500',
  rejected: 'bg-red-500',
  missing: 'bg-surface-hover',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Approved',
  collected: 'Collected',
  review: 'In Review',
  rejected: 'Rejected',
  missing: 'Missing',
};

function intensityClass(count: number, max: number): string {
  if (count === 0) return 'opacity-10';
  const ratio = count / max;
  if (ratio < 0.25) return 'opacity-30';
  if (ratio < 0.5) return 'opacity-50';
  if (ratio < 0.75) return 'opacity-70';
  return 'opacity-100';
}


interface Props {
  framework: string;
}

export function ComplianceHeatmap({ framework }: Props) {
  const { data, error, isLoading } = useSWR<HeatmapData>(
    `/api/v1/compliance/${framework}/heatmap`,
    authedFetcher,
    { refreshInterval: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-fg-muted">
        Loading heatmap…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-red-400 text-sm p-4">
        Failed to load heatmap data.
      </div>
    );
  }

  // Build lookup map: category → status → count
  const lookup: Record<string, Record<string, number>> = {};
  for (const cell of data.cells) {
    lookup[cell.category] ??= {};
    lookup[cell.category][cell.status] = cell.count;
  }

  // Find max count for scaling
  const allCounts = data.cells.map((c) => c.count);
  const maxCount = Math.max(...allCounts, 1);

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 overflow-x-auto">
      <h3 className="text-fg-primary font-semibold text-base mb-4">
        {data.framework_name} — Control Coverage Heatmap
      </h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {data.statuses.map((st) => (
          <div key={st} className="flex items-center gap-1.5 text-xs text-fg-secondary">
            <span className={`w-3 h-3 rounded-sm ${STATUS_COLORS[st] ?? 'bg-gray-500'}`} />
            {STATUS_LABELS[st] ?? st}
          </div>
        ))}
      </div>

      {/* Heatmap table */}
      <table className="min-w-full text-xs border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="text-left text-fg-muted font-medium pr-3 pb-2 min-w-[180px]">
              Category
            </th>
            {data.statuses.map((st) => (
              <th
                key={st}
                className="text-center text-fg-muted font-medium pb-2 min-w-[70px]"
              >
                {STATUS_LABELS[st] ?? st}
              </th>
            ))}
            <th className="text-right text-fg-muted font-medium pb-2 pl-3 min-w-[50px]">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.categories.map((cat) => {
            const rowCounts = lookup[cat] ?? {};
            const rowTotal = Object.values(rowCounts).reduce((s, v) => s + v, 0);

            return (
              <tr key={cat}>
                <td className="text-fg-secondary pr-3 py-0.5 truncate max-w-[180px]" title={cat}>
                  {cat}
                </td>
                {data.statuses.map((st) => {
                  const count = rowCounts[st] ?? 0;
                  const color = STATUS_COLORS[st] ?? 'bg-gray-500';
                  return (
                    <td key={st} className="text-center py-0.5">
                      {count > 0 ? (
                        <span
                          className={`inline-flex items-center justify-center w-full h-7 rounded text-fg-primary font-medium ${color} ${intensityClass(count, maxCount)}`}
                          title={`${count} control(s) — ${STATUS_LABELS[st] ?? st}`}
                        >
                          {count}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-full h-7 rounded text-fg-secondary bg-surface-elevated">
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="text-right text-fg-muted pl-3 py-0.5 font-medium">
                  {rowTotal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
