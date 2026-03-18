import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PostThumbnailDescription from './PostThumbnailDescription';

const meta = {
  component: PostThumbnailDescription,
  title: 'Components/PostThumbnail/PostThumbnailDescription',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    title: {
      description: 'Post title text',
      control: 'text',
    },
    description: {
      description: 'Brief summary of the post',
      control: 'text',
    },
    duration: {
      description: 'Time period displayed as a badge',
      control: 'text',
    },
    role: {
      description: 'Job role displayed as a badge',
      control: 'text',
    },
  },
  decorators: [
    Story => (
      <div className='w-[400px] bg-surface-elevated border border-border rounded-md'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PostThumbnailDescription>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Project Title',
    description:
      'A brief description of the project explaining what it does and what technologies were used.',
  },
};

export const WithDurationAndRole: Story = {
  args: {
    title: 'Winc',
    description: 'The Foundation Years: Learning to Scale Marketing Operations',
    duration: 'Jun 2015 - Oct 2017',
    role: 'Frontend Developer',
  },
};

export const ShortDescription: Story = {
  args: {
    title: 'Quick Project',
    description: 'A minimal project description.',
    duration: 'Jan 2023 - Present',
    role: 'Senior Frontend Developer',
  },
};

export const LongDescription: Story = {
  args: {
    title: 'Complex Project with Long Title',
    description:
      'This is a comprehensive project that spans multiple technologies and frameworks. It includes frontend development with React and TypeScript, backend services with Node.js, and cloud deployment infrastructure.',
    duration: 'Mar 2018 - Aug 2019',
    role: 'Full Stack Engineer',
  },
};
