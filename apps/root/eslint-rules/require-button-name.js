/**
 * @fileoverview Require a `name` prop on Button components (unless as="link").
 */

'use strict';

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Require Button component to have a 'name' prop when used as a button",
    },
    messages: {
      missingName:
        "Button component requires a 'name' prop for accessibility and testing. Use kebab-case (e.g., name='submit-form').",
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        // 1. Only check elements named exactly "Button"
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'Button') {
          return;
        }

        const attributes = node.attributes;

        // 2. If as="link", skip the check
        const asAttr = attributes.find(
          attr =>
            attr.type === 'JSXAttribute' &&
            attr.name &&
            attr.name.name === 'as' &&
            attr.value &&
            attr.value.type === 'Literal' &&
            attr.value.value === 'link'
        );

        if (asAttr) {
          return;
        }

        // 3. Require a `name` attribute
        const nameAttr = attributes.find(
          attr =>
            attr.type === 'JSXAttribute' &&
            attr.name &&
            attr.name.name === 'name'
        );

        if (!nameAttr) {
          context.report({
            node,
            messageId: 'missingName',
          });
        }
      },
    };
  },
};
