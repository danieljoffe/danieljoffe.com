import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
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
        <Button variant='primary'>Get Started</Button>
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
        <Button variant='primary'>Contact Me</Button>
        <Button variant='outline'>View Work</Button>
      </div>
    ),
  },
};
