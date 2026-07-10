'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Linter } = require('eslint');

const requireButtonName = require('../rules/require-button-name');
const noRawHeadings = require('../rules/no-raw-headings');
const preferPrimitives = require('../rules/prefer-primitives');

const linter = new Linter();

/** Lint a JSX snippet against a single rule; returns the ESLint messages. */
function lint(code, ruleName, rule, options) {
  return linter.verify(code, {
    plugins: { local: { rules: { [ruleName]: rule } } },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      [`local/${ruleName}`]: options ? ['error', ...options] : 'error',
    },
  });
}

test('require-button-name: flags <Button> without a name', () => {
  const msgs = lint('<Button>Go</Button>;', 'r', requireButtonName);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].messageId, 'missingName');
});

test('require-button-name: allows <Button name=...>', () => {
  assert.equal(
    lint("<Button name='go'>Go</Button>;", 'r', requireButtonName).length,
    0
  );
});

test('require-button-name: allows as="link" without a name', () => {
  assert.equal(
    lint("<Button as='link'>Go</Button>;", 'r', requireButtonName).length,
    0
  );
});

test('require-button-name: ignores lowercase <button>', () => {
  assert.equal(lint('<button>Go</button>;', 'r', requireButtonName).length, 0);
});

test('no-raw-headings: flags <h1>', () => {
  const msgs = lint('<h1>Title</h1>;', 'r', noRawHeadings);
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0].messageId, 'noRawHeading');
});

test('no-raw-headings: allows <Heading>', () => {
  assert.equal(lint('<Heading>Title</Heading>;', 'r', noRawHeadings).length, 0);
});

test('prefer-primitives: flags raw <button>, <input>, <table>', () => {
  for (const [tag, primitive] of [
    ['button', 'Button'],
    ['input', 'Input'],
    ['table', 'Table'],
  ]) {
    const msgs = lint(`<${tag} />;`, 'r', preferPrimitives);
    assert.equal(msgs.length, 1, `expected <${tag}> to be flagged`);
    assert.equal(msgs[0].messageId, 'preferPrimitive');
    assert.equal(msgs[0].message.includes(primitive), true);
  }
});

test('prefer-primitives: allows the shared-ui components', () => {
  assert.equal(
    lint('<Button name="x">Go</Button>;', 'r', preferPrimitives).length,
    0
  );
  assert.equal(lint('<Input />;', 'r', preferPrimitives).length, 0);
});

test('prefer-primitives: allow option exempts a tag', () => {
  assert.equal(
    lint('<table />;', 'r', preferPrimitives, [{ allow: ['table'] }]).length,
    0
  );
});
