/**
 * Warn when useCallback wraps a trivial function with empty deps.
 *
 * Patterns detected:
 * 1. useCallback with [] deps whose body only calls setState / state-updater functions.
 *    These are already referentially stable via React's guarantee and don't need wrapping.
 * 2. useCallback with [] deps whose body is a single expression (no closures over
 *    component-scope variables), indicating no real dependency — the wrapper is overhead.
 */

const HOOK_NAME = 'useCallback';

function isEmptyDepsArray(node) {
  return (
    node &&
    node.type === 'ArrayExpression' &&
    node.elements.length === 0
  );
}

/**
 * Check if a function body only contains calls to state setters (functions starting with "set")
 * or contains a single simple expression statement.
 */
function isBodyOnlySetterCalls(bodyNode) {
  if (!bodyNode || bodyNode.type !== 'BlockStatement') return false;

  const statements = bodyNode.body;
  if (statements.length === 0) return true;

  return statements.every((stmt) => {
    // ExpressionStatement wrapping a call
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
      const callee = stmt.expression.callee;
      // Direct call: setFoo(...)
      if (callee.type === 'Identifier' && callee.name.startsWith('set')) {
        return true;
      }
    }

    return false;
  });
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when useCallback with empty deps wraps a trivial setter-only function. ' +
        'React setState functions are already referentially stable.',
    },
    messages: {
      unnecessaryUseCallback:
        'useCallback with empty deps wrapping only setState calls is unnecessary. ' +
        'React guarantees setState identity is stable across renders.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'Identifier' ||
          node.callee.name !== HOOK_NAME
        ) {
          return;
        }

        const args = node.arguments;
        // useCallback(fn, deps)
        if (args.length < 2) return;

        const fn = args[0];
        const deps = args[1];

        // Only flag empty deps arrays
        if (!isEmptyDepsArray(deps)) return;

        // Get the function body
        const body =
          fn.type === 'ArrowFunctionExpression' || fn.type === 'FunctionExpression'
            ? fn.body
            : null;

        if (!body) return;

        // Arrow with expression body: useCallback(() => setFoo(bar), [])
        if (body.type === 'CallExpression') {
          const callee = body.callee;
          if (callee.type === 'Identifier' && callee.name.startsWith('set')) {
            context.report({ node, messageId: 'unnecessaryUseCallback' });

            return;
          }
        }

        // Block body with only setter calls
        if (isBodyOnlySetterCalls(body)) {
          context.report({ node, messageId: 'unnecessaryUseCallback' });
        }
      },
    };
  },
};
