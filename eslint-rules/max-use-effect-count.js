/**
 * Enforce maximum number of useEffect calls per file.
 * Encourages extracting complex effect logic into custom hooks.
 */

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce maximum useEffect count per file; extract complex logic into custom hooks',
    },
    messages: {
      tooManyUseEffects:
        'File has {{count}} useEffect calls. Limit to {{max}} per file and extract complex logic into custom hooks.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            default: 2,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const max = context.options[0]?.max ?? 2;
    const useEffectNodes = [];

    return {
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'useEffect'
        ) {
          useEffectNodes.push(node);
        }
      },
      'Program:exit'() {
        if (useEffectNodes.length > max) {
          context.report({
            node: useEffectNodes[max],
            messageId: 'tooManyUseEffects',
            data: { count: useEffectNodes.length, max },
          });
        }
      },
    };
  },
};
