import { render, screen, fireEvent } from '@testing-library/react';
import JobsDashboard from './JobsDashboard';

// Keep child components simple and deterministic
jest.mock('./JobsTable', () => ({
  __esModule: true,
  default: () => <div data-testid='jobs-table' />,
}));

jest.mock('./ScanButton', () => ({
  __esModule: true,
  default: () => <button type='button'>Scan now</button>,
}));

jest.mock('./SourcesPanel', () => ({
  __esModule: true,
  default: () => <div data-testid='sources-panel'>Sources Panel</div>,
}));

jest.mock('./JobsFilter', () => ({
  __esModule: true,
  default: () => <div data-testid='jobs-filter' />,
}));

describe('JobsDashboard', () => {
  it('renders Jobs tab content by default', () => {
    render(<JobsDashboard />);
    expect(
      screen.getByRole('heading', { name: /job search/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('jobs-table')).toBeInTheDocument();
    expect(screen.getByTestId('jobs-filter')).toBeInTheDocument();
  });

  it('switches to Sources tab when clicked', () => {
    render(<JobsDashboard />);
    fireEvent.click(screen.getByRole('tab', { name: /sources/i }));
    expect(screen.getByTestId('sources-panel')).toBeInTheDocument();
  });
});
