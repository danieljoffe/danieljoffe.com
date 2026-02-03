const React = require('react');

const Link = React.forwardRef((props, ref) => {
  const { children, href, ...rest } = props;
  return React.createElement('a', { ...rest, href, ref }, children);
});
Link.displayName = 'Link';

const mockNextTransitionRouter = {
  useTransitionRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  })),
  Link,
};

module.exports = mockNextTransitionRouter;
