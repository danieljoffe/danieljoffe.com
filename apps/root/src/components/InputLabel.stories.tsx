import type { Meta, StoryObj } from '@storybook/react';
import InputLabel from './InputLabel';

const meta = {
  component: InputLabel,
  title: 'Components/InputLabel',
  parameters: {
    layout: 'centered',
  },
  // tags: ['autodocs'],
} satisfies Meta<typeof InputLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    inputId: 'email-field',
    label: 'Email Address',
    required: false,
  },
};

export const Required: Story = {
  args: {
    inputId: 'email-field',
    label: 'Email Address',
    required: true,
  },
};

export const LongLabel: Story = {
  args: {
    inputId: 'description-field',
    label: 'First and Last Name (Required)',
    required: true,
  },
};
