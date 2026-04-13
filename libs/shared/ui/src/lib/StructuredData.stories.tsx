import type { Meta, StoryObj } from '@storybook/react-vite';
import { StructuredData } from './StructuredData';

const meta = {
  title: 'Utility/StructuredData',
  component: StructuredData,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Renders a JSON-LD `<script>` tag for structured data (SEO). The output is invisible in the DOM — inspect the page source to see it.',
      },
    },
  },
} satisfies Meta<typeof StructuredData>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Daniel Joffe',
      jobTitle: 'Software Engineer',
      url: 'https://danieljoffe.com',
    },
  },
};

export const BlogPost: Story = {
  args: {
    data: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Building Accessible Components',
      author: { '@type': 'Person', name: 'Daniel Joffe' },
      datePublished: '2025-01-15',
    },
  },
};
