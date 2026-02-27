import {
  setGradientTheme,
  themes,
  themeOne,
  themeTwo,
  themeThree,
  themeFour,
  themeFive,
  themeSix,
  themeSeven,
  themeEight,
  themeNine,
  type Theme,
} from '../blob.utils';

// Helper to create a mock HTMLElement with a spied setProperty
function createMockTarget(): HTMLElement {
  const el = document.createElement('div');
  jest.spyOn(el.style, 'setProperty');
  return el;
}

type WindowWithRegisteredCSSProps = Window & {
  __registeredCSSProps?: Set<string>;
};

describe('blob.utils', () => {
  // ============================================================================
  // Theme exports
  // ============================================================================
  describe('theme exports', () => {
    it('exports all nine individual themes with the correct shape', () => {
      const allThemes = [
        themeOne,
        themeTwo,
        themeThree,
        themeFour,
        themeFive,
        themeSix,
        themeSeven,
        themeEight,
        themeNine,
      ];

      const expectedKeys: (keyof Theme)[] = [
        '--stop-color-one',
        '--stop-color-two',
        '--stop-color-three',
        '--stop-color-four',
        '--stop-color-five',
        '--stop-color-six',
        '--stop-color-seven',
        '--stop-color-eight',
      ];

      allThemes.forEach(theme => {
        expectedKeys.forEach(key => {
          expect(theme).toHaveProperty(key);
          expect(typeof theme[key]).toBe('string');
          expect(theme[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
        });
      });
    });

    it('exports themes object keyed 1 through 9', () => {
      expect(Object.keys(themes).sort()).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
      ]);
      expect(themes[1]).toBe(themeOne);
      expect(themes[9]).toBe(themeNine);
    });
  });

  // ============================================================================
  // setGradientTheme
  // ============================================================================
  describe('setGradientTheme', () => {
    let target: HTMLElement;

    beforeEach(() => {
      target = createMockTarget();
      // Clean up any registered props tracking from prior tests
      delete (window as WindowWithRegisteredCSSProps).__registeredCSSProps;
    });

    // ------------------------------------------------------------------
    // Branch: CSS.registerProperty IS available
    // ------------------------------------------------------------------
    describe('when CSS.registerProperty is available', () => {
      let registerPropertyMock: jest.Mock;

      beforeEach(() => {
        registerPropertyMock = jest.fn();
        Object.defineProperty(window, 'CSS', {
          value: { registerProperty: registerPropertyMock },
          writable: true,
          configurable: true,
        });
      });

      it('registers each CSS property and sets style properties on the target', () => {
        // Pin the random number so we know which theme is selected
        jest.spyOn(Math, 'random').mockReturnValue(0.15); // floor(0.15*10)=1 => theme 1
        setGradientTheme(target);

        const entries = Object.entries(themeOne);

        // Should have registered each property once
        expect(registerPropertyMock).toHaveBeenCalledTimes(entries.length);
        entries.forEach(([key, value]) => {
          expect(registerPropertyMock).toHaveBeenCalledWith({
            name: key,
            syntax: '<color>',
            inherits: true,
            initialValue: value,
          });
        });

        // Should have set each style property
        entries.forEach(([key, value]) => {
          expect(target.style.setProperty).toHaveBeenCalledWith(key, value);
        });
      });

      it('initializes __registeredCSSProps Set when it does not exist', () => {
        expect(
          (window as WindowWithRegisteredCSSProps).__registeredCSSProps
        ).toBeUndefined();

        jest.spyOn(Math, 'random').mockReturnValue(0.15);
        setGradientTheme(target);

        expect(
          (window as WindowWithRegisteredCSSProps).__registeredCSSProps
        ).toBeInstanceOf(Set);
        expect(
          (window as WindowWithRegisteredCSSProps).__registeredCSSProps?.size
        ).toBe(8);
      });

      it('does NOT re-register a property that is already in __registeredCSSProps', () => {
        // Pre-populate the set with the first key
        const preRegistered = new Set<string>(['--stop-color-one']);
        (window as WindowWithRegisteredCSSProps).__registeredCSSProps =
          preRegistered;

        jest.spyOn(Math, 'random').mockReturnValue(0.15); // theme 1
        setGradientTheme(target);

        // registerProperty should have been called for 7 of the 8 keys (skipping --stop-color-one)
        expect(registerPropertyMock).toHaveBeenCalledTimes(7);
        const registeredNames = registerPropertyMock.mock.calls.map(
          (call: [{ name: string }]) => call[0].name
        );
        expect(registeredNames).not.toContain('--stop-color-one');

        // But setProperty should still be called for ALL 8 keys
        expect(target.style.setProperty).toHaveBeenCalledTimes(8);
      });

      it('catches and continues when CSS.registerProperty throws', () => {
        registerPropertyMock.mockImplementation(() => {
          throw new Error('Already registered');
        });

        jest.spyOn(Math, 'random').mockReturnValue(0.15);

        // Should not throw
        expect(() => setGradientTheme(target)).not.toThrow();

        // registerProperty was attempted for all 8 properties
        expect(registerPropertyMock).toHaveBeenCalledTimes(8);

        // setProperty should still be called for all 8
        expect(target.style.setProperty).toHaveBeenCalledTimes(8);
      });
    });

    // ------------------------------------------------------------------
    // Branch: CSS.registerProperty is NOT available
    // ------------------------------------------------------------------
    describe('when CSS.registerProperty is not available', () => {
      it('skips registration when CSS is undefined', () => {
        Object.defineProperty(window, 'CSS', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        jest.spyOn(Math, 'random').mockReturnValue(0.25); // floor(0.25*10)=2 => theme 2
        setGradientTheme(target);

        // setProperty should still be called for all entries
        const entries = Object.entries(themeTwo);
        expect(target.style.setProperty).toHaveBeenCalledTimes(entries.length);
        entries.forEach(([key, value]) => {
          expect(target.style.setProperty).toHaveBeenCalledWith(key, value);
        });
      });

      it('skips registration when CSS.registerProperty is not a function', () => {
        Object.defineProperty(window, 'CSS', {
          value: { registerProperty: 'not-a-function' },
          writable: true,
          configurable: true,
        });

        jest.spyOn(Math, 'random').mockReturnValue(0.35); // floor(0.35*10)=3 => theme 3
        setGradientTheme(target);

        const entries = Object.entries(themeThree);
        expect(target.style.setProperty).toHaveBeenCalledTimes(entries.length);
      });
    });

    // ------------------------------------------------------------------
    // Random theme selection boundary values
    // ------------------------------------------------------------------
    describe('random theme selection', () => {
      beforeEach(() => {
        // Disable CSS.registerProperty to simplify assertions
        Object.defineProperty(window, 'CSS', {
          value: undefined,
          writable: true,
          configurable: true,
        });
      });

      it('selects theme 1 when Math.random() returns 0 (Math.max(1, floor(0)))', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0);
        setGradientTheme(target);

        Object.entries(themeOne).forEach(([key, value]) => {
          expect(target.style.setProperty).toHaveBeenCalledWith(key, value);
        });
      });

      it('selects theme 9 when Math.random() returns 0.95 (floor(9.5)=9)', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.95);
        setGradientTheme(target);

        Object.entries(themeNine).forEach(([key, value]) => {
          expect(target.style.setProperty).toHaveBeenCalledWith(key, value);
        });
      });

      it('selects theme 5 when Math.random() returns 0.55 (floor(5.5)=5)', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.55);
        setGradientTheme(target);

        Object.entries(themeFive).forEach(([key, value]) => {
          expect(target.style.setProperty).toHaveBeenCalledWith(key, value);
        });
      });
    });

    // ------------------------------------------------------------------
    // setProperty is always called regardless of CSS.registerProperty
    // ------------------------------------------------------------------
    describe('style.setProperty', () => {
      it('is called for every theme entry regardless of CSS support', () => {
        Object.defineProperty(window, 'CSS', {
          value: undefined,
          writable: true,
          configurable: true,
        });

        jest.spyOn(Math, 'random').mockReturnValue(0.45); // floor(4.5)=4 => theme 4
        setGradientTheme(target);

        const entries = Object.entries(themeFour);
        expect(target.style.setProperty).toHaveBeenCalledTimes(entries.length);
        entries.forEach(([key, value]) => {
          expect(target.style.setProperty).toHaveBeenCalledWith(key, value);
        });
      });
    });
  });
});
