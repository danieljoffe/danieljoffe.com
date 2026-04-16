import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PostThumbnail } from '@/types/postTypes';
import { ProjectsGridWithTags } from './ProjectsGridWithTags';

function makeProject(
  slug: string,
  title: string,
  tags: string[]
): PostThumbnail {
  return {
    slug,
    title,
    description: `${title} description`,
    cover: {
      src: `/img/${slug}.jpg`,
      alt: title,
      origin: 'https://unsplash.com',
      creator: '@test',
    },
    link: { href: `/projects/${slug}` },
    readingTime: 5,
    tags,
  };
}

const projects = [
  makeProject('design-system', 'Design System', ['React', 'Design Systems']),
  makeProject('perf-audit', 'Performance Audit', ['Performance']),
  makeProject('a11y-audit', 'Accessibility Audit', ['Accessibility']),
];

const tags = [
  { name: 'React', count: 1, href: '/projects/tags/react' },
  { name: 'Performance', count: 1, href: '/projects/tags/performance' },
];

describe('ProjectsGridWithTags', () => {
  it('renders all projects when no tag filter is active', () => {
    render(<ProjectsGridWithTags allProjects={projects} tags={tags} />);
    expect(screen.getByText('Design System')).toBeInTheDocument();
    expect(screen.getByText('Performance Audit')).toBeInTheDocument();
    expect(screen.getByText('Accessibility Audit')).toBeInTheDocument();
  });

  it('filters to projects matching the selected tag', async () => {
    const user = userEvent.setup();
    render(<ProjectsGridWithTags allProjects={projects} tags={tags} />);

    await user.click(screen.getByRole('button', { name: /react/i }));

    expect(screen.getByText('Design System')).toBeInTheDocument();
    expect(screen.queryByText('Performance Audit')).not.toBeInTheDocument();
    expect(screen.queryByText('Accessibility Audit')).not.toBeInTheDocument();
  });

  it('announces the filtered result count when filtering is active', async () => {
    const user = userEvent.setup();
    render(<ProjectsGridWithTags allProjects={projects} tags={tags} />);

    await user.click(screen.getByRole('button', { name: /performance/i }));

    const status = document.querySelector('[aria-live="polite"]');
    expect(status?.textContent).toMatch(/1 case study/i);
    expect(status?.textContent).toMatch(/Performance/);
  });

  it('shows an empty-state message when no projects match the active tag', async () => {
    const user = userEvent.setup();
    const emptyTags = [
      { name: 'Rust', count: 0, href: '/projects/tags/rust' },
      ...tags,
    ];
    render(<ProjectsGridWithTags allProjects={projects} tags={emptyTags} />);

    await user.click(screen.getByRole('button', { name: /rust/i }));

    expect(screen.getByText(/no case studies tagged/i)).toBeInTheDocument();
  });

  it('clears the filter when the active tag is clicked again', async () => {
    const user = userEvent.setup();
    render(<ProjectsGridWithTags allProjects={projects} tags={tags} />);

    const reactTag = screen.getByRole('button', { name: /react/i });
    await user.click(reactTag);
    await user.click(reactTag);

    expect(screen.getByText('Performance Audit')).toBeInTheDocument();
    expect(screen.getByText('Accessibility Audit')).toBeInTheDocument();
  });
});
