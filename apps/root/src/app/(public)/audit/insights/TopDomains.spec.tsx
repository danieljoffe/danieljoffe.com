import { render, screen } from '@testing-library/react';
import TopDomains from './TopDomains';
import type { DomainEntry } from './types';

function buildDomain(overrides: Partial<DomainEntry> = {}): DomainEntry {
  return {
    domain: 'example.com',
    scanCount: 42,
    latestGrade: 'B',
    latestScanAt: '2025-01-15T00:00:00Z',
    ...overrides,
  };
}

describe('TopDomains', () => {
  it('renders the table when domains are provided', () => {
    render(
      <TopDomains
        domains={[
          buildDomain({ domain: 'alpha.com', scanCount: 10, latestGrade: 'A' }),
          buildDomain({ domain: 'beta.com', scanCount: 5, latestGrade: 'C' }),
        ]}
      />
    );
    expect(screen.getByText('alpha.com')).toBeInTheDocument();
    expect(screen.getByText('beta.com')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders empty state when no domains', () => {
    render(<TopDomains domains={[]} />);
    expect(
      screen.getByText('Domain rankings will appear as more sites are scanned.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders N/A for null latestGrade', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: null })]} />);
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('applies green class for grade A', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: 'A' })]} />);
    const gradeCell = screen.getByText('A');
    expect(gradeCell.className).toContain('text-green-500');
  });

  it('applies indigo class for grade B', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: 'B' })]} />);
    const gradeCell = screen.getByText('B');
    expect(gradeCell.className).toContain('text-indigo-400');
  });

  it('applies amber class for grade C', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: 'C' })]} />);
    const gradeCell = screen.getByText('C');
    expect(gradeCell.className).toContain('text-amber-500');
  });

  it('applies rose class for grade D', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: 'D' })]} />);
    const gradeCell = screen.getByText('D');
    expect(gradeCell.className).toContain('text-rose-400');
  });

  it('applies red class for grade F', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: 'F' })]} />);
    const gradeCell = screen.getByText('F');
    expect(gradeCell.className).toContain('text-red-500');
  });

  it('applies muted class for null grade', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: null })]} />);
    const gradeCell = screen.getByText('N/A');
    expect(gradeCell.className).toContain('text-muted');
  });

  it('renders table headers', () => {
    render(<TopDomains domains={[buildDomain()]} />);
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('Scans')).toBeInTheDocument();
    expect(screen.getByText('Latest Grade')).toBeInTheDocument();
  });
});
