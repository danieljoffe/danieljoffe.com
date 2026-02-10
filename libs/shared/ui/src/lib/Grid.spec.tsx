import { render, screen } from '@testing-library/react';
import { Grid, GridItem } from './Grid';

describe('Grid', () => {
  it('renders children', () => {
    render(
      <Grid>
        <div>Child 1</div>
        <div>Child 2</div>
      </Grid>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('applies grid class', () => {
    const { container } = render(
      <Grid>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('grid');
  });

  it('renders as div by default', () => {
    const { container } = render(
      <Grid>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('renders as ul when as="ul"', () => {
    const { container } = render(
      <Grid as='ul'>
        <li>Item 1</li>
        <li>Item 2</li>
      </Grid>
    );
    expect(container.firstChild?.nodeName).toBe('UL');
    expect(container.firstChild).toHaveClass('grid');
  });

  it('renders as ol when as="ol"', () => {
    const { container } = render(
      <Grid as='ol'>
        <li>Item 1</li>
        <li>Item 2</li>
      </Grid>
    );
    expect(container.firstChild?.nodeName).toBe('OL');
    expect(container.firstChild).toHaveClass('grid');
  });

  it('renders as section when as="section"', () => {
    const { container } = render(
      <Grid as='section'>
        <div>Content</div>
      </Grid>
    );
    expect(container.firstChild?.nodeName).toBe('SECTION');
  });

  it('passes through additional HTML attributes', () => {
    render(
      <Grid as='ul' aria-label='Item list' data-testid='grid-list'>
        <li>Item</li>
      </Grid>
    );
    const list = screen.getByTestId('grid-list');
    expect(list).toHaveAttribute('aria-label', 'Item list');
  });

  it('applies default cols (12)', () => {
    const { container } = render(
      <Grid>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('grid-cols-4');
  });

  it('applies 1 column', () => {
    const { container } = render(
      <Grid cols={1}>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('grid-cols-1');
  });

  it('applies 2 columns', () => {
    const { container } = render(
      <Grid cols={2}>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
  });

  it('applies 3 columns', () => {
    const { container } = render(
      <Grid cols={3}>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('grid-cols-1', 'lg:grid-cols-3');
  });

  it('applies 4 columns', () => {
    const { container } = render(
      <Grid cols={4}>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('grid-cols-1', 'lg:grid-cols-4');
  });

  it('applies default gap (md)', () => {
    const { container } = render(
      <Grid>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('gap-4');
  });

  it('applies no gap', () => {
    const { container } = render(
      <Grid gap='none'>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('gap-0');
  });

  it('applies sm gap', () => {
    const { container } = render(
      <Grid gap='sm'>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('gap-2');
  });

  it('applies lg gap', () => {
    const { container } = render(
      <Grid gap='lg'>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('gap-6');
  });

  it('applies xl gap', () => {
    const { container } = render(
      <Grid gap='xl'>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('gap-8');
  });

  it('applies 6 columns', () => {
    const { container } = render(
      <Grid cols={6}>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass(
      'grid-cols-2',
      'sm:grid-cols-3',
      'lg:grid-cols-6'
    );
  });

  it('applies 0 columns (no grid-cols class)', () => {
    const { container } = render(
      <Grid cols={0}>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('grid');
    expect(container.firstChild).not.toHaveClass('grid-cols-1');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Grid className='custom-class'>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('GridItem', () => {
  it('renders children', () => {
    render(<GridItem>Item Content</GridItem>);
    expect(screen.getByText('Item Content')).toBeInTheDocument();
  });

  it('renders as div by default', () => {
    const { container } = render(<GridItem>Content</GridItem>);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('renders as li when as="li"', () => {
    const { container } = render(<GridItem as='li'>Content</GridItem>);
    expect(container.firstChild?.nodeName).toBe('LI');
  });

  it('renders as article when as="article"', () => {
    const { container } = render(<GridItem as='article'>Content</GridItem>);
    expect(container.firstChild?.nodeName).toBe('ARTICLE');
  });

  it('passes through additional HTML attributes', () => {
    render(
      <GridItem as='li' data-testid='grid-item' aria-label='List item'>
        Content
      </GridItem>
    );
    const item = screen.getByTestId('grid-item');
    expect(item).toHaveAttribute('aria-label', 'List item');
  });

  it('applies default colSpan (1)', () => {
    const { container } = render(<GridItem>Content</GridItem>);
    expect(container.firstChild).toHaveClass('col-span-1');
  });

  it('applies colSpan 2', () => {
    const { container } = render(<GridItem colSpan={2}>Content</GridItem>);
    expect(container.firstChild).toHaveClass('col-span-1', 'sm:col-span-2');
  });

  it('applies colSpan 6', () => {
    const { container } = render(<GridItem colSpan={6}>Content</GridItem>);
    expect(container.firstChild).toHaveClass('col-span-2', 'lg:col-span-6');
  });

  it('applies colSpan 12 (full width)', () => {
    const { container } = render(<GridItem colSpan={12}>Content</GridItem>);
    expect(container.firstChild).toHaveClass('col-span-full');
  });

  it('applies colSpan 3', () => {
    const { container } = render(<GridItem colSpan={3}>Content</GridItem>);
    expect(container.firstChild).toHaveClass(
      'col-span-1',
      'sm:col-span-2',
      'lg:col-span-3'
    );
  });

  it('applies colSpan 4', () => {
    const { container } = render(<GridItem colSpan={4}>Content</GridItem>);
    expect(container.firstChild).toHaveClass(
      'col-span-1',
      'sm:col-span-2',
      'lg:col-span-4'
    );
  });

  it('applies custom className', () => {
    const { container } = render(
      <GridItem className='custom-item'>Content</GridItem>
    );
    expect(container.firstChild).toHaveClass('custom-item');
  });
});
