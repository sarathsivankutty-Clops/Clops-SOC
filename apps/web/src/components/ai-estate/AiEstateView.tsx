"use client";

/**
 * The observed AI estate (depth plan 6.1).
 *
 * Every AI app, coding agent, MCP server, IDE extension, provider key and
 * OAuth grant AiSOC has seen, with the person and device behind it.
 *
 * Three rendering decisions that are the whole point of the page:
 *
 * 1. An unlinked person or device renders as "not learned", in the colour of
 *    a finding, never as a blank cell. The API sends `null` when a source did
 *    not say, and the difference between "no person" and "we did not learn
 *    one" is the thing an operator acts on.
 * 2. A failed read says so. It never renders as an empty estate, because "you
 *    have no shadow AI" is the single most dangerous false statement this
 *    page could make.
 * 3. Nothing is fabricated. No sample rows, no `?? MOCK`, no SWR
 *    `fallbackData` — an invented AI inventory is a security surface a
 *    reader would act on.
 */

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { apiHeaders } from "@/lib/api";

const KINDS = [
  { value: "", label: "All kinds" },
  { value: "coding_agent", label: "Coding agents" },
  { value: "ai_app", label: "AI apps" },
  { value: "mcp_server", label: "MCP servers" },
  { value: "ide_extension", label: "IDE extensions" },
  { value: "provider_key", label: "Provider keys" },
  { value: "oauth_grant", label: "OAuth grants" },
  { value: "hosted_agent", label: "Hosted agents" },
  { value: "repo_ai_artifact", label: "Repository AI config" },
] as const;

const SOURCE_LIMITS: Record<string, string> = {
  ai_runtime: "SDK and gateway telemetry: knows the agent, the model and the tools. Never the device.",
  endpoint: "EDR and osquery process telemetry: knows the device and the binary. Never the model.",
  provider_audit: "Provider audit log: knows the account and the key. Never a device.",
  oauth_audit: "Directory consent events: knows the application and its scopes. Never a device.",
  provider_admin: "Provider admin API: knows the agent's model, tools, MCP servers and skills. Never a device, because there is not one.",
  code_platform: "Repository scan: knows the repository and the file. Never the device or the runtime.",
  declared: "Registered by an operator rather than observed.",
};

interface AiAsset {
  id: string;
  kind: string;
  externalId: string;
  displayName: string | null;
  vendor: string | null;
  discoverySource: string;
  principal: string | null;
  device: string | null;
  effectivePermissions: Record<string, unknown> | null;
  attributes: Record<string, unknown>;
  risk: number;
  riskReasons: string[];
  sanctioned: boolean | null;
  firstSeen: string;
  lastSeen: string;
  observationCount: number;
}

interface AiAssetList {
  items: AiAsset[];
  total: number;
  observedSources: string[];
}

