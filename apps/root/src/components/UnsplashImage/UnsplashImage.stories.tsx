import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import UnsplashImage from '.';

const origin =
  'https://unsplash.com/photos/aerial-photo-of-foggy-mountains-1527pjeb6jg';
const creator = '@samferrara';
const alt = 'Aerial photo of foggy mountains';
const src = '/photo-1506905925346-21bda4d32df4';

const meta = {
  component: UnsplashImage,
  title: 'Components/UnsplashImage',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    src: {
      description: 'Unsplash photo path (must start with /photo-)',
      control: 'text',
    },
    alt: {
      description: 'Accessible alt text for the image',
      control: 'text',
    },
    creator: {
      description: 'Unsplash photographer username',
      control: 'text',
    },
    origin: {
      description: 'Original Unsplash photo URL',
      control: 'text',
    },
    priority: {
      description: 'Whether to eagerly load the image',
      control: 'boolean',
    },
    fill: {
      description: 'Whether the image fills its container',
      control: 'boolean',
    },
    width: {
      description: 'Image width in pixels (required when fill is false)',
      control: 'number',
    },
    height: {
      description: 'Image height in pixels (required when fill is false)',
      control: 'number',
    },
  },
  decorators: [
    Story => (
      <div className='w-full h-full w-max-[20rem] h-max-[15rem]'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UnsplashImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    src,
    alt,
    creator,
    origin,
    priority: false,
    fill: true,
  },
};

export const WithDimensions: Story = {
  args: {
    src,
    alt,
    creator,
    origin,
    priority: false,
    width: 400,
    height: 300,
    fill: false,
  },
};

export const HighPriority: Story = {
  args: {
    src,
    alt,
    creator,
    origin,
    priority: true,
    fill: true,
  },
};
