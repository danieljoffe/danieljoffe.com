jest.mock('@/lib/public.env', () => ({
  publicEnv: { NEXT_PUBLIC_NODE_ENV: 'test' },
  PublicEnvVars: { NEXT_PUBLIC_NODE_ENV: 'NEXT_PUBLIC_NODE_ENV' },
}));

import { publicEnv } from '@/lib/public.env';
import { devLog, isProduction, downloadResume } from '../helpers';

const mockPublicEnv = publicEnv as Record<string, string | undefined>;

describe('helpers', () => {
  // ============================================================================
  // isProduction
  // ============================================================================
  describe('isProduction', () => {
    afterEach(() => {
      mockPublicEnv['NEXT_PUBLIC_NODE_ENV'] = 'test';
    });

    it('returns false when env is not production', () => {
      mockPublicEnv['NEXT_PUBLIC_NODE_ENV'] = 'test';
      expect(isProduction()).toBe(false);
    });

    it('returns false when env is development', () => {
      mockPublicEnv['NEXT_PUBLIC_NODE_ENV'] = 'development';
      expect(isProduction()).toBe(false);
    });

    it('returns true when env is production', () => {
      mockPublicEnv['NEXT_PUBLIC_NODE_ENV'] = 'production';
      expect(isProduction()).toBe(true);
    });

    it('returns false when env is undefined', () => {
      mockPublicEnv['NEXT_PUBLIC_NODE_ENV'] = undefined;
      expect(isProduction()).toBe(false);
    });
  });

  // ============================================================================
  // devLog
  // ============================================================================
  describe('devLog', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('does not call console.debug when not in development mode', () => {
      process.env.NODE_ENV = 'production';

      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {
        /* noop */
      });

      devLog('should not appear');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('calls console.debug with formatted message in development mode', () => {
      process.env.NODE_ENV = 'development';

      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {
        /* noop */
      });

      devLog('hello world', { extra: 'data' });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const [format, ...rest] = consoleSpy.mock.calls[0];
      expect(format).toContain('DEBUG');
      expect(format).toContain('hello world');
      expect(rest).toEqual([{ extra: 'data' }]);
    });

    it('passes multiple extra arguments through', () => {
      process.env.NODE_ENV = 'development';

      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {
        /* noop */
      });

      devLog('test', 1, 'two', { three: 3 });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const [, ...rest] = consoleSpy.mock.calls[0];
      expect(rest).toEqual([1, 'two', { three: 3 }]);
    });

    it('includes a timestamp in the formatted message', () => {
      process.env.NODE_ENV = 'development';

      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {
        /* noop */
      });

      devLog('timestamp check');

      const [format] = consoleSpy.mock.calls[0];
      // Should contain the message and ANSI-formatted output with a timestamp
      expect(format).toContain('timestamp check');
      expect(format).toContain('DEBUG');
      // Timestamp is wrapped in ANSI codes: \x1b[90m[...]\x1b[0m
      expect(format).toMatch(/\[.+\]/);
    });

    it('does nothing in test environment', () => {
      process.env.NODE_ENV = 'test';

      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {
        /* noop */
      });

      devLog('should not appear');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // downloadResume
  // ============================================================================
  describe('downloadResume', () => {
    it('creates an anchor element, sets href and download, appends to body, clicks, and removes', () => {
      // Create a real anchor element so jsdom appendChild is happy
      const realLink = document.createElement('a');
      const clickSpy = jest.fn();
      realLink.click = clickSpy;

      const originalCreateElement = document.createElement.bind(document);
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string) => {
          if (tag === 'a') return realLink;
          return originalCreateElement(tag);
        });

      const appendChildSpy = jest.spyOn(document.body, 'appendChild');
      const removeChildSpy = jest.spyOn(document.body, 'removeChild');

      downloadResume();

      expect(realLink.href).toContain('docs.google.com');
      expect(realLink.download).toBe('daniel-joffe-resume.pdf');
      expect(appendChildSpy).toHaveBeenCalledWith(realLink);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(removeChildSpy).toHaveBeenCalledWith(realLink);

      // Verify order: append -> click -> remove
      const appendOrder = appendChildSpy.mock.invocationCallOrder[0];
      const clickOrder = clickSpy.mock.invocationCallOrder[0];
      const removeOrder = removeChildSpy.mock.invocationCallOrder[0];
      expect(appendOrder).toBeLessThan(clickOrder);
      expect(clickOrder).toBeLessThan(removeOrder);
    });
  });
});
