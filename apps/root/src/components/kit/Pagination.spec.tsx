import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('returns null when there is only one page', () => {
    const { container } = render(
      <Pagination
        page={1}
        totalPages={1}
        onPageChange={jest.fn()}
        namePrefix='jobs'
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders Previous/Next buttons and the page counter text', () => {
    render(
      <Pagination
        page={2}
        totalPages={5}
        onPageChange={jest.fn()}
        namePrefix='jobs'
      />
    );
    expect(
      screen.getByRole('button', { name: 'Previous' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    const { rerender } = render(
      <Pagination
        page={1}
        totalPages={3}
        onPageChange={jest.fn()}
        namePrefix='jobs'
      />
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();

    rerender(
      <Pagination
        page={3}
        totalPages={3}
        onPageChange={jest.fn()}
        namePrefix='jobs'
      />
    );
    expect(screen.getByRole('button', { name: 'Previous' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('invokes onPageChange with the neighbouring page number when clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    render(
      <Pagination
        page={2}
        totalPages={5}
        onPageChange={onPageChange}
        namePrefix='jobs'
      />
    );

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
