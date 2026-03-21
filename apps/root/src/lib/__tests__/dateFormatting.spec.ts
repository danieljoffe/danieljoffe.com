import { formatDate } from '../dateFormatting';

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    // Use noon UTC to avoid timezone offset issues
    expect(formatDate('2026-03-20T12:00:00Z')).toBe('Mar 20, 2026');
  });

  it('formats a date with timezone offset', () => {
    expect(formatDate('2025-01-15T12:00:00Z')).toBe('Jan 15, 2025');
  });

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('formats dates with different months correctly', () => {
    expect(formatDate('2024-12-25T12:00:00Z')).toBe('Dec 25, 2024');
    expect(formatDate('2024-07-04T12:00:00Z')).toBe('Jul 4, 2024');
  });

  it('returns a string (not empty) for any valid date input', () => {
    const result = formatDate('2023-06-15T18:30:00Z');
    expect(result).toBeTruthy();
    expect(result).toContain('2023');
  });
});
