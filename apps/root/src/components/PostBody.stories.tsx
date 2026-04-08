import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import PostBody from './PostBody';

const mockCover = {
  src: '/photo-1506905925346-21bda4d32df4' as const,
  alt: 'Aerial photo of foggy mountains',
  origin:
    'https://unsplash.com/photos/aerial-photo-of-foggy-mountains-1527pjeb6jg' as const,
  creator: '@samferrara' as const,
};

const meta = {
  component: PostBody,
  title: 'Components/PostBody',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/projects/sample-project',
      },
    },
  },
  argTypes: {
    cover: {
      description: 'Unsplash image metadata for the cover photo',
    },
    breadcrumbs: {
      description: 'Navigation breadcrumb links',
    },
    children: {
      description: 'Prose-styled page content',
    },
  },
} satisfies Meta<typeof PostBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    cover: mockCover,
    title: 'Sample Project',
    date: '2024-06-15',
    tags: ['React', 'TypeScript', 'Next.js'],
    readingTime: 8,
    breadcrumbs: [
      { href: '/', label: 'Home' },
      { href: '/projects', label: 'Projects' },
      { href: '/projects/sample-project', label: 'Sample Project' },
    ],
    children: (
      <>
        <h1>Sample Project</h1>
        <p>
          This is a sample project that demonstrates the PostBody component. It
          includes a cover image, breadcrumb navigation, and prose-styled
          content.
        </p>
        <h2>Features</h2>
        <ul>
          <li>Responsive cover image with Unsplash attribution</li>
          <li>Breadcrumb navigation</li>
          <li>Typography-styled content area</li>
        </ul>
        <h2>Implementation Details</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris.
        </p>
      </>
    ),
  },
};

export const ExperiencePage: Story = {
  args: {
    cover: mockCover,
    title: 'Software Engineer at Tech Company',
    date: '2022-03-01',
    tags: ['React', 'Node.js', 'Microservices'],
    readingTime: 12,
    breadcrumbs: [
      { href: '/', label: 'Home' },
      { href: '/experience', label: 'Experience' },
      { href: '/experience/tech-company', label: 'Tech Company' },
    ],
    children: (
      <>
        <h1>Software Engineer at Tech Company</h1>
        <p>
          Worked on building scalable web applications using modern
          technologies.
        </p>
        <h2>Responsibilities</h2>
        <ul>
          <li>Developed frontend features using React and TypeScript</li>
          <li>Built RESTful APIs with Node.js</li>
          <li>Collaborated with cross-functional teams</li>
        </ul>
        <h2>Achievements</h2>
        <p>
          Led the migration of legacy systems to a modern microservices
          architecture.
        </p>
      </>
    ),
  },
};

export const ShortBreadcrumbs: Story = {
  args: {
    cover: mockCover,
    title: 'Quick Project',
    date: '2024-01-10',
    tags: [],
    readingTime: 3,
    breadcrumbs: [
      { href: '/projects', label: 'Projects' },
      { href: '/projects/quick-project', label: 'Quick Project' },
    ],
    children: (
      <>
        <h1>Quick Project</h1>
        <p>A simple project with minimal breadcrumb navigation.</p>
      </>
    ),
  },
};
