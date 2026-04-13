import type { Meta, StoryObj } from '@storybook/react-vite';
import { SectionLabel } from './SectionLabel';

const meta = {
  title: 'Layout/SectionLabel',
  component: SectionLabel,
  tags: ['autodocs'],
} satisfies Meta<typeof SectionLabel>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Experience',
    icon: (
      <svg
        viewBox='0 0 16 16'
        fill='currentColor'
        className='h-4 w-4'
        aria-hidden='true'
      >
        <path d='M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75C0 1.784.784 1 1.75 1z' />
      </svg>
    ),
  },
};

export const WithDifferentIcon: Story = {
  args: {
    label: 'Projects',
    icon: (
      <svg
        viewBox='0 0 16 16'
        fill='currentColor'
        className='h-4 w-4'
        aria-hidden='true'
      >
        <circle cx='8' cy='8' r='7' />
      </svg>
    ),
  },
};
