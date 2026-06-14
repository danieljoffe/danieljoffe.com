import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Mermaid } from './Mermaid';

expect.extend(toHaveNoViolations);

const mockInitialize = jest.fn();
const mockRender = jest.fn();

jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
    render: (...args: unknown[]) => mockRender(...args),
  },
}));

beforeEach(() => {
  mockInitialize.mockClear();
  mockRender.mockClear();
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    onchange: null,
    dispatchEvent: jest.fn(),
  }));
});

const CHART = 'flowchart LR\n  A --> B';
const ALT = 'A connects to B in a left-to-right flow.';

it('renders the diagram SVG once mermaid resolves', async () => {
  mockRender.mockResolvedValue({ svg: '<svg data-testid="diagram"></svg>' });

  render(<Mermaid chart={CHART} alt={ALT} />);

  const img = await screen.findByRole('img', { name: ALT });
  expect(img).toBeInTheDocument();
  expect(mockInitialize).toHaveBeenCalledTimes(1);
  expect(mockRender).toHaveBeenCalledWith(expect.any(String), CHART);
});

it('shows the caption text alternative', async () => {
  mockRender.mockResolvedValue({ svg: '<svg></svg>' });

  render(<Mermaid chart={CHART} alt={ALT} />);

  await waitFor(() => {
    expect(screen.getByText(ALT)).toBeInTheDocument();
  });
});

it('falls back to the raw chart source when rendering fails', async () => {
  mockRender.mockRejectedValue(new Error('parse error'));

  render(<Mermaid chart={CHART} alt={ALT} />);

  await waitFor(() => {
    expect(screen.getByText(/A --> B/)).toBeInTheDocument();
  });
  // Caption still present so the description survives a render failure.
  expect(screen.getByText(ALT)).toBeInTheDocument();
});

it('has no accessibility violations', async () => {
  mockRender.mockResolvedValue({ svg: '<svg aria-hidden="true"></svg>' });

  const { container } = render(<Mermaid chart={CHART} alt={ALT} />);
  await screen.findByRole('img', { name: ALT });

  expect(await axe(container)).toHaveNoViolations();
});
