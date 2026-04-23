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

  it('sets data-grade="A" for grade A', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: 'A' })]} />);
    expect(screen.getByText('A')).toHaveAttribute('data-grade', 'A');
  });

  it('sets data-grade="B" for grade B', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: 'B' })]} />);
    expect(screen.getByText('B')).toHaveAttribute('data-grade', 'B');
  });

  it('sets data-grade="C" for grade C', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: 'C' })]} />);
    expect(screen.getByText('C')).toHaveAttribute('data-grade', 'C');
  });

  it('sets data-grade="D" for grade D', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: 'D' })]} />);
    expect(screen.getByText('D')).toHaveAttribute('data-grade', 'D');
  });

  it('sets data-grade="F" for grade F', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: 'F' })]} />);
    expect(screen.getByText('F')).toHaveAttribute('data-grade', 'F');
  });

  it('sets data-grade="none" for null grade', () => {
    render(<TopDomains domains={[buildDomain({ latestGrade: null })]} />);
    expect(screen.getByText('N/A')).toHaveAttribute('data-grade', 'none');
  });

  it('renders table headers', () => {
    render(<TopDomains domains={[buildDomain()]} />);
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('Scans')).toBeInTheDocument();
    expect(screen.getByText('Latest Grade')).toBeInTheDocument();
  });
});
