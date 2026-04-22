import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViolationsSection from './ViolationsSection';
import type { Violation } from './types';

function buildViolation(overrides: Partial<Violation> = {}): Violation {
  return {
    category: 'performance',
    title: 'Slow LCP',
    occurrenceCount: 10,
    severity: { critical: 3, warning: 5, info: 2 },
    ...overrides,
  };
}

const defaultViolations: Violation[] = [
  buildViolation({
    category: 'performance',
    title: 'Slow LCP',
    severity: { critical: 5, warning: 3, info: 0 },
  }),
  buildViolation({
    category: 'accessibility',
    title: 'Missing alt text',
    severity: { critical: 0, warning: 8, info: 2 },
  }),
  buildViolation({
    category: 'seo',
    title: 'Missing meta description',
    severity: { critical: 0, warning: 0, info: 4 },
  }),
  buildViolation({
    category: 'ux',
    title: 'No favicon',
    severity: { critical: 0, warning: 1, info: 0 },
  }),
];

describe('ViolationsSection', () => {
  it('renders tab navigation with all categories', () => {
    render(
      <ViolationsSection violations={defaultViolations} guideSlugs={{}} />
    );
    expect(
      screen.getByRole('tab', { name: 'Performance' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Accessibility' })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'SEO' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'UX' })).toBeInTheDocument();
  });

  it('shows performance violations by default', () => {
    render(
      <ViolationsSection violations={defaultViolations} guideSlugs={{}} />
    );
    expect(screen.getByText('Slow LCP')).toBeInTheDocument();
    expect(screen.queryByText('Missing alt text')).not.toBeInTheDocument();
  });

  it('switches category on tab click', async () => {
    const user = userEvent.setup();
    render(
      <ViolationsSection violations={defaultViolations} guideSlugs={{}} />
    );
    await user.click(screen.getByRole('tab', { name: 'Accessibility' }));
    expect(screen.getByText('Missing alt text')).toBeInTheDocument();
    expect(screen.queryByText('Slow LCP')).not.toBeInTheDocument();
  });

  it('shows empty state for category with no violations', async () => {
    const user = userEvent.setup();
    render(
      <ViolationsSection
        violations={[
          buildViolation({ category: 'performance', title: 'LCP issue' }),
        ]}
        guideSlugs={{}}
      />
    );
    await user.click(screen.getByRole('tab', { name: 'SEO' }));
    expect(screen.getByText('No violations recorded yet.')).toBeInTheDocument();
  });

  it('toggles between tabs and expanded view', async () => {
    const user = userEvent.setup();
    render(
      <ViolationsSection violations={defaultViolations} guideSlugs={{}} />
    );

    // Initially shows tabs
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'View All' })
    ).toBeInTheDocument();

    // Click "View All" to expand
    await user.click(screen.getByRole('button', { name: 'View All' }));
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('Slow LCP')).toBeInTheDocument();
    expect(screen.getByText('Missing alt text')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'View Tabs' })
    ).toBeInTheDocument();

    // Click "View Tabs" to collapse
    await user.click(screen.getByRole('button', { name: 'View Tabs' }));
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders critical severity badges when count > 0', () => {
    render(
      <ViolationsSection
        violations={[
          buildViolation({
            category: 'performance',
            severity: { critical: 7, warning: 0, info: 0 },
          }),
        ]}
        guideSlugs={{}}
      />
    );
    expect(screen.getByLabelText('7 critical')).toBeInTheDocument();
  });

  it('renders warning severity badges when count > 0', () => {
    render(
      <ViolationsSection
        violations={[
          buildViolation({
            category: 'performance',
            severity: { critical: 0, warning: 4, info: 0 },
          }),
        ]}
        guideSlugs={{}}
      />
    );
    expect(screen.getByLabelText('4 warnings')).toBeInTheDocument();
  });

  it('hides severity badges when count is 0', () => {
    render(
      <ViolationsSection
        violations={[
          buildViolation({
            category: 'performance',
            severity: { critical: 0, warning: 0, info: 3 },
          }),
        ]}
        guideSlugs={{}}
      />
    );
    expect(screen.queryByLabelText(/critical/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/warnings/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('3 total')).toBeInTheDocument();
  });

  it('renders a link when guideSlugs has a matching entry', () => {
    render(
      <ViolationsSection
        violations={[
          buildViolation({
            category: 'performance',
            title: 'Slow LCP',
          }),
        ]}
        guideSlugs={{ 'slow lcp': 'slow-lcp-guide' }}
      />
    );
    const link = screen.getByRole('link', { name: 'Slow LCP' });
    expect(link).toHaveAttribute(
      'href',
      '/audit/insights/violations/slow-lcp-guide'
    );
  });

  it('renders plain text when no guide slug matches', () => {
    render(
      <ViolationsSection
        violations={[
          buildViolation({ category: 'performance', title: 'Slow LCP' }),
        ]}
        guideSlugs={{}}
      />
    );
    expect(screen.getByText('Slow LCP')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Slow LCP' })
    ).not.toBeInTheDocument();
  });

  it('shows total count for each violation', () => {
    render(
      <ViolationsSection
        violations={[
          buildViolation({
            category: 'performance',
            severity: { critical: 2, warning: 3, info: 5 },
          }),
        ]}
        guideSlugs={{}}
      />
    );
    expect(screen.getByLabelText('10 total')).toBeInTheDocument();
  });
});
