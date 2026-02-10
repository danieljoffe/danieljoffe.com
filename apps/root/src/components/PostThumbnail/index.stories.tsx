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
      href: '/experience/sample-project',
      label: 'Sample Company',
    },
    description: 'The Foundation Years: Learning to Scale Marketing Operations',
    duration: 'Jun 2015 - Oct 2017',
    role: 'Frontend Developer',
    index: 0,
    title: '',
  },
};

export const SecondaryPosition: Story = {
  args: {
    slug: 'another-project',
    cover: mockCover,
    link: {
      href: '/experience/another-project',
      label: 'Another Company',
    },
    description:
      'This project demonstrates lazy loading since it is not in the first two positions.',
    duration: 'Mar 2018 - Aug 2019',
    role: 'Full Stack Engineer',
    index: 2,
    title: '',
  },
};

export const WithoutDuration: Story = {
  args: {
    slug: 'no-duration',
    cover: mockCover,
    link: {
      href: '/projects/no-duration',
      label: 'Side Project',
    },
    description: 'A project card without duration or role metadata.',
    index: 1,
    title: '',
  },
};
