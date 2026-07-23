import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from './Button';

const meta = {
  title: 'Forms/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Button',
  },
  argTypes: {
    variant: {
      description: 'Visual style of the button',
      control: 'select',
      options: [
        undefined,
        'bare',
        'primary',
        'strong',
        'secondary',
        'outline',
        'error',
        'warning',
        'success',
        'info',
      ],
      table: {
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      description: 'Size of the button',
      control: 'select',
      options: [undefined, 'sm', 'md', 'lg'],
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    loading: {
      description: 'Shows a spinner and disables the button',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    disabled: {
      description: 'Disables interaction',
      control: 'boolean',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    onClick: {
      description: 'Callback fired when the button is clicked',
      action: 'onClick executed!',
    },
    children: {
      description: 'Button content',
      control: 'text',
    },
    className: {
      description:
        'Additional CSS classes merged onto the button (escape hatch for one-off styling)',
      control: 'text',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Highest-emphasis brand action — a deep brand fill with white text, one step
// above `primary`. On Pyre its fill is a darkened chartreuse (`brand-strong`)
// chosen so white text clears WCAG AA, which the signature bright chartreuse
// cannot. The a11y addon validates the white/fill contrast.
export const Strong: Story = {
  args: {
    variant: 'strong',
    children: 'Get started',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Bare: Story = {
  args: {
    variant: 'bare',
    children: 'Bare',
  },
};

// Status (intent) variants — solid, high-emphasis fills for definitive,
// attention-demanding actions. The a11y addon (test: 'error') validates the
// foreground/fill contrast on each in the default (dark) theme.
export const ErrorVariant: Story = {
  name: 'Error',
  args: {
    variant: 'error',
    children: 'Delete',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Archive',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Approve',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Learn more',
  },
};

// Side-by-side showcase — emphasis row + status row — for eyeballing the bolder
// labels and the solid status fills together. Toggle the theme in the toolbar to
// check both light and dark.
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Button variant='strong'>Strong</Button>
        <Button variant='primary'>Primary</Button>
        <Button variant='secondary'>Secondary</Button>
        <Button variant='outline'>Outline</Button>
        <Button variant='bare'>Bare</Button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Button variant='error'>Delete</Button>
        <Button variant='warning'>Archive</Button>
        <Button variant='success'>Approve</Button>
        <Button variant='info'>Learn more</Button>
      </div>
    </div>
  ),
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    children: 'Submitting…',
    loading: true,
  },
};

export const LoadingSmall: Story = {
  args: {
    children: 'Saving',
    loading: true,
    size: 'sm',
  },
};

export const LoadingLarge: Story = {
  args: {
    children: 'Processing',
    loading: true,
    size: 'lg',
  },
};

export const AsLink: Story = {
  args: {
    as: 'a',
    href: 'https://danieljoffe.com',
    target: '_blank',
    rel: 'noopener noreferrer',
    children: 'Visit Site',
    variant: 'primary',
  },
};

export const ClickInteraction: Story = {
  args: {
    children: 'Click me',
    onClick: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Click me' });

    await userEvent.click(button);

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const DisabledInteraction: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
    onClick: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Disabled Button' });

    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const KeyboardInteraction: Story = {
  args: {
    children: 'Press Enter',
    onClick: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Press Enter' });

    await step('Focus button via Tab', async () => {
      await userEvent.tab();
      await expect(button).toHaveFocus();
    });

    await step('Activate with Enter key', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });

    await step('Activate with Space key', async () => {
      await userEvent.keyboard(' ');
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });
  },
};
