import type { Meta, StoryObj } from '@storybook/react-vite';
import { CTACard } from './CTACard';

const meta = {
  title: 'Layout/CTACard',
  component: CTACard,
  tags: ['autodocs'],
} satisfies Meta<typeof CTACard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    heading: 'Ready to get started?',
    description: 'Join thousands of developers building better software.',
    children: (
      <div className='flex justify-center'>
        <span className='px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium'>
          Get Started
        </span>
      </div>
    ),
  },
};

export const WithMultipleActions: Story = {
  args: {
    heading: 'Have a project in mind?',
    description: "Let's discuss how we can work together.",
    children: (
      <div className='flex justify-center gap-3'>
        <span className='px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium'>
          Contact Me
        </span>
        <span className='px-4 py-2 border border-border text-text-primary rounded-lg text-sm font-medium'>
          View Work
        </span>
      </div>
    ),
  },
};
