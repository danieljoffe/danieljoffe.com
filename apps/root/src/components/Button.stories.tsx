import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ArrowUpRight, GithubIcon } from 'lucide-react';
import Button from './Button';

// Button has a discriminated union type (AsButtonProps | AsLinkProps).
// Storybook's type inference produces `never` for args on discriminated unions,
// so we use `Meta` without a component generic for the meta and `StoryObj` without
// deriving from typeof meta.
const meta: Meta = {
  component: Button,
  title: 'Components/Button',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      description: 'Visual style of the button',
      control: 'select',
      options: ['primary', 'secondary', 'icon'],
    },
    size: {
      description: 'Button size',
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      description: 'Disables the button',
      control: 'boolean',
    },
    as: {
      description: 'Render as a button or link element',
      control: 'select',
      options: ['button', 'link'],
    },
    href: {
      description: 'Link destination URL (when as="link")',
      control: 'text',
      if: { arg: 'as', eq: 'link' },
    },
    onClick: {
      description: 'Click handler callback',
    },
    target: {
      description: 'Link target attribute',
      control: 'text',
      if: { arg: 'as', eq: 'link' },
    },
    rel: {
      description: 'Link rel attribute',
      control: 'text',
      if: { arg: 'as', eq: 'link' },
    },
    type: {
      description: 'Button type attribute',
      control: 'select',
      options: ['button', 'submit', 'reset'],
      if: { arg: 'as', eq: 'button' },
    },
  },
  decorators: [
    Story => (
      <div className='flex p-4'>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    onClick: fn(),
  },
  render: props => <Button {...props}>Primary</Button>,
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    onClick: fn(),
  },
  render: props => <Button {...props}>Secondary</Button>,
};

export const Icon: Story = {
  args: {
    variant: 'bare',
    size: 'sm',
    'aria-label': 'Close',
    onClick: fn(),
  },
  render: props => (
    <Button {...props}>
      <GithubIcon absoluteStrokeWidth={true} />
    </Button>
  ),
};

export const Link: Story = {
  args: {
    variant: 'bare',
    size: 'md',
    as: 'link',
    href: 'https://www.example.com',
    target: '_blank',
    rel: 'noopener noreferrer',
    highlighted: true,
  },
  render: props => (
    <Button {...props}>
      Link <ArrowUpRight absoluteStrokeWidth={true} className='size-4' />
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
    onClick: fn(),
  },
  render: props => <Button {...props}>Small</Button>,
};

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    onClick: fn(),
  },
  render: props => <Button {...props}>Large</Button>,
};
