/**
 * @fileoverview Ban raw <h1>-<h6> tags in favor of the Heading component.
 */

'use strict';

const RAW_HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow raw HTML heading elements (<h1>-<h6>); use the Heading component instead.',
    },
    messages: {
      noRawHeading:
        'Use the Heading component instead of <{{tag}}> for a consistent type scale.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (
          node.name.type === 'JSXIdentifier' &&
          RAW_HEADINGS.has(node.name.name)
        ) {
          context.report({
            node,
            messageId: 'noRawHeading',
            data: { tag: node.name.name },
          });
        }
      },
    };
  },
};
