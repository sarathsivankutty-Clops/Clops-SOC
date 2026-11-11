import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiSpinner } from './AiSpinner';

describe('AiSpinner', () => {
  it('renders two concentric counter-rotating arcs hidden from assistive tech by default', () => {
    const { container } = render(<AiSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('data-state', 'idle');
    expect(container.querySelectorAll('circle')).toHaveLength(2);
  });

  it('switches animation state between idle, busy, and done', () => {
    const { container, rerender } = render(<AiSpinner state="busy" />);
    const groups = container.querySelectorAll('g');
    expect(groups[0].getAttribute('style')).toContain('1.25s');
    expect(groups[1].getAttribute('style')).toContain('0.95s');

    rerender(<AiSpinner state="done" />);
    const doneGroups = container.querySelectorAll('g');
    expect(doneGroups[0].getAttribute('style')).toContain('animation: none');
    expect(doneGroups[1].getAttribute('style')).toContain('animation: none');
  });

  it('exposes an accessible img role when a label is provided', () => {
    render(<AiSpinner label="AI investigation running" state="busy" />);
    expect(screen.getByRole('img', { name: /ai investigation running/i })).toBeInTheDocument();
  });
});
