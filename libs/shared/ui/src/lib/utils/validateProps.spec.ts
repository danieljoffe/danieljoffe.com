import { validateProps } from './validateProps';

describe('validateProps', () => {
  const alwaysValid = () => null;
  const alwaysInvalid = () => 'something is wrong';

  it('returns props unchanged when validation passes', () => {
    const props = { size: 'md', color: 'blue' };
    const result = validateProps(props, alwaysValid, { size: 'sm' }, 'Test');
    expect(result).toBe(props);
  });

  it('merges defaults when validation fails', () => {
    const props = { size: 'invalid' };
    const defaults = { size: 'md', color: 'red' };
    const result = validateProps(props, alwaysInvalid, defaults, 'Test');
    // props override defaults (spread order: { ...defaults, ...props })
    expect(result).toEqual({ size: 'invalid', color: 'red' });
  });

  it('logs console.error in development', () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';
    const spy = jest.spyOn(console, 'error').mockImplementation();

    validateProps({ x: 1 }, alwaysInvalid, {}, 'MyComponent');

    expect(spy).toHaveBeenCalledWith(
      '[MyComponent] Invalid props: something is wrong'
    );

    spy.mockRestore();
    process.env['NODE_ENV'] = originalEnv;
  });

  it('is silent in production (no console.error)', () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    const spy = jest.spyOn(console, 'error').mockImplementation();

    validateProps({ x: 1 }, alwaysInvalid, {}, 'MyComponent');

    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
    process.env['NODE_ENV'] = originalEnv;
  });

  it('handles empty defaults', () => {
    const props = { size: 'md' };
    const result = validateProps(props, alwaysInvalid, {}, 'Test');
    expect(result).toEqual({ size: 'md' });
  });
});
