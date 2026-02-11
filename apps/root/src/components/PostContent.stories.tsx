import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PostContent from './PostContent';

const meta = {
  component: PostContent,
  title: 'Components/PostContent',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    children: {
      description: 'Prose-styled content to render inside the container',
    },
  },
} satisfies Meta<typeof PostContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <h1>Article Title</h1>
        <p>
          This is the introduction paragraph that sets the context for the
          article content. It provides an overview of what the reader can expect
          to learn.
        </p>
        <h2>Getting Started</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <h3>Prerequisites</h3>
        <ul>
          <li>Basic understanding of HTML</li>
          <li>Familiarity with CSS</li>
          <li>JavaScript knowledge</li>
        </ul>
      </>
    ),
  },
};

export const CodeExample: Story = {
  args: {
    children: (
      <>
        <h1>Code Tutorial</h1>
        <p>Here is an example of a simple function:</p>
        <pre>
          <code>{`function greet(name) {
  return \`Hello, \${name}!\`;
}`}</code>
        </pre>
        <p>This function takes a name parameter and returns a greeting.</p>
      </>
    ),
  },
};

export const RichContent: Story = {
  args: {
    children: (
      <>
        <h1>Rich Content Example</h1>
        <p>
          This demonstrates various prose elements styled with the Tailwind
          typography plugin.
        </p>
        <blockquote>
          This is a blockquote that highlights an important statement or quote
          from the article.
        </blockquote>
        <h2>Key Points</h2>
        <ol>
          <li>First important point</li>
          <li>Second important point</li>
          <li>Third important point</li>
        </ol>
        <p>
          You can also include <strong>bold text</strong> and{' '}
          <em>italic text</em> for emphasis.
        </p>
      </>
    ),
  },
};