const fetcher = (url: string) =>
  fetch(url, { headers: apiHeaders() }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

function riskTone(risk: number): string {
  if (risk >= 70) return "text-red-400";
  if (risk >= 40) return "text-yellow-400";
  return "text-fg-secondary";
}

/** A link we have, or an explicit statement that we do not. Never a blank. */
function Link({ value, missing }: { value: string | null; missing: string }) {
  if (value) return <span className="text-fg-secondary">{value}</span>;
  return (
    <span className="text-amber-400" title={missing}>
      not learned
    </span>
  );
}

function SanctionBadge({ sanctioned }: { sanctioned: boolean | null }) {
  if (sanctioned === true) {
    return <span className="inline-flex px-2 py-0.5 rounded text-xs bg-green-900/40 text-green-300">approved</span>;
  }
  if (sanctioned === false) {
    return <span className="inline-flex px-2 py-0.5 rounded text-xs bg-red-900/40 text-red-300">refused</span>;
  }
  return <span className="inline-flex px-2 py-0.5 rounded text-xs bg-surface-elevated text-fg-muted">undecided</span>;
}

export default function AiEstateView() {
  const [kind, setKind] = useState<string>("");
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = new URLSearchParams();
  if (kind) query.set("kind", kind);
  if (unlinkedOnly) query.set("unlinked", "true");
  const key = `/api/v1/ai-assets${query.toString() ? `?${query}` : ""}`;

  const { data, error, isLoading } = useSWR<AiAssetList>(key, fetcher, { refreshInterval: 30_000 });

  const sanction = async (id: string, value: boolean | null) => {
    await fetch(`/api/v1/ai-assets/${id}/sanction`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ sanctioned: value }),
    });
    void mutate(key);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="co-page-title" /* [HIDDEN-UI P1 title-style-unified] was: text-2xl font-bold text-gray-100 */>AI estate</h1>
        <p className="text-sm text-fg-subtle mt-1">
          What AiSOC has observed running, not what was registered. The interesting row is the one nobody
          declared.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select
          className="border border-surface-border-strong bg-surface-elevated text-fg-primary rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input type="checkbox" checked={unlinkedOnly} onChange={(e) => setUnlinkedOnly(e.target.checked)} />
          Only assets with nobody accountable
        </label>
        {data?.total != null && <span className="text-xs text-fg-subtle">{data.total} observed</span>}
      </div>

      {data?.observedSources?.length ? (
        <div className="mb-4 text-xs text-fg-subtle space-y-1">
          <p className="uppercase tracking-wide">What the sources behind this list can and cannot see</p>
          {data.observedSources.map((s) => (
            <p key={s}>
              <span className="text-fg-muted">{s}</span>
              {": "}
              {SOURCE_LIMITS[s] ?? "Unrecognised discovery source."}
            </p>
          ))}
        </div>
      ) : null}

      <div className="bg-surface-card/60 border border-surface-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-fg-subtle">Loading the AI estate…</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-400">
            Could not load the AI estate. This is not a report that none exists.
          </div>
        ) : !data?.items?.length ? (
          <div className="p-8 text-center text-sm text-fg-subtle">
            No AI assets observed yet. AiSOC builds this list from AI runtime telemetry, endpoint process
            activity and provider audit logs — if none of those is connected, this stays empty whatever is
            running.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated border-b border-surface-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-fg-muted">Asset</th>
                <th className="px-4 py-3 text-left font-medium text-fg-muted">Kind</th>
                <th className="px-4 py-3 text-left font-medium text-fg-muted">Person</th>
                <th className="px-4 py-3 text-left font-medium text-fg-muted">Device</th>
                <th className="px-4 py-3 text-left font-medium text-fg-muted">First seen</th>
                <th className="px-4 py-3 text-left font-medium text-fg-muted">Last seen</th>
                <th className="px-4 py-3 text-left font-medium text-fg-muted">Risk</th>
                <th className="px-4 py-3 text-left font-medium text-fg-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {data.items.map((asset) => (
                <>
                  <tr
                    key={asset.id}
                    className="hover:bg-surface-elevated/50 cursor-pointer"
                    onClick={() => setExpanded(expanded === asset.id ? null : asset.id)}
                  >
                    <td className="px-4 py-3 text-fg-primary max-w-xs truncate">
                      {asset.displayName ?? asset.externalId}
                      {asset.vendor ? <span className="text-fg-subtle"> · {asset.vendor}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{asset.kind.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <Link
                        value={asset.principal}
                        missing={`No source linked a person. ${SOURCE_LIMITS[asset.discoverySource] ?? ""}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        value={asset.device}
                        missing={`No source linked a device. ${SOURCE_LIMITS[asset.discoverySource] ?? ""}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-fg-subtle" suppressHydrationWarning>
                      {new Date(asset.firstSeen).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-fg-subtle" suppressHydrationWarning>
                      {new Date(asset.lastSeen).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${riskTone(asset.risk)}`}>{asset.risk}</td>
                    <td className="px-4 py-3">
                      <SanctionBadge sanctioned={asset.sanctioned} />
                    </td>
                  </tr>
                  {expanded === asset.id && (
                    <tr key={`${asset.id}-detail`} className="bg-surface-card">
                      <td colSpan={8} className="px-6 py-4">
                        <p className="text-xs uppercase tracking-wide text-fg-subtle mb-2">
                          Why it scores {asset.risk}
                        </p>
                        {asset.riskReasons.length ? (
                          <ul className="list-disc pl-5 space-y-1 text-sm text-fg-secondary">
                            {asset.riskReasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-fg-subtle">Nothing about this asset raised its score.</p>
                        )}
                        <p className="text-xs text-fg-subtle mt-3">
                          Seen {asset.observationCount} times via {asset.discoverySource}.
                          {asset.effectivePermissions
                            ? " Effective permissions were resolved at the last sighting."
                            : " No permission snapshot was available, so permissions did not contribute to the score."}
                        </p>
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => void sanction(asset.id, true)}
                            className="px-3 py-1.5 text-xs bg-green-700 text-white rounded hover:bg-green-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => void sanction(asset.id, false)}
                            className="px-3 py-1.5 text-xs bg-red-700 text-white rounded hover:bg-red-600"
                          >
                            Refuse
                          </button>
                          <button
                            onClick={() => void sanction(asset.id, null)}
                            className="px-3 py-1.5 text-xs bg-surface-hover text-fg-primary rounded hover:bg-gray-600"
                          >
                            Back to undecided
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
