/**
 * @fileoverview Prefer shared-ui primitives over raw HTML elements that have a
 * component equivalent (e.g. <button> -> <Button>).
 */

'use strict';

const DEFAULT_ELEMENTS = {
  button: 'Button',
  input: 'Input',
  table: 'Table',
  select: 'Select',
  textarea: 'Textarea',
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer @danieljoffe/shared-ui primitives over raw HTML elements that have a component equivalent.',
    },
    messages: {
      preferPrimitive:
        'Use <{{primitive}}> from @danieljoffe/shared-ui instead of a raw <{{tag}}> — the primitive ships focus states, accessibility, and theming.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const allow = new Set(options.allow || []);

    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return;
        const tag = node.name.name;
        if (allow.has(tag)) return;
        const primitive = DEFAULT_ELEMENTS[tag];
        if (primitive) {
          context.report({
            node,
            messageId: 'preferPrimitive',
            data: { tag, primitive },
          });
        }
      },
    };
  },
};
