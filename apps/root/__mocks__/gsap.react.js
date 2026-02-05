const mockReact = {
  useGSAP: jest.fn((callback, _deps) => {
    // Mock useGSAP hook that just calls the callback
    if (typeof callback === 'function') {
      callback();
    }
  }),
};

module.exports = mockReact;
