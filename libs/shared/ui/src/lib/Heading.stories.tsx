import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading } from './Heading';

const meta = {
  title: 'Typography/Heading',
  component: Heading,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      description: 'Visual style and default semantic element',
      control: 'select',
      options: [
        'hero',
        'detail',
        'subtitle',
        'section',
        'sectionLabel',
        'cardTitle',
        'component',
        'mdxH1',
        'mdxH2',
        'mdxH3',
        'mdxH4',
      ],
    },
    as: {
      description: 'Override the rendered HTML element',
      control: 'select',
      options: [undefined, 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'],
      table: {
        defaultValue: { summary: 'auto (based on variant)' },
      },
    },
    children: {
      description: 'Heading text content',
      control: 'text',
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hero: Story = {
  args: {
    variant: 'hero',
    children: 'Hero Heading',
  },
};

export const Detail: Story = {
  args: {
    variant: 'detail',
    children: 'Detail Heading',
  },
};

export const Subtitle: Story = {
  args: {
    variant: 'subtitle',
    children: 'Subtitle Heading',
  },
};

export const Section: Story = {
  args: {
    variant: 'section',
    children: 'Section Heading',
  },
};

export const SectionLabel: Story = {
  args: {
    variant: 'sectionLabel',
    children: 'Section Label',
  },
};

export const CardTitle: Story = {
  args: {
    variant: 'cardTitle',
    children: 'Card Title Heading',
  },
};

export const Component: Story = {
  args: {
    variant: 'component',
    children: 'Component Heading',
  },
};

export const MdxH1: Story = {
  args: {
    variant: 'mdxH1',
    children: 'MDX H1 Heading',
  },
};

export const MdxH2: Story = {
  args: {
    variant: 'mdxH2',
    children: 'MDX H2 Heading',
  },
};

export const MdxH3: Story = {
  args: {
    variant: 'mdxH3',
    children: 'MDX H3 Heading',
  },
};

export const MdxH4: Story = {
  args: {
    variant: 'mdxH4',
    children: 'MDX H4 Heading',
  },
};

export const AsOverride: Story = {
  args: {
    variant: 'hero',
    as: 'h3',
    children: 'Hero variant rendered as h3',
  },
};
