module.exports = {
  __esModule: true,
  default: {
    create: jest.fn(),
    getRawPath: jest.fn(path => path),
    rawPathToString: jest.fn(rawPath => rawPath),
  },
};
