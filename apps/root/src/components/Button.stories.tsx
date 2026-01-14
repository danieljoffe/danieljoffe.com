import type { Meta, StoryObj } from '@storybook/react';
import Button from './Button';
import { GithubIcon } from 'lucide-react';
import LinkHint from './LinkHint';

const meta = {
  title: 'Components/Button',
  parameters: {
    layout: 'centered',
  },
  // tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'icon'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    as: {
      control: 'select',
      options: ['button', 'link'],
    },
    href: {
      control: 'text',
      if: { arg: 'as', eq: 'link' },
    },
    onClick: {
      action: 'onClick executed!',
    },
    target: {
      control: 'text',
      if: { arg: 'as', eq: 'link' },
    },
    rel: {
      control: 'text',
      if: { arg: 'as', eq: 'link' },
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
      if: { arg: 'as', eq: 'button' },
    },
  },
  decorators: [
    Story => {
      return (
        <div className='flex p-4'>
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
  },
  render: props => <Button {...props}>Primary</Button>,
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
  },
  render: props => <Button {...props}>Secondary</Button>,
};

export const Icon: Story = {
  args: {
    variant: 'icon',
    size: 'sm',
    'aria-label': 'Close',
  },
  render: props => (
    <Button {...props}>
      <GithubIcon absoluteStrokeWidth={true} />
    </Button>
  ),
};

export const Link: Story = {
  args: {
    variant: 'link',
    size: 'md',
    as: 'link',
    href: 'https://www.example.com',
    target: '_blank',
    rel: 'noopener noreferrer',
    highlighted: true,
  },
  render: props => (
    <Button {...props}>
      Link <LinkHint />
    </Button>
  ),
};

export const Disabled: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: true,
  },
  render: props => <Button {...props}>Disabled</Button>,
};

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
  },
  render: props => <Button {...props}>Small</Button>,
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
  },
  render: props => <Button {...props}>Large</Button>,
};
