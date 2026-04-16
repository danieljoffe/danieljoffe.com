import { render, screen, fireEvent, act } from '@testing-library/react';
import JobsFilter from './JobsFilter';
import type { JobsFilterState } from './types';

const defaultFilters: JobsFilterState = {
  minScore: '30',
  status: '',
  company: '',
  search: '',
};

describe('JobsFilter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the min-score, status, and search inputs', () => {
    render(<JobsFilter filters={defaultFilters} onChange={jest.fn()} />);
    expect(screen.getByText('Min Score')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onChange immediately when min-score changes', () => {
    const onChange = jest.fn();
    render(<JobsFilter filters={defaultFilters} onChange={onChange} />);
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '50' },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...defaultFilters,
      minScore: '50',
    });
  });

  it('calls onChange immediately when status changes', () => {
    const onChange = jest.fn();
    render(<JobsFilter filters={defaultFilters} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'saved' },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...defaultFilters,
      status: 'saved',
    });
  });

  it('debounces search input by 300ms', () => {
    const onChange = jest.fn();
    render(<JobsFilter filters={defaultFilters} onChange={onChange} />);
    const input = screen.getByPlaceholderText(/search titles/i);
    fireEvent.change(input, { target: { value: 'react' } });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledWith({
      ...defaultFilters,
      search: 'react',
    });
  });
});
