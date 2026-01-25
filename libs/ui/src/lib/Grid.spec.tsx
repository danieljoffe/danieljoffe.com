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
    expect(container.firstChild).toHaveClass('grid-cols-1');
  });

  it('applies 3 columns', () => {
    const { container } = render(
      <Grid cols={3}>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('grid-cols-1');
  });

  it('applies 4 columns', () => {
    const { container } = render(
      <Grid cols={4}>
        <div>Child</div>
      </Grid>
    );
    expect(container.firstChild).toHaveClass('grid-cols-1');
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

  it('applies default colSpan (1)', () => {
    const { container } = render(<GridItem>Content</GridItem>);
    expect(container.firstChild).toHaveClass('col-span-1');
  });

  it('applies colSpan 2', () => {
    const { container } = render(<GridItem colSpan={2}>Content</GridItem>);
    expect(container.firstChild).toHaveClass('col-span-1');
  });

  it('applies colSpan 6', () => {
    const { container } = render(<GridItem colSpan={6}>Content</GridItem>);
    expect(container.firstChild).toHaveClass('col-span-2');
  });

  it('applies colSpan 12 (full width)', () => {
    const { container } = render(<GridItem colSpan={12}>Content</GridItem>);
    expect(container.firstChild).toHaveClass('col-span-full');
  });

  it('applies custom className', () => {
    const { container } = render(
      <GridItem className='custom-item'>Content</GridItem>
    );
    expect(container.firstChild).toHaveClass('custom-item');
  });
});
