import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContentGrid from './ContentGrid';

const meta = {
  component: ContentGrid,
  title: 'Components/ContentGrid',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    children: {
      description: 'Grid items to render in a responsive 2-column layout',
    },
  },
} satisfies Meta<typeof ContentGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const SampleCard = ({ title, color }: { title: string; color: string }) => (
  <div className={`${color} p-6 rounded-md text-text-inverse min-h-[10rem]`}>
    <h3 className='text-lg font-medium'>{title}</h3>
    <p>Sample content card</p>
  </div>
);

export const Default: Story = {
  args: {
    children: (
      <>
        <SampleCard title='Card 1' color='bg-brand-500' />
        <SampleCard title='Card 2' color='bg-success' />
        <SampleCard title='Card 3' color='bg-info' />
        <SampleCard title='Card 4' color='bg-warning' />
      </>
    ),
  },
};

export const TwoItems: Story = {
  args: {
    children: (
      <>
        <SampleCard title='Card 1' color='bg-brand-500' />
        <SampleCard title='Card 2' color='bg-success' />
      </>
    ),
  },
};

export const SingleItem: Story = {
  args: {
    children: <SampleCard title='Single Card' color='bg-error' />,
  },
};
