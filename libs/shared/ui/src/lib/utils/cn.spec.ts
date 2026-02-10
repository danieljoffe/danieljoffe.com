import { cn } from './cn';

describe('cn', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes (falsy values ignored)', () => {
    const condition = false;
    expect(cn('foo', condition && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', null, undefined, 'bar')).toBe('foo bar');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('mt-2', 'mt-4')).toBe('mt-4');
  });

  it('handles arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('handles objects of classes', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('handles undefined, null, and false inputs', () => {
    expect(cn(undefined)).toBe('');
    expect(cn(null)).toBe('');
    expect(cn(false)).toBe('');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });
});
