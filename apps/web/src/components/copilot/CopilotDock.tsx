'use client';

/**
 * Floating AI Copilot dock.
 *
 * A persistent bottom-right launcher that opens a compact chat panel without
 * leaving the current page. Reuses `copilotApi` for real calls and falls back
 * to a deterministic demo reply when the backend is unreachable.
 *
 * The full-page experience lives at `/copilot` (CopilotView). This dock is
 * the "ambient" surface — quick questions, scoped to whatever the analyst is
 * currently looking at (we capture `pathname` as `context.page`).
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { copilotApi, type CopilotMessage } from '@/lib/api';
import { canUseDemoData } from '@/lib/demoFallback';
import { AiSpinner } from '@/components/ui/AiSpinner';

const QUICK_PROMPTS = [
  'Summarize critical alerts in the last 24h.',
  'Investigate the host most at risk right now.',
  'Which detection rules are noisiest this week?',
];

/** What the dock says when the copilot could not be reached. */
function unavailableReply(error: unknown): CopilotMessage {
  const detail = error instanceof Error ? error.message : 'the request did not complete';
  return {
    id: `err-${Date.now()}`,
    role: 'assistant',
    content:
      `The copilot could not be reached, so there is no answer to give.\n\n` +
      `\`${detail}\`\n\nTry again once the service is back.`,
    createdAt: new Date().toISOString(),
  };
}

function demoReply(prompt: string, page: string): CopilotMessage {
  const content =
    `**Demo reply** — the LLM backend is offline, so this is a stub.\n\n` +
    `Page context: \`${page}\`\n\n` +
    `> ${prompt}`;
  return {
    id: `demo-${Date.now()}`,
    role: 'assistant',
    content,
    createdAt: new Date().toISOString(),
    suggestions: [
      'Open AI Copilot',
      'Show me the top critical alerts.',
    ],
  };
}

export function CopilotDock() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [offline, setOffline] = useState(false);
  const pathname = usePathname() ?? '/';
  const scrollerRef = useRef<HTMLDivElement>(null);

  const onCopilotPage = pathname.startsWith('/copilot');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle =
        (e.metaKey && e.key.toLowerCase() === 'j') ||
        (e.ctrlKey && e.key.toLowerCase() === 'j');
      if (isToggle) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('aisoc:open-copilot', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('aisoc:open-copilot', onOpen);
    };
  }, [open]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, sending, open]);

  if (onCopilotPage) return null;

  const send = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || sending) return;

    const userMsg: CopilotMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await copilotApi.chat({
        conversationId,
        message: trimmed,
        context: { page: pathname },
      });
      setConversationId(res.conversationId);
      setMessages((prev) => [...prev, res.reply]);
      setOffline(false);
    } catch (err) {
      const sample = canUseDemoData() ? demoReply(trimmed, pathname) : null;
      setMessages((prev) => [...prev, sample ?? unavailableReply(err)]);
      setOffline(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Launcher (bottom-right) */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full border border-surface-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-fg-primary shadow-lg transition-all hover:border-brand-500/40 hover:bg-surface-hover"
            aria-label="Open AI Copilot"
          >
            <AiSpinner size="sm" state="idle" />
            <span>Ask Copilot</span>
            <kbd className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-mono text-fg-muted">
              ⌘J
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-5 right-5 z-40 flex h-[32rem] w-[24rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface-raised/95 shadow-2xl backdrop-blur"
            role="dialog"
            aria-label="AI Copilot"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-border px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-surface-border bg-surface-card">
                  <AiSpinner size="sm" state={sending ? 'busy' : 'idle'} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg-primary">AI Copilot</p>
                  <p className="text-[11px] text-fg-subtle">
                    {offline ? 'Copilot unavailable' : conversationId ? 'Connected' : 'Ready · read-only'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/copilot"
                  className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg-primary"
                  title="Open full page"
                  aria-label="Open Copilot full page"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg-primary"
                  aria-label="Close Copilot"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Thread */}
            <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto p-3.5">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col justify-center">
                  <p className="px-1 text-xs text-fg-muted">
                    Ask anything about your environment. I can inspect alerts,
                    cases, hosts, users, and detection rules.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {QUICK_PROMPTS.map((p) => (
                      <li key={p}>
                        <button
                          onClick={() => void send(p)}
                          className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-left text-xs text-fg-secondary transition-colors hover:border-brand-500/40 hover:bg-surface-hover hover:text-fg-primary"
                        >
                          {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ul className="space-y-3">
                  {messages.map((m) => (
                    <li
                      key={m.id}
                      className={clsx(
                        'flex gap-2 items-start',
                        m.role === 'user' ? 'justify-end' : 'justify-start',
                      )}
                    >
                      {m.role !== 'user' && (
                        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-card">
                          <AiSpinner size="xs" state="done" />
                        </span>
                      )}
                      <div
                        className={clsx(
                          'max-w-[82%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                          m.role === 'user'
                            ? 'bg-brand-500 text-fg-inverse font-medium'
                            : 'bg-surface-card text-fg-primary border border-surface-border',
                        )}
                      >
                        {m.content}
                        {m.suggestions && m.suggestions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {m.suggestions.map((s, idx) =>
                              s.startsWith('Open AI Copilot') ? (
                                <Link
                                  key={idx}
                                  href="/copilot"
                                  className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[11px] text-brand-400 transition-colors hover:bg-brand-500/20"
                                >
                                  {s} →
                                </Link>
                              ) : (
                                <button
                                  key={idx}
                                  onClick={() => void send(s)}
                                  className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[11px] text-brand-400 transition-colors hover:bg-brand-500/20"
                                >
                                  {s}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                  {sending && (
                    <li className="flex items-center gap-2 justify-start">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-surface-border bg-surface-card">
                        <AiSpinner size="xs" state="busy" />
                      </span>
                      <div className="rounded-2xl border border-surface-border bg-surface-card px-3 py-2 text-xs text-fg-muted">
                        Synthesizing context…
                      </div>
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-surface-border p-2.5">
              <div className="flex items-end gap-2 rounded-xl border border-surface-border bg-surface-card p-1.5 focus-within:border-brand-500/50">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Ask Copilot…"
                  className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fg-primary placeholder-fg-subtle outline-none"
                />
                <button
                  onClick={() => void send(input)}
                  disabled={!input.trim() || sending}
                  className={clsx(
                    'flex-none rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    input.trim() && !sending
                      ? 'bg-brand-500 text-fg-inverse hover:bg-brand-400'
                      : 'bg-surface-hover text-fg-subtle',
                  )}
                  aria-label="Send"
                >
                  ↑
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
