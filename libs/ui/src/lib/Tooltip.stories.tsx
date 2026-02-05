import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    content: {
      description: 'Text content displayed in the tooltip',
      control: 'text',
    },
    position: {
      description: 'Position of the tooltip relative to the trigger',
      control: 'select',
      options: [undefined, 'top', 'bottom', 'left', 'right'],
      table: {
        defaultValue: { summary: 'top' },
      },
    },
    delay: {
      description: 'Delay in milliseconds before showing tooltip',
      control: 'number',
      table: {
        defaultValue: { summary: '200' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    content: 'This is a tooltip',
    children: <Button>Hover me</Button>,
  },
};

export const Bottom: Story = {
  args: {
    content: 'Tooltip on bottom',
    children: <Button>Hover me</Button>,
    position: 'bottom',
  },
};

export const WithDelay: Story = {
  args: {
    content: 'Delayed tooltip',
    children: <Button>Hover me (500ms delay)</Button>,
    delay: 500,
  },
};

export const Left: Story = {
  args: {
    content: 'Tooltip on left',
    children: <Button>Hover me</Button>,
    position: 'left',
  },
};

export const Right: Story = {
  args: {
    content: 'Tooltip on right',
    children: <Button>Hover me</Button>,
    position: 'right',
  },
};

export const HoverInteraction: Story = {
  args: {
    content: 'Tooltip content',
    children: <Button>Hover to show tooltip</Button>,
    delay: 0,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', {
      name: 'Hover to show tooltip',
    });
    const tooltip = canvas.getByRole('tooltip');

    // Tooltip should be hidden initially
    await expect(tooltip).toHaveAttribute('aria-hidden', 'true');

    // Hover to show tooltip
    await userEvent.hover(trigger);

    // Wait for tooltip to appear
    await new Promise(resolve => setTimeout(resolve, 50));
    await expect(tooltip).toHaveAttribute('aria-hidden', 'false');

    // Unhover to hide tooltip
    await userEvent.unhover(trigger);
    await expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  },
};

export const TooltipAccessibility: Story = {
  args: {
    content: 'Accessible tooltip',
    children: <Button>Focus me</Button>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tooltip = canvas.getByRole('tooltip');

    // Check tooltip role exists
    await expect(tooltip).toBeInTheDocument();
    await expect(tooltip).toHaveAttribute('aria-hidden');
  },
};
