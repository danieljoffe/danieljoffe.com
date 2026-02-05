// Mock GSAP for Jest tests
const gsapFns = {
  play: jest.fn(),
  pause: jest.fn(),
  reverse: jest.fn(),
  restart: jest.fn(),
  kill: jest.fn(),
};

const mockGSAP = {
  to: jest.fn(() => ({
    ...gsapFns,
  })),
  from: jest.fn(() => ({
    ...gsapFns,
  })),
  fromTo: jest.fn(() => ({
    ...gsapFns,
  })),
  set: jest.fn((target, _options) => target),
  registerPlugin: jest.fn(),
  delayedCall: jest.fn((_delay, _callback) => {
    // Mock delayedCall that doesn't immediately call the callback to avoid infinite loops
    return {
      kill: jest.fn(),
    };
  }),
  timeline: jest.fn(() => {
    const mockTimeline = {
      to: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      fromTo: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      call: jest.fn().mockReturnThis(),
      play: jest.fn().mockReturnThis(),
      pause: jest.fn().mockReturnThis(),
      reverse: jest.fn().mockReturnThis(),
      restart: jest.fn().mockReturnThis(),
      timeScale: jest.fn().mockReturnThis(),
      kill: jest.fn(),
    };
    return mockTimeline;
  }),
  context: jest.fn((_vars, func) => {
    // Mock context function that just calls the provided function
    if (typeof func === 'function') {
      return func();
    }
    return {
      add: jest.fn(),
      kill: jest.fn(),
      revert: jest.fn(),
    };
  }),
  utils: {
    wrap: jest.fn(array => {
      // Simple implementation that returns a function that cycles through the array
      let index = 0;
      return value => {
        // If value is provided, return the value wrapped to array bounds
        if (value !== undefined) {
          return array[Math.abs(value) % array.length];
        }
        // If no value, return next item in sequence
        const result = array[index];
        index = (index + 1) % array.length;
        return result;
      };
    }),
    random: jest.fn((min, max) => Math.random() * (max - min) + min),
    snap: jest.fn((snap, value) => Math.round(value / snap) * snap),
    normalize: jest.fn((value, min, max) => (value - min) / (max - min)),
    mapRange: jest.fn(
      (inMin, inMax, outMin, outMax, value) =>
        outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin))
    ),
  },
};

module.exports = mockGSAP;
