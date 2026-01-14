import type { Meta, StoryObj } from '@storybook/react';
import Container from './Container';

const meta = {
  component: Container,
  title: 'Components/Container',
  parameters: {
    layout: 'fullscreen',
  },
  // tags: ['autodocs'],
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className='flex flex-col gap-4'>
        <h1>Container Content</h1>
        <p>
          This content is centered and properly spaced within the container.
        </p>
      </div>
    ),
  },
};

export const WithCustomClass: Story = {
  args: {
    children: (
      <div className='flex flex-col gap-4'>
        <h1>Custom Styled Container</h1>
        <p>This container has additional custom styling applied.</p>
      </div>
    ),
    className: 'bg-blue-500 text-neutral-100',
  },
};

export const LongContent: Story = {
  args: {
    children: (
      <div className='flex flex-col gap-4'>
        <h1>Long Content Example</h1>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </p>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
          proident, sunt in culpa qui officia deserunt mollit anim id est
          laborum.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </p>
      </div>
    ),
  },
};
