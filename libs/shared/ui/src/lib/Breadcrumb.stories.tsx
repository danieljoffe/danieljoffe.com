import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Breadcrumb } from './Breadcrumb';

const meta = {
  title: 'Navigation/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
} satisfies Meta<typeof Breadcrumb>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
      { label: 'Portfolio Site' },
    ],
  },
};

export const TwoLevels: Story = {
  args: {
    items: [{ label: 'Home', href: '/' }, { label: 'About' }],
  },
};

export const SingleItem: Story = {
  args: {
    items: [{ label: 'Home' }],
  },
};

export const LinksAreClickable: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
      { label: 'Current Page' },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Non-last items should be links
    const homeLink = canvas.getByRole('link', { name: 'Home' });
    await expect(homeLink).toHaveAttribute('href', '/');

    const projectsLink = canvas.getByRole('link', { name: 'Projects' });
    await expect(projectsLink).toHaveAttribute('href', '/projects');

    // Last item should not be a link
    const currentPage = canvas.getByText('Current Page');
    await expect(currentPage.tagName).toBe('SPAN');
  },
};

export const WithSeparators: Story = {
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Section', href: '/section' },
      { label: 'Page' },
    ],
  },
  play: async ({ canvasElement }) => {
    // Should render separator SVGs between items
    const separators = canvasElement.querySelectorAll('svg');
    await expect(separators.length).toBe(2);
  },
};
