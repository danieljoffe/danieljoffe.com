import { render, screen } from '@testing-library/react';
import { PageContainer } from './PageContainer';

describe('PageContainer', () => {
  it('renders children', () => {
    render(<PageContainer>Page Content</PageContainer>);
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('renders outer wrapper with flex centering', () => {
    render(<PageContainer>Content</PageContainer>);
    const outer = screen.getByTestId('page-container-outer');
    expect(outer).toHaveClass('flex', 'justify-center');
  });

  it('renders inner container', () => {
    render(<PageContainer>Content</PageContainer>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toBeInTheDocument();
  });

  it('applies default size (sm)', () => {
    render(<PageContainer>Content</PageContainer>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('max-w-3xl');
  });

  it('applies md size', () => {
    render(<PageContainer size='md'>Content</PageContainer>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('max-w-4xl');
  });

  it('applies lg size', () => {
    render(<PageContainer size='lg'>Content</PageContainer>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('max-w-5xl');
  });

  it('applies xl size', () => {
    render(<PageContainer size='xl'>Content</PageContainer>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('max-w-6xl');
  });

  it('applies 2xl size', () => {
    render(<PageContainer size='2xl'>Content</PageContainer>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('max-w-7xl');
  });

  it('applies full size', () => {
    render(<PageContainer size='full'>Content</PageContainer>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('max-w-full');
  });

  it('applies vertical padding and flex column layout', () => {
    render(<PageContainer>Content</PageContainer>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('flex', 'flex-col', 'py-8');
  });

  it('applies responsive padding', () => {
    render(<PageContainer>Content</PageContainer>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('md:py-14');
  });

  it('applies custom wrapperClassName', () => {
    render(
      <PageContainer wrapperClassName='bg-red-500'>Content</PageContainer>
    );
    const outer = screen.getByTestId('page-container-outer');
    expect(outer).toHaveClass('bg-red-500');
  });

  it('applies custom className to inner container', () => {
    render(<PageContainer className='custom-class'>Content</PageContainer>);
    const inner = screen.getByTestId('page-container-inner');
    expect(inner).toHaveClass('custom-class');
  });

  it('passes additional props to outer wrapper', () => {
    render(<PageContainer id='main-content'>Content</PageContainer>);
    const outer = screen.getByTestId('page-container-outer');
    expect(outer).toHaveAttribute('id', 'main-content');
  });

  it('renders as div by default', () => {
    render(<PageContainer>Content</PageContainer>);
    const outer = screen.getByTestId('page-container-outer');
    expect(outer.tagName).toBe('DIV');
  });

  it('renders as main when as="main"', () => {
    render(<PageContainer as='main'>Content</PageContainer>);
    const outer = screen.getByTestId('page-container-outer');
    expect(outer.tagName).toBe('MAIN');
  });

  it('renders as section when as="section"', () => {
    render(<PageContainer as='section'>Content</PageContainer>);
    const outer = screen.getByTestId('page-container-outer');
    expect(outer.tagName).toBe('SECTION');
  });
});
