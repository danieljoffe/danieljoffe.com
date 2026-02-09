import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PostThumbnail from './index';

const mockCover = {
  src: '/photo-1506905925346-21bda4d32df4' as const,
  alt: 'Aerial photo of foggy mountains',
  origin:
    'https://unsplash.com/photos/aerial-photo-of-foggy-mountains-1527pjeb6jg' as const,
  creator: '@samferrara' as const,
  blurHash: 'L125+JD~D#-rn$WCkCj?D~xbxbNc',
};

const meta = {
  component: PostThumbnail,
  title: 'Components/PostThumbnail',
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    Story => (
      <div className='w-[400px]'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PostThumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    slug: 'sample-project',
    cover: mockCover,
    link: {
      href: '/projects/sample-project',
      label: 'Sample Project',
    },
    backgroundColor: 'bg-[#172554]',
    description:
      'A sample project showcasing modern web development techniques and best practices.',
    index: 0,
    title: '',
  },
};

export const SecondaryPosition: Story = {
  args: {
    slug: 'another-project',
    cover: mockCover,
    link: {
      href: '/projects/another-project',
      label: 'Another Project',
    },
    backgroundColor: 'bg-[#2e1065]',
    description:
      'This project demonstrates lazy loading since it is not in the first two positions.',
    index: 2,
    title: '',
  },
};

export const DifferentBackgroundColor: Story = {
  args: {
    slug: 'styled-project',
    cover: mockCover,
    link: {
      href: '/projects/styled-project',
      label: 'Styled Project',
    },
    backgroundColor: 'bg-[#4a044e]',
    description: 'A project with a gradient background to showcase styling.',
    index: 1,
    title: '',
  },
};
