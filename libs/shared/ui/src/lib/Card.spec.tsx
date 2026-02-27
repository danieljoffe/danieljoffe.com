import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';

describe('Card', () => {
  it('renders children content', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default bg-card class', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).toHaveClass('bg-card');
  });

  it('applies elevated styles when elevated is true', () => {
    const { container } = render(<Card elevated>Content</Card>);
    expect(container.firstChild).toHaveClass(
      'bg-background-elevated',
      'shadow-md',
      'border-border-strong'
    );
  });

  it('applies default md padding', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).toHaveClass('p-6');
  });

  it('applies none padding', () => {
    const { container } = render(<Card padding='none'>Content</Card>);
    expect(container.firstChild).not.toHaveClass('p-4', 'p-6', 'p-8');
  });

  it('applies sm padding', () => {
    const { container } = render(<Card padding='sm'>Content</Card>);
    expect(container.firstChild).toHaveClass('p-4');
  });

  it('applies lg padding', () => {
    const { container } = render(<Card padding='lg'>Content</Card>);
    expect(container.firstChild).toHaveClass('p-8');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className='custom-class'>Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders with border', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).toHaveClass('border', 'border-border');
  });
});

describe('CardHeader', () => {
  it('renders children content', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('applies margin bottom', () => {
    const { container } = render(<CardHeader>Header</CardHeader>);
    expect(container.firstChild).toHaveClass('mb-4');
  });

  it('applies custom className', () => {
    const { container } = render(
      <CardHeader className='custom-class'>Header</CardHeader>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('CardTitle', () => {
  it('renders children content', () => {
    render(<CardTitle>Title content</CardTitle>);
    expect(screen.getByText('Title content')).toBeInTheDocument();
  });

  it('renders as h3 element', () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CardTitle className='custom-class'>Title</CardTitle>);
    const title = screen.getByRole('heading');
    expect(title).toHaveClass('custom-class');
  });
});

describe('CardContent', () => {
  it('renders children content', () => {
    render(<CardContent>Content text</CardContent>);
    expect(screen.getByText('Content text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CardContent className='custom-class'>Content</CardContent>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('CardFooter', () => {
  it('renders children content', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('applies flex layout styles', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    expect(container.firstChild).toHaveClass(
      'mt-4',
      'flex',
      'items-center',
      'gap-2'
    );
  });

  it('applies custom className', () => {
    const { container } = render(
      <CardFooter className='custom-class'>Footer</CardFooter>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('Card composition', () => {
  it('renders complete card with all subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
        <CardContent>Test content</CardContent>
        <CardFooter>Test footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByText('Test footer')).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('CardTitle renders as heading level 3', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Accessible Title</CardTitle>
          </CardHeader>
          <CardContent>Body</CardContent>
        </Card>
      );
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
        'Accessible Title'
      );
    });

    it('card content is visible and accessible', () => {
      render(
        <Card>
          <CardContent>Visible content</CardContent>
        </Card>
      );
      expect(screen.getByText('Visible content')).toBeVisible();
    });
  });
});
