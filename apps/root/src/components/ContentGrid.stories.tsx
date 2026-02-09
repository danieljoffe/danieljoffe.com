import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ContentGrid from './ContentGrid';

const meta = {
  component: ContentGrid,
  title: 'Components/ContentGrid',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof ContentGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const SampleCard = ({ title, color }: { title: string; color: string }) => (
  <div
    className={`${color} p-6 rounded-md text-accent-foreground min-h-[10rem]`}
  >
    <h3 className='text-lg font-medium'>{title}</h3>
    <p>Sample content card</p>
  </div>
);

export const Default: Story = {
  args: {
    children: (
      <>
        <SampleCard title='Card 1' color='bg-blue-600' />
        <SampleCard title='Card 2' color='bg-green-600' />
        <SampleCard title='Card 3' color='bg-purple-600' />
        <SampleCard title='Card 4' color='bg-orange-600' />
      </>
    ),
  },
};

export const TwoItems: Story = {
  args: {
    children: (
      <>
        <SampleCard title='Card 1' color='bg-blue-600' />
        <SampleCard title='Card 2' color='bg-green-600' />
      </>
    ),
  },
};

export const SingleItem: Story = {
  args: {
    children: <SampleCard title='Single Card' color='bg-red-600' />,
  },
};
