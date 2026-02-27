jest.mock('@/lib/public.env', () => ({
  publicEnv: { NEXT_PUBLIC_NODE_ENV: 'test' },
  PublicEnvVars: { NEXT_PUBLIC_NODE_ENV: 'NEXT_PUBLIC_NODE_ENV' },
}));

import { publicEnv } from '@/lib/public.env';
import {
  getBase64DataUrl,
  devLog,
  isProduction,
  downloadResume,
} from '../helpers';

const mockPublicEnv = publicEnv as Record<string, string | undefined>;

describe('helpers', () => {
  // ============================================================================
  // getBase64DataUrl
  // ============================================================================
  describe('getBase64DataUrl', () => {
    it('uses canvas path when window is defined and ctx is available', () => {
      const mockCtx = {
        fillStyle: '',
        fillRect: jest.fn(),
      };
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue(mockCtx),
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock'),
      };

      const originalCreateElement = document.createElement.bind(document);
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string) => {
          if (tag === 'canvas')
            return mockCanvas as unknown as HTMLCanvasElement;
          return originalCreateElement(tag);
        });

      const result = getBase64DataUrl('rgb(10,20,30)');

      expect(mockCanvas.width).toBe(40);
      expect(mockCanvas.height).toBe(40);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockCtx.fillStyle).toBe('rgb(10,20,30)');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 40, 40);
      expect(mockCanvas.toDataURL).toHaveBeenCalled();
      expect(result).toBe('data:image/png;base64,mock');
    });

    it('skips fillStyle/fillRect when getContext returns null', () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue(null),
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,empty'),
      };

      const originalCreateElement = document.createElement.bind(document);
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string) => {
          if (tag === 'canvas')
            return mockCanvas as unknown as HTMLCanvasElement;
          return originalCreateElement(tag);
        });

      const result = getBase64DataUrl('rgb(50,60,70)');

      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      // fillRect should NOT have been called since ctx was null
      expect(mockCanvas.toDataURL).toHaveBeenCalled();
      expect(result).toBe('data:image/png;base64,empty');
    });

    it('returns an SVG base64 data URL when canvas is null (SSR fallback)', () => {
      // Mock createElement to return null for canvas, simulating SSR
      const originalCreateElement = document.createElement.bind(document);
      jest
        .spyOn(document, 'createElement')
        .mockImplementation((tag: string) => {
          if (tag === 'canvas') return null as unknown as HTMLCanvasElement;
          return originalCreateElement(tag);
        });

      const result = getBase64DataUrl('rgb(100,200,50)');

      expect(result).toMatch(/^data:image\/svg\+xml;base64,/);
      const base64Part = result.replace('data:image/svg+xml;base64,', '');
      const decoded = Buffer.from(base64Part, 'base64').toString('utf8');
      expect(decoded).toContain('rgb(100,200,50)');
      expect(decoded).toContain('<svg');
      expect(decoded).toContain('<rect');
    });
  });

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
    afterEach(() => {
      mockPublicEnv['NEXT_PUBLIC_NODE_ENV'] = 'test';
    });

    it('does not call console.log when isProduction() returns true', () => {
      mockPublicEnv['NEXT_PUBLIC_NODE_ENV'] = 'production';

      // Restore test-setup spy, then add our own so we can assert
      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        /* noop */
      });

      devLog('should not appear');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('calls console.log with formatted message when isProduction() returns false', () => {
      mockPublicEnv['NEXT_PUBLIC_NODE_ENV'] = 'test';

      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        /* noop */
      });

      devLog('hello world', { extra: 'data' });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const [format, style, ...rest] = consoleSpy.mock.calls[0];
      expect(format).toMatch(/^%c.*> hello world$/);
      expect(style).toContain('background-color: darkorange');
      expect(rest).toEqual([{ extra: 'data' }]);
    });

    it('passes multiple extra arguments through', () => {
      mockPublicEnv['NEXT_PUBLIC_NODE_ENV'] = 'development';

      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        /* noop */
      });

      devLog('test', 1, 'two', { three: 3 });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const args = consoleSpy.mock.calls[0];
      // format string, style string, then the 3 extra args
      expect(args.length).toBe(5);
      expect(args[2]).toBe(1);
      expect(args[3]).toBe('two');
      expect(args[4]).toEqual({ three: 3 });
    });

    it('includes an ISO timestamp in the formatted message', () => {
      mockPublicEnv['NEXT_PUBLIC_NODE_ENV'] = 'test';

      jest.restoreAllMocks();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
        /* noop */
      });

      devLog('timestamp check');

      const [format] = consoleSpy.mock.calls[0];
      // ISO 8601 timestamp pattern
      expect(format).toMatch(
        /^%c\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z > timestamp check$/
      );
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
