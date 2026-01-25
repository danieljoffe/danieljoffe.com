import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from '@storybook/test';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    label: {
      description: 'Label text displayed above the select',
      control: 'text',
    },
    error: {
      description: 'Error message displayed below the select',
      control: 'text',
    },
    options: {
      description: 'Array of options with value and label',
    },
    disabled: {
      description: 'Disables the select',
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

const sampleOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

export const Default: Story = {
  args: {
    options: sampleOptions,
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Country',
    options: [
      { value: 'us', label: 'United States' },
      { value: 'uk', label: 'United Kingdom' },
      { value: 'ca', label: 'Canada' },
    ],
  },
};

export const WithError: Story = {
  args: {
    label: 'Category',
    options: sampleOptions,
    error: 'Please select a category',
  },
};

export const SelectInteraction: Story = {
  args: {
    label: 'Choose an option',
    options: sampleOptions,
    onChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByRole('combobox');

    await userEvent.selectOptions(select, 'option2');

    await expect(select).toHaveValue('option2');
    await expect(args.onChange).toHaveBeenCalled();
  },
};

export const KeyboardNavigation: Story = {
  args: {
    label: 'Keyboard navigation',
    options: sampleOptions,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByRole('combobox');

    await userEvent.tab();
    await expect(select).toHaveFocus();
  },
};

export const ErrorAccessibility: Story = {
  args: {
    label: 'Invalid Selection',
    options: sampleOptions,
    error: 'Selection is required',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByRole('combobox');
    const errorMessage = canvas.getByRole('alert');

    await expect(select).toHaveAttribute('aria-invalid', 'true');
    await expect(select).toHaveAttribute('aria-describedby');
    await expect(errorMessage).toBeInTheDocument();
  },
};
