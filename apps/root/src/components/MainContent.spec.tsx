import { render, screen } from '@testing-library/react';
import MainContent from './MainContent';

describe('MainContent', () => {
  it('renders a <main> element with id="main-content"', () => {
    render(<MainContent>Hello</MainContent>);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('renders children', () => {
    render(
      <MainContent>
        <p>Page content</p>
      </MainContent>
    );
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });
});
