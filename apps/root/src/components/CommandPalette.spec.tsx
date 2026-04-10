import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommandPalette from './CommandPalette';

// cmdk calls scrollIntoView internally, which doesn't exist in jsdom
window.HTMLElement.prototype.scrollIntoView = jest.fn();

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockEntries = [
  {
    id: 'page:home',
    title: 'Home',
    excerpt: 'Homepage',
    tags: [],
    category: 'Pages',
    type: 'page',
    slug: 'home',
    url: '/',
    body: '',
    date: '',
    author: 'Daniel Joffe',
  },
  {
    id: 'project:test-project',
    title: 'Test Project',
    excerpt: 'A test project',
    tags: ['React'],
    category: 'Projects',
    type: 'project',
    slug: 'test-project',
    url: '/projects/test-project',
    body: 'Test project body content',
    date: '2024-01-01',
    author: 'Daniel Joffe',
  },
];

jest.mock('@/lib/searchIndex', () => ({
  buildSearchIndex: () => mockEntries,
}));

jest.mock('@/utils/constants', () => ({
  Z_INDEX: { POPOVER: 1060 },
}));

describe('CommandPalette', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders nothing when closed', () => {
    render(<CommandPalette />);
    expect(screen.queryByTestId('command-palette-overlay')).toBeNull();
  });

  it('opens when Cmd+K is pressed', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('command-palette-overlay')).toBeInTheDocument();
    });
  });

  it('opens when Ctrl+K is pressed', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('command-palette-overlay')).toBeInTheDocument();
    });
  });

  it('closes when Cmd+K is pressed again', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByTestId('command-palette-overlay')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.queryByTestId('command-palette-overlay')).toBeNull();
    });
  });

  it('closes when Escape is pressed', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByTestId('command-palette-overlay')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('command-palette-overlay')).toBeNull();
    });
  });

  it('closes when overlay is clicked', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByTestId('command-palette-overlay')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('command-palette-overlay'));
    await waitFor(() => {
      expect(screen.queryByTestId('command-palette-overlay')).toBeNull();
    });
  });

  it('displays search entries when open', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('navigates on select and closes', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Test Project'));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/projects/test-project');
      expect(screen.queryByTestId('command-palette-overlay')).toBeNull();
    });
  });

  it('locks body scroll when open', async () => {
    render(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(document.body.classList.contains('overflow-y-hidden')).toBe(true);
    });
  });
});
