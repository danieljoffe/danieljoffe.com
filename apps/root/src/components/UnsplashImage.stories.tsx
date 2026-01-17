import type { Meta, StoryObj } from '@storybook/react';
import UnsplashImage from './UnsplashImage';

const origin =
  'https://unsplash.com/photos/aerial-photo-of-foggy-mountains-1527pjeb6jg';
const creator = '@samferrara';
const alt = 'Aerial photo of foggy mountains';
const src = '/photo-1506905925346-21bda4d32df4';
const blurHash = 'L125+JD~D#-rn$WCkCj?D~xbxbNc';

const meta = {
  component: UnsplashImage,
  title: 'Components/UnsplashImage',
  parameters: {
    layout: 'centered',
  },
  // tags: ['autodocs'],
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
    blurHash,
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
    blurHash,
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
    blurHash,
  },
};
