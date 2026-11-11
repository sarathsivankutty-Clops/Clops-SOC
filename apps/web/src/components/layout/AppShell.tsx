'use client';

import { SWRConfig } from 'swr';
import { BrandedDocumentTitle } from './BrandedDocumentTitle';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
// [HIDDEN-UI P5 nav-simplified] Workspace pages now render as a secondary rail inside Sidebar; the tab bar tier stays hidden.
// Import kept so restoring is one step: <WorkspaceTabBar /> under <TopBar />.
import { WorkspaceTabBar as _WorkspaceTabBarHidden } from './WorkspaceTabBar';
void _WorkspaceTabBarHidden;
import { Breadcrumbs } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';
import { TimeWindowProvider } from './TimeWindowProvider';
import { TenantProvider } from './TenantProvider';
import { CopilotDock } from '@/components/copilot/CopilotDock';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { DemoAutoLogin } from '@/components/demo/DemoAutoLogin';
import { ClientOnly } from '@/components/util/ClientOnly';
import { isDemoMode } from '@/lib/demoMode';

interface AppShellProps {
  children: React.ReactNode;
  /**
   * Resolved by the Server Component in `app/(app)/layout.tsx`, which can see
   * the running container's `AISOC_DEMO_MODE`. Passed in rather than read here
   * so server and client render the same value by construction. Optional so
   * the stories and tests that mount the shell directly keep working; those
   * run in the browser, where `isDemoMode()` is the only answer available.
   */
  demoMode?: boolean;
}

export function AppShell({ children, demoMode }: AppShellProps) {
  // In demo mode the banner adds 36px (h-9) to the top, so push the main
  // content down to keep the TopBar from sliding underneath it.
  const demo = demoMode ?? isDemoMode();
  const topPadClass = demo ? 'pt-[92px]' : 'pt-14';

  return (
    <SWRConfig value={{ revalidateOnMount: true, revalidateIfStale: true }}>
      <DemoAutoLogin />
      <TimeWindowProvider>
        <TenantProvider>
          <div className="min-h-screen bg-surface-base text-fg-primary">
            <DemoBanner demoMode={demo} />
            <BrandedDocumentTitle />
            <Sidebar />
            <div className="md:ml-[var(--sidebar-w,15rem)] transition-[margin] duration-200">
              <TopBar demoOffset={demo} />
              <main className={`${topPadClass} min-h-screen`}>
                <div className="max-w-[1320px] mx-auto p-6">{children}</div>
              </main>
            </div>
            <ClientOnly>
              <CopilotDock />
            </ClientOnly>
            <ClientOnly>
              <CommandPalette />
            </ClientOnly>
          </div>
        </TenantProvider>
      </TimeWindowProvider>
    </SWRConfig>
  );
}
