import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Pagination } from './Pagination';

expect.extend(toHaveNoViolations);

describe('Pagination', () => {
  it('renders page buttons for small total', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('highlights current page', () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={jest.fn()} />
    );
    expect(screen.getByText('3')).toHaveClass('bg-brand-600');
  });

  it('calls onPageChange when page button is clicked', () => {
    const onPageChange = jest.fn();
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByText('3'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with next page on next button click', () => {
    const onPageChange = jest.fn();
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with previous page on prev button click', () => {
    const onPageChange = jest.fn();
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />
    );
    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables prev button on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />
    );
    const prevButton = screen.getByLabelText('Previous page');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={jest.fn()} />
    );
    const nextButton = screen.getByLabelText('Next page');
    expect(nextButton).toBeDisabled();
  });

  it('shows ellipsis for large page counts', () => {
    render(
      <Pagination currentPage={5} totalPages={20} onPageChange={jest.fn()} />
    );
    const dots = screen.getAllByText('...');
    expect(dots.length).toBeGreaterThanOrEqual(1);
  });

  it('renders all pages when totalPages <= 7', () => {
    render(
      <Pagination currentPage={1} totalPages={7} onPageChange={jest.fn()} />
    );
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  // --- focus-visible styles ---

  it('applies focus-visible ring classes on page buttons', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />
    );
    const pageButton = screen.getByText('1');
    expect(pageButton.className).toContain('focus-visible:ring-2');
  });

  it('applies focus-visible ring classes on prev/next buttons', () => {
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={jest.fn()} />
    );
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0];
    const nextButton = buttons[buttons.length - 1];
    expect(prevButton.className).toContain('focus-visible:ring-2');
    expect(nextButton.className).toContain('focus-visible:ring-2');
  });

  it('applies custom className', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={jest.fn()}
        className='custom-class'
      />
    );
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('custom-class');
  });

  describe('sizes', () => {
    it('applies md size by default', () => {
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />
      );
      const pageButton = screen.getByText('1');
      expect(pageButton).toHaveClass('h-8', 'min-w-8');
    });

    it('applies sm size styles', () => {
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={jest.fn()}
          size='sm'
        />
      );
      const pageButton = screen.getByText('1');
      expect(pageButton).toHaveClass('h-6', 'min-w-6');
    });

    it('applies lg size styles', () => {
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={jest.fn()}
          size='lg'
        />
      );
      const pageButton = screen.getByText('1');
      expect(pageButton).toHaveClass('h-10', 'min-w-10');
    });
  });

  describe('aria attributes', () => {
    it('adds aria-label to nav element', () => {
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />
      );
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Pagination');
    });

    it('supports custom ariaLabel prop', () => {
      render(
        <Pagination
          currentPage={1}
          totalPages={5}
          onPageChange={jest.fn()}
          ariaLabel='Results pagination'
        />
      );
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Results pagination');
    });

    it('adds aria-current="page" to the active page button', () => {
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={jest.fn()} />
      );
      const activeButton = screen.getByLabelText('Page 3');
      expect(activeButton).toHaveAttribute('aria-current', 'page');
    });

    it('does not add aria-current to non-active page buttons', () => {
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={jest.fn()} />
      );
      const otherButton = screen.getByLabelText('Go to page 1');
      expect(otherButton).not.toHaveAttribute('aria-current');
    });

    it('adds descriptive aria-labels to page buttons', () => {
      render(
        <Pagination currentPage={2} totalPages={5} onPageChange={jest.fn()} />
      );
      expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to page 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to page 3')).toBeInTheDocument();
    });

    it('adds aria-label to prev and next buttons', () => {
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={jest.fn()} />
      );
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('uses native disabled (no redundant aria-disabled) on the prev button on first page', () => {
      render(
        <Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />
      );
      const prevButton = screen.getByLabelText('Previous page');
      expect(prevButton).toBeDisabled();
      expect(prevButton).not.toHaveAttribute('aria-disabled');
    });

    it('uses native disabled (no redundant aria-disabled) on the next button on last page', () => {
      render(
        <Pagination currentPage={5} totalPages={5} onPageChange={jest.fn()} />
      );
      const nextButton = screen.getByLabelText('Next page');
      expect(nextButton).toBeDisabled();
      expect(nextButton).not.toHaveAttribute('aria-disabled');
    });

    it('does not add aria-disabled when buttons are enabled', () => {
      render(
        <Pagination currentPage={3} totalPages={5} onPageChange={jest.fn()} />
      );
      const prevButton = screen.getByLabelText('Previous page');
      const nextButton = screen.getByLabelText('Next page');
      expect(prevButton).not.toHaveAttribute('aria-disabled');
      expect(nextButton).not.toHaveAttribute('aria-disabled');
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={5} onPageChange={jest.fn()} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
