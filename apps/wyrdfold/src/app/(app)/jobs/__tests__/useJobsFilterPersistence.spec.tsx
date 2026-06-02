import { renderHook } from '@testing-library/react';

import type { JobsFilterState } from '../types';
import { useJobsFilterPersistence } from '../useJobsFilterPersistence';

const EMPTY: JobsFilterState = {
  search: '',
  status: '',
  minScore: '',
  excludeLocations: '',
  onlyLocations: '',
};

const POPULATED: JobsFilterState = {
  search: 'react',
  status: 'new',
  minScore: '60',
  excludeLocations: 'UK',
  onlyLocations: 'US',
};

describe('useJobsFilterPersistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips a populated snapshot keyed by target', () => {
    const { result } = renderHook(() => useJobsFilterPersistence());
    result.current.write('target-1', POPULATED);

    expect(result.current.read('target-1')).toEqual(POPULATED);
  });

  it('uses the __all__ sentinel for undefined targets', () => {
    const { result } = renderHook(() => useJobsFilterPersistence());
    result.current.write(undefined, POPULATED);

    // Snapshot stored under the All Jobs key, isolated from per-target entries.
    expect(window.localStorage.getItem('wyrdfold.filters.__all__')).toContain(
      'react'
    );
    expect(result.current.read('target-1')).toBeNull();
    expect(result.current.read(undefined)).toEqual(POPULATED);
  });

  it('returns null for a missing target', () => {
    const { result } = renderHook(() => useJobsFilterPersistence());

    expect(result.current.read('never-seen')).toBeNull();
  });

  it('returns null when the stored snapshot has no populated fields', () => {
    // Defensive: a stale "all empty" entry shouldn't trigger a restore
    // that overwrites a deep link with nothing.
    window.localStorage.setItem('wyrdfold.filters.t', JSON.stringify(EMPTY));
    const { result } = renderHook(() => useJobsFilterPersistence());

    expect(result.current.read('t')).toBeNull();
  });

  it('write removes the entry when all fields are empty', () => {
    window.localStorage.setItem(
      'wyrdfold.filters.t',
      JSON.stringify(POPULATED)
    );
    const { result } = renderHook(() => useJobsFilterPersistence());
    result.current.write('t', EMPTY);

    // Clearing all filters should NOT leave a stale snapshot that
    // re-applies on the next visit.
    expect(window.localStorage.getItem('wyrdfold.filters.t')).toBeNull();
  });

  it('survives malformed JSON in storage', () => {
    window.localStorage.setItem('wyrdfold.filters.t', '{not valid json');
    const { result } = renderHook(() => useJobsFilterPersistence());

    expect(result.current.read('t')).toBeNull();
  });

  it('drops non-string fields on read (forward-compat)', () => {
    // A future version could store a number / array / object for a
    // field we haven't taught the coerce step about — fall through to
    // empty string for that field rather than throwing.
    window.localStorage.setItem(
      'wyrdfold.filters.t',
      JSON.stringify({
        search: 'react',
        status: 42, // wrong type
        minScore: ['junk'], // wrong type
        excludeLocations: 'UK',
        onlyLocations: 'US',
      })
    );
    const { result } = renderHook(() => useJobsFilterPersistence());

    expect(result.current.read('t')).toEqual({
      search: 'react',
      status: '',
      minScore: '',
      excludeLocations: 'UK',
      onlyLocations: 'US',
    });
  });

  it('clear removes the entry', () => {
    const { result } = renderHook(() => useJobsFilterPersistence());
    result.current.write('t', POPULATED);
    result.current.clear('t');

    expect(result.current.read('t')).toBeNull();
  });
});
