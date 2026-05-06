import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReferenceJDList from '../ReferenceJDList';
import type { TargetReferenceJD } from '../../types';

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// AddReferenceJDModal renders nothing when closed; replace with a stub to keep
// the spec focused on the list itself and avoid pulling in modal internals.
jest.mock('../AddReferenceJDModal', () => ({
  __esModule: true,
  default: () => null,
}));

const SAMPLE_JD: TargetReferenceJD = {
  id: 'jd-1',
  target_id: 't-1',
  jd_url: 'https://example.com/jd',
  jd_text: 'A long job description text snippet for the role.',
  extracted_profile: {
    categories: {},
    seniority: { level: null, signals: [] },
    domain: { signals: [], weight: 0.5 },
    negative: { keywords: [], weight: -10 },
  },
  created_at: '2026-04-30T00:00:00Z',
};

const originalFetch = global.fetch;
const originalConfirm = window.confirm;

beforeEach(() => {
  mockToast.mockReset();
  global.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  window.confirm = originalConfirm;
});

describe('ReferenceJDList', () => {
  it('shows an empty state when no reference JDs exist', () => {
    render(
      <ReferenceJDList
        targetId='t-1'
        referenceJDs={[]}
        onChanged={() => undefined}
      />
    );
    expect(screen.getByText(/No reference JDs yet/i)).toBeInTheDocument();
  });

  it('renders one row per reference JD with the count in the title', () => {
    render(
      <ReferenceJDList
        targetId='t-1'
        referenceJDs={[SAMPLE_JD, { ...SAMPLE_JD, id: 'jd-2' }]}
        onChanged={() => undefined}
      />
    );
    expect(screen.getByText(/Reference JDs \(2\)/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText('Delete reference JD')).toHaveLength(2);
  });

  it('asks for confirmation before deleting and aborts when cancelled', async () => {
    const onChanged = jest.fn();
    window.confirm = jest.fn().mockReturnValue(false);
    const user = userEvent.setup();

    render(
      <ReferenceJDList
        targetId='t-1'
        referenceJDs={[SAMPLE_JD]}
        onChanged={onChanged}
      />
    );
    await user.click(screen.getByLabelText('Delete reference JD'));
    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('deletes the JD and notifies onChanged when confirmed', async () => {
    const onChanged = jest.fn();
    window.confirm = jest.fn().mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true } as Response);
    const user = userEvent.setup();

    render(
      <ReferenceJDList
        targetId='t-1'
        referenceJDs={[SAMPLE_JD]}
        onChanged={onChanged}
      />
    );
    await user.click(screen.getByLabelText('Delete reference JD'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/targets/t-1/reference-jds/jd-1',
        { method: 'DELETE' }
      );
      expect(onChanged).toHaveBeenCalled();
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' })
    );
  });

  it('toasts an error when delete fails', async () => {
    const onChanged = jest.fn();
    window.confirm = jest.fn().mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false } as Response);
    const user = userEvent.setup();

    render(
      <ReferenceJDList
        targetId='t-1'
        referenceJDs={[SAMPLE_JD]}
        onChanged={onChanged}
      />
    );
    await user.click(screen.getByLabelText('Delete reference JD'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' })
      );
    });
    expect(onChanged).not.toHaveBeenCalled();
  });
});
