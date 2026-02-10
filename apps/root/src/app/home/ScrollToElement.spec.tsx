import { render } from '@testing-library/react';

const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

import ScrollToElement from './ScrollToElement';

describe('ScrollToElement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  it('renders nothing (returns null)', () => {
    const { container } = render(<ScrollToElement />);
    expect(container.innerHTML).toBe('');
  });

  it('calls scrollIntoView when scrollTo param is present', () => {
    const scrollIntoViewMock = jest.fn();
    const targetElement = document.createElement('div');
    targetElement.id = 'contact-form';
    targetElement.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(targetElement);

    mockGet.mockReturnValue('contact-form');

    render(<ScrollToElement />);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });

    document.body.removeChild(targetElement);
  });

  it('does not call scrollIntoView when scrollTo param is missing', () => {
    const scrollIntoViewMock = jest.fn();
    const targetElement = document.createElement('div');
    targetElement.id = 'contact-form';
    targetElement.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(targetElement);

    mockGet.mockReturnValue(null);

    render(<ScrollToElement />);
    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    document.body.removeChild(targetElement);
  });

  it('does not throw when target element does not exist', () => {
    mockGet.mockReturnValue('nonexistent');
    expect(() => render(<ScrollToElement />)).not.toThrow();
  });
});
