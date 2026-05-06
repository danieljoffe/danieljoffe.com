import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoringProfileEditor from '../ScoringProfileEditor';
import { emptyScoringProfile, type JobTarget } from '../../types';

const mockToast = jest.fn();
jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

function makeTarget(): JobTarget {
  return {
    id: 't-1',
    label: 'Senior FE',
    description: null,
    normalized_label: null,
    scoring_profile: {
      ...emptyScoringProfile(),
      categories: {
        frontend: { keywords: { react: 2 }, weight: 1.0 },
      },
    },
    search_keywords: [],
    activation_status: 'ready',
    profile_version: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-30T00:00:00Z',
  };
}

const originalFetch = global.fetch;
beforeEach(() => {
  mockToast.mockReset();
  global.fetch = jest.fn() as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
});

describe('ScoringProfileEditor', () => {
  it('renders the existing categories and keywords', () => {
    render(
      <ScoringProfileEditor target={makeTarget()} onSaved={() => undefined} />
    );
    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('hides the save bar when the profile is unchanged', () => {
    render(
      <ScoringProfileEditor target={makeTarget()} onSaved={() => undefined} />
    );
    expect(screen.queryByText(/Unsaved changes/i)).toBeNull();
  });

  it('reveals the save bar after a category weight change', async () => {
    const user = userEvent.setup();
    render(
      <ScoringProfileEditor target={makeTarget()} onSaved={() => undefined} />
    );

    const weightInput = screen.getByLabelText(
      /Weight for frontend category/i
    ) as HTMLInputElement;
    await user.clear(weightInput);
    await user.type(weightInput, '2.5');

    await waitFor(() => {
      expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();
    });
  });

  it('adds a new keyword on Enter', async () => {
    const user = userEvent.setup();
    render(
      <ScoringProfileEditor target={makeTarget()} onSaved={() => undefined} />
    );

    const addInput = screen.getByLabelText('Add keyword to frontend');
    await user.type(addInput, 'typescript{Enter}');

    await waitFor(() => {
      expect(screen.getByText('typescript')).toBeInTheDocument();
    });
  });

  it('saves the profile via PATCH /api/targets/<id> and notifies onSaved on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true } as Response);
    const onSaved = jest.fn();
    const user = userEvent.setup();

    render(<ScoringProfileEditor target={makeTarget()} onSaved={onSaved} />);

    // Trigger isDirty by changing the domain weight.
    const domainWeight = screen.getByLabelText(
      'Domain weight'
    ) as HTMLInputElement;
    await user.clear(domainWeight);
    await user.type(domainWeight, '0.7');

    const saveBtn = await screen.findByRole('button', { name: /^Save$/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/targets/t-1',
        expect.objectContaining({ method: 'PATCH' })
      );
      expect(onSaved).toHaveBeenCalled();
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' })
    );
  });
});
