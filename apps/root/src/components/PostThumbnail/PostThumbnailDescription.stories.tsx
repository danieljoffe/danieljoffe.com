import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PostThumbnailDescription from './PostThumbnailDescription';

const meta = {
  component: PostThumbnailDescription,
  title: 'Components/PostThumbnail/PostThumbnailDescription',
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className='w-[400px] bg-gradient-to-br from-blue-500 to-purple-600'>
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

export const ShortDescription: Story = {
  args: {
    title: 'Quick Project',
    description: 'A minimal project description.',
  },
};

export const LongDescription: Story = {
  args: {
    title: 'Complex Project with Long Title',
    description:
      'This is a comprehensive project that spans multiple technologies and frameworks. It includes frontend development with React and TypeScript, backend services with Node.js, and cloud deployment infrastructure.',
  },
};
