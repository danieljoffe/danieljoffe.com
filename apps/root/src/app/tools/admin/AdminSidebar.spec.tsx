import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminSidebar from './AdminSidebar';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();
let mockPathname = '/tools/admin/jobs';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    refresh: () => mockRefresh(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => mockPathname,
}));

const originalFetch = global.fetch;

describe('AdminSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/tools/admin/jobs';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders the admin heading and nav items', () => {
    render(<AdminSidebar />);
    expect(screen.getByText('Tools Admin')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Site Audits')).toBeInTheDocument();
  });

  it('renders a sign out button', () => {
    render(<AdminSidebar />);
    expect(
      screen.getByRole('button', { name: /sign out/i })
    ).toBeInTheDocument();
  });

  it('calls logout endpoint and redirects to login on sign out click', async () => {
    render(<AdminSidebar />);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tools/logout', {
        method: 'POST',
      });
      expect(mockReplace).toHaveBeenCalledWith('/tools/login');
    });
  });
});
