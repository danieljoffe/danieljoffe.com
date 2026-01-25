import React from 'react';
import { render, screen } from '@testing-library/react';
import Container from './Container';

describe('Container', () => {
  test('renders children content', () => {
    render(
      <Container>
        <h1>Test Content</h1>
      </Container>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('renders outer container with flex and justify-center', () => {
    render(
      <Container>
        <p>Content</p>
      </Container>
    );
    const outer = screen.getByTestId('container-outer');
    expect(outer).toBeInTheDocument();
    expect(outer.className).toContain('flex');
    expect(outer.className).toContain('justify-center');
  });

  test('renders inner container with proper styling', () => {
    render(
      <Container>
        <p>Content</p>
      </Container>
    );
    const inner = screen.getByTestId('container-inner');
    expect(inner).toBeInTheDocument();
    expect(inner.className).toContain('flex');
    expect(inner.className).toContain('flex-col');
    expect(inner.className).toContain('max-w-3xl'); // UI library size='sm'
  });

  test('applies custom className to outer container', () => {
    render(
      <Container className='bg-blue-500 text-white'>
        <p>Content</p>
      </Container>
    );
    const outer = screen.getByTestId('container-outer');
    expect(outer.className).toContain('bg-blue-500');
    expect(outer.className).toContain('text-white');
  });

  test('renders without custom className', () => {
    render(
      <Container>
        <p>Content</p>
      </Container>
    );
    const outer = screen.getByTestId('container-outer');
    expect(outer.className).toContain('flex');
  });

  test('renders multiple children', () => {
    render(
      <Container>
        <h1>Title</h1>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
      </Container>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
  });
});
