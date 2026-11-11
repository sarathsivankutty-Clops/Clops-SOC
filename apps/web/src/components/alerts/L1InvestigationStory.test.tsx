import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { L1InvestigationStory } from './L1InvestigationStory';
import type { Alert } from '@/lib/api';

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'ALERT-001',
    title: 'Impossible travel detected for user John Smith',
    description: 'Suspicious sign-in from Tor exit node.',
    severity: 'critical',
    status: 'new',
    source: 'Okta',
    tenantId: 'tenant-1',
    riskScore: 88,
    createdAt: '2026-05-13T09:00:00Z',
    updatedAt: '2026-05-13T09:00:00Z',
    srcIpClass: 'tor_exit',
    assignee: 'john.smith@corp.example',
    ...overrides,
  } as Alert;
}

describe('L1InvestigationStory', () => {
  it('renders Analyst Mode by default with all 6 progressive disclosure questions and zero raw math', () => {
    render(<L1InvestigationStory alert={makeAlert()} />);

    // Mode check
    expect(screen.getByText('Analyst Mode (Default)')).toBeInTheDocument();

    // 1. What happened?
    expect(screen.getByText(/1\. What happened\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Impossible travel/i)).toBeInTheDocument();

    // 2. Is this serious?
    expect(screen.getByText(/2\. Is this serious\?/i)).toBeInTheDocument();
    expect(screen.getByText(/High-confidence account takeover/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Confidence: 91\/100/i)).toBeInTheDocument();

    // 3 & 4. Why does AI believe this?
    expect(screen.getByText(/3 & 4\. Why does AI believe this\?/i)).toBeInTheDocument();
    expect(screen.getByText('Tor exit node')).toBeInTheDocument();
    expect(screen.getByText('Legacy authentication')).toBeInTheDocument();
    expect(screen.getByText('New forwarding rule')).toBeInTheDocument();
    expect(screen.getByText('Impossible travel confirmed')).toBeInTheDocument();

    // Plain English reasons (No raw math like +25)
    expect(screen.getByText(/Confidence increased because:/i)).toBeInTheDocument();
    expect(screen.getByText(/Login originated from a known Tor exit node/i)).toBeInTheDocument();
    expect(screen.queryByText('+25')).not.toBeInTheDocument();

    // 5. What should I do?
    expect(screen.getByText(/5\. What should I do\?/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Approve Containment: Lock Account & Remove Forwarding Rule/i }),
    ).toBeInTheDocument();

    // 6. What happens if I execute this action?
    expect(screen.getByText(/6\. What happens if I execute this action\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Business Impact:/i)).toBeInTheDocument();

    // Audit-friendly AI Investigation Summary
    expect(screen.getByText(/AI Investigation Summary/i)).toBeInTheDocument();
    expect(screen.getByText('Alert received')).toBeInTheDocument();
    expect(screen.getByText('Containment recommended')).toBeInTheDocument();
  });

  it('switches to Expert Mode and displays the Numerical Confidence Ledger & Waves', async () => {
    const user = userEvent.setup();
    render(<L1InvestigationStory alert={makeAlert()} />);

    await user.click(screen.getByRole('button', { name: /Expert Mode/i }));

    // In Expert mode, numerical math and ledger table become visible
    expect(screen.getByText(/Numerical Confidence Ledger/i)).toBeInTheDocument();
    expect(screen.getByText('+25')).toBeInTheDocument();
    expect(screen.getByText('+15')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();

    // Hypothesis evolution & governance specs
    expect(screen.getByText(/Hypothesis Evolution/i)).toBeInTheDocument();
    expect(screen.getByText(/H1: Account Takeover/i)).toBeInTheDocument();
    expect(screen.getByText(/Governance, Verification & Rollback/i)).toBeInTheDocument();
    expect(screen.getByText(/pack\.policy\.tier1_safe_containment@v5/i)).toBeInTheDocument();
  });

  it('triggers action callback when containment is approved', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<L1InvestigationStory alert={makeAlert()} onApproveAction={onApprove} />);

    const approveBtn = screen.getByRole('button', {
      name: /Approve Containment: Lock Account & Remove Forwarding Rule/i,
    });
    await user.click(approveBtn);

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Action executed:/i)).toBeInTheDocument();
  });

  it('renders benign message and no-action-required recommendation for corporate VPN', () => {
    render(
      <L1InvestigationStory
        alert={makeAlert({
          srcIpClass: 'vpn',
          title: 'Corporate VPN sign-in for John Smith',
          severity: 'low',
        })}
      />,
    );

    expect(screen.getByText(/Likely legitimate travel using corporate VPN/i)).toBeInTheDocument();
    expect(screen.getByText(/No Action Required — Close as Legitimate VPN Roaming/i)).toBeInTheDocument();
  });
});
