import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Components/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    label: {
      description: 'Label text displayed above the textarea',
      control: 'text',
    },
    error: {
      description: 'Error message displayed below the textarea',
      control: 'text',
    },
    helperText: {
      description: 'Helper text displayed below the textarea',
      control: 'text',
    },
    placeholder: {
      description: 'Placeholder text shown when empty',
      control: 'text',
    },
    rows: {
      description: 'Number of visible text lines',
      control: 'number',
    },
    disabled: {
      description: 'Disables the textarea',
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
    rows: 4,
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Description',
    placeholder: 'Enter a description',
    rows: 4,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Bio',
    helperText: 'Maximum 500 characters',
    rows: 4,
  },
};

export const WithError: Story = {
  args: {
    label: 'Message',
    error: 'Message is required',
    rows: 4,
  },
};

export const TypingInteraction: Story = {
  args: {
    label: 'Your message',
    placeholder: 'Type here...',
    rows: 4,
    onChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox');

    await userEvent.type(textarea, 'Hello, this is a test message!');

    await expect(textarea).toHaveValue('Hello, this is a test message!');
    await expect(args.onChange).toHaveBeenCalled();
  },
};

export const FocusInteraction: Story = {
  args: {
    label: 'Focus test',
    placeholder: 'Tab to focus',
    rows: 4,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox');

    await userEvent.tab();
    await expect(textarea).toHaveFocus();
  },
};

export const ErrorAccessibility: Story = {
  args: {
    label: 'Required field',
    error: 'This field is required',
    rows: 4,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox');
    const errorMessage = canvas.getByRole('alert');

    await expect(textarea).toHaveAttribute('aria-invalid', 'true');
    await expect(textarea).toHaveAttribute('aria-describedby');
    await expect(errorMessage).toBeInTheDocument();
  },
};
