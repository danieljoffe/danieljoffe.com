import { render, screen, fireEvent, act } from '@testing-library/react';
import { TableOfContents } from '../TableOfContents';

// Mock useFocusTrap
jest.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe = mockObserve;
  unobserve = jest.fn();
  disconnect = mockDisconnect;
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock matchMedia for reduced motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
});

function setupHeadings() {
  const container = document.createElement('article');
  const h2 = document.createElement('h2');
  h2.id = 'introduction';
  h2.textContent = 'Introduction';
  container.appendChild(h2);

  const h3 = document.createElement('h3');
  h3.id = 'details';
  h3.textContent = 'Details';
  container.appendChild(h3);

  const h2b = document.createElement('h2');
  h2b.id = 'conclusion';
  h2b.textContent = 'Conclusion';
  container.appendChild(h2b);

  document.body.appendChild(container);
  return container;
}

describe('TableOfContents', () => {
  let container: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    container = setupHeadings();
  });

  afterEach(() => {
    container.remove();
  });

  it('renders nothing when no headings are found', async () => {
    container.remove();
    const emptyContainer = document.createElement('article');
    document.body.appendChild(emptyContainer);

    const { container: wrapper } = render(<TableOfContents />);
    await act(() => Promise.resolve());

    expect(wrapper.innerHTML).toBe('');
    emptyContainer.remove();
  });

  it('renders desktop TOC with heading links', async () => {
    render(<TableOfContents desktop />);
    await act(() => Promise.resolve());

    expect(screen.getByText('On this page')).toBeInTheDocument();
    // Headings appear both in DOM and TOC buttons; verify at least 2 instances
    expect(screen.getAllByText('Introduction').length).toBeGreaterThanOrEqual(
      2
    );
    expect(screen.getAllByText('Details').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Conclusion').length).toBeGreaterThanOrEqual(2);
  });

  it('scrolls to heading when TOC link is clicked', async () => {
    const scrollIntoViewMock = jest.fn();
    const heading = document.getElementById('introduction')!;
    heading.scrollIntoView = scrollIntoViewMock;

    render(<TableOfContents desktop />);
    await act(() => Promise.resolve());

    // The heading text appears both in the DOM heading and the TOC button.
    // Click the TOC button (role=button), not the heading element.
    const tocButtons = screen.getAllByRole('button');
    const introButton = tocButtons.find(
      btn => btn.textContent === 'Introduction'
    );
    expect(introButton).toBeDefined();
    fireEvent.click(introButton!);

    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'smooth' })
    );
  });

  it('renders mobile FAB button', async () => {
    render(<TableOfContents mobile />);
    await act(() => Promise.resolve());

    expect(
      screen.getByRole('button', { name: /open table of contents/i })
    ).toBeInTheDocument();
  });

  it('opens mobile sheet when FAB is clicked', async () => {
    render(<TableOfContents mobile />);
    await act(() => Promise.resolve());

    const fab = screen.getByRole('button', {
      name: /open table of contents/i,
    });
    fireEvent.click(fab);

    expect(
      screen.getByRole('dialog', { name: /table of contents/i })
    ).toBeInTheDocument();
  });

  it('closes mobile sheet on Escape', async () => {
    render(<TableOfContents mobile />);
    await act(() => Promise.resolve());

    // Open the sheet
    fireEvent.click(
      screen.getByRole('button', { name: /open table of contents/i })
    );

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    // FAB label should revert to "Open"
    expect(
      screen.getByRole('button', { name: /open table of contents/i })
    ).toBeInTheDocument();
  });

  it('renders both desktop and mobile when no prop specified', async () => {
    render(<TableOfContents />);
    await act(() => Promise.resolve());

    // Desktop nav
    expect(
      screen.getByRole('navigation', { name: /table of contents/i })
    ).toBeInTheDocument();
    // Mobile FAB
    expect(
      screen.getByRole('button', { name: /open table of contents/i })
    ).toBeInTheDocument();
  });
});
