import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from './Text';

const meta = {
  title: 'Typography/Text',
  component: Text,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      description: 'Visual style and default semantic element',
      control: 'select',
      options: [
        'body',
        'bodyLg',
        'subtitle',
        'cardDescription',
        'detail',
        'label',
        'meta',
        'caption',
        'helper',
        'error',
      ],
    },
    as: {
      description: 'Override the rendered HTML element',
      control: 'select',
      options: [undefined, 'p', 'span', 'div', 'label'],
      table: {
        defaultValue: { summary: 'auto (based on variant)' },
      },
    },
    children: {
      description: 'Text content',
      control: 'text',
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {
  args: {
    variant: 'body',
    children: 'Body text with standard sizing and secondary color.',
  },
};

export const BodyLg: Story = {
  args: {
    variant: 'bodyLg',
    children: 'Large body text for prominent paragraphs.',
  },
};

export const Subtitle: Story = {
  args: {
    variant: 'subtitle',
    children: 'Subtitle text for section introductions.',
  },
};

export const CardDescription: Story = {
  args: {
    variant: 'cardDescription',
    children: 'Card description text for summaries within cards.',
  },
};

export const Detail: Story = {
  args: {
    variant: 'detail',
    children: 'Detail text for fine print and small annotations.',
  },
};

export const Label: Story = {
  args: {
    variant: 'label',
    children: 'Label text',
  },
};

export const Meta: Story = {
  args: {
    variant: 'meta',
    children: 'Meta text for dates, authors, and metadata.',
  },
};

export const Caption: Story = {
  args: {
    variant: 'caption',
    children: 'Caption text for images and supporting content.',
  },
};

export const Helper: Story = {
  args: {
    variant: 'helper',
    children: 'Helper text for form field hints.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'Error text for validation messages.',
  },
};

export const AsOverride: Story = {
  args: {
    variant: 'body',
    as: 'span',
    children: 'Body variant rendered as an inline span.',
  },
};
