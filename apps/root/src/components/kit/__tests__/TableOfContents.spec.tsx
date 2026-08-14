import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
  within,
} from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TableOfContents } from '../TableOfContents';

expect.extend(toHaveNoViolations);

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

  it('marks a section active on initial load (scroll-position spy)', async () => {
    render(<TableOfContents desktop />);
    await act(() => Promise.resolve());

    // jsdom reports zero rects for every heading, so the spy resolves the
    // last one — what matters here is that the spy runs at load at all
    // (the old observer version highlighted nothing until a scroll).
    const nav = screen.getByRole('navigation', { name: /table of contents/i });
    const active = within(nav)
      .getAllByRole('button')
      .filter(b => b.getAttribute('aria-current') === 'location');
    expect(active).toHaveLength(1);
  });

  it('scrolls to heading when TOC link is clicked', async () => {
    const scrollIntoViewMock = jest.fn();
    const heading = document.getElementById('introduction')!;
    heading.scrollIntoView = scrollIntoViewMock;

    render(<TableOfContents desktop />);
    await act(() => Promise.resolve());

    // The heading text appears both in the DOM heading and the TOC button.
    // `getByRole('button', { name })` throws if missing — implicit assertion.
    const introButton = screen.getByRole('button', { name: 'Introduction' });
    fireEvent.click(introButton);

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
    // The sheet slides out, then unmounts
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
    );
  });

  it('closes mobile sheet on backdrop click', async () => {
    const { container: wrapper } = render(<TableOfContents mobile />);
    await act(() => Promise.resolve());

    fireEvent.click(
      screen.getByRole('button', { name: /open table of contents/i })
    );
    const backdrop = wrapper.querySelector('.backdrop-blur-sm');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
    );
  });

  it('open mobile sheet has no accessibility violations', async () => {
    const { container: wrapper } = render(<TableOfContents mobile />);
    await act(() => Promise.resolve());

    fireEvent.click(
      screen.getByRole('button', { name: /open table of contents/i })
    );
    expect(
      screen.getByRole('dialog', { name: /table of contents/i })
    ).toBeInTheDocument();
    expect(await axe(wrapper)).toHaveNoViolations();
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

  it('has no accessibility violations (desktop)', async () => {
    const { container: wrapper } = render(<TableOfContents desktop />);
    await act(() => Promise.resolve());
    expect(await axe(wrapper)).toHaveNoViolations();
  });
});
