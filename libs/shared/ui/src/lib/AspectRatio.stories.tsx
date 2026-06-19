import type { Meta, StoryObj } from '@storybook/react-vite';
import { AspectRatio } from './AspectRatio';

const meta = {
  title: 'Layout/AspectRatio',
  component: AspectRatio,
  tags: ['autodocs'],
  argTypes: {
    ratio: {
      description: 'The aspect ratio to maintain',
      control: 'select',
      options: ['1/1', '4/3', '16/9', '21/9', '3/4', '9/16'],
      table: {
        defaultValue: { summary: '16/9' },
      },
    },
  },
  decorators: [
    Story => (
      <div className='max-w-md'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AspectRatio>;

export default meta;
type Story = StoryObj<typeof meta>;

const PlaceholderImage = ({ label }: { label: string }) => (
  <div className='absolute inset-0 bg-brand-500 flex items-center justify-center text-on-brand font-medium'>
    {label}
  </div>
);

export const Default: Story = {
  args: {
    ratio: '16/9',
    children: <PlaceholderImage label='16:9 (Default)' />,
  },
};

export const Square: Story = {
  args: {
    ratio: '1/1',
    children: <PlaceholderImage label='1:1 (Square)' />,
  },
};

export const FourThree: Story = {
  args: {
    ratio: '4/3',
    children: <PlaceholderImage label='4:3' />,
  },
};

export const Widescreen: Story = {
  args: {
    ratio: '16/9',
    children: <PlaceholderImage label='16:9 (Widescreen)' />,
  },
};

export const UltraWide: Story = {
  args: {
    ratio: '21/9',
    children: <PlaceholderImage label='21:9 (Ultra Wide)' />,
  },
};

export const Portrait: Story = {
  args: {
    ratio: '3/4',
    children: <PlaceholderImage label='3:4 (Portrait)' />,
  },
};

export const VerticalVideo: Story = {
  args: {
    ratio: '9/16',
    children: <PlaceholderImage label='9:16 (Vertical Video)' />,
  },
};

export const WithImage: Story = {
  args: {
    ratio: '16/9',
    children: (
      <img
        src='https://picsum.photos/800/450'
        alt='Placeholder'
        className='absolute inset-0 size-full object-cover rounded'
      />
    ),
  },
};
