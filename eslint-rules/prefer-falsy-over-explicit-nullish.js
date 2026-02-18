/**
 * Prefer `!expr` over `expr === null` / `expr === undefined`
 * and `expr` over `expr !== null` / `expr !== undefined` in boolean contexts.
 */

const BOOLEAN_CONTEXT_PARENT_TYPES = new Set([
  "IfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "ForStatement",
  "ConditionalExpression",
]);

function isNullishLiteral(node) {
  if (node.type === "Literal" && node.value === null) {
    return true;
  }
  if (node.type === "Identifier" && node.name === "undefined") {
    return true;
  }
  if (
    node.type === "UnaryExpression" &&
    node.operator === "void" &&
    node.argument?.type === "Literal" &&
    node.argument.value === 0
  ) {
    return true;
  }
  return false;
}

function isInBooleanContext(node, sourceCode) {
  const ancestors = sourceCode.getAncestors(node);
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (!BOOLEAN_CONTEXT_PARENT_TYPES.has(ancestor.type)) {
      continue;
    }
    const testNode = ancestor.test;
    if (testNode && (node === testNode || ancestors.includes(testNode))) {
      return true;
    }
  }
  return false;
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer !expr over expr === null/undefined and expr over expr !== null/undefined in conditions",
    },
    fixable: "code",
    schema: [],
    messages: {
      preferFalsy:
        "Prefer '!{{expr}}' over '{{expr}} === {{nullish}}' in boolean context.",
      preferTruthy:
        "Prefer '{{expr}}' over '{{expr}} !== {{nullish}}' in boolean context.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode?.();

    return {
      BinaryExpression(node) {
        if (node.operator !== "===" && node.operator !== "!==") {
          return;
        }

        let exprNode;
        let nullishLabel;

        if (isNullishLiteral(node.left)) {
          exprNode = node.right;
          nullishLabel =
            node.left.type === "Literal"
              ? "null"
              : node.left.type === "UnaryExpression"
                ? "undefined"
                : "undefined";
        } else if (isNullishLiteral(node.right)) {
          exprNode = node.left;
          nullishLabel =
            node.right.type === "Literal"
              ? "null"
              : node.right.type === "UnaryExpression"
                ? "undefined"
                : "undefined";
        } else {
          return;
        }

        if (!isInBooleanContext(node, sourceCode)) {
          return;
        }

        const exprText = sourceCode.getText(exprNode);

        if (node.operator === "===") {
          context.report({
            node,
            messageId: "preferFalsy",
            data: { expr: exprText, nullish: nullishLabel },
            fix(fixer) {
              const replacement = exprNode.type === "BinaryExpression" ||
                exprNode.type === "LogicalExpression" ||
                exprNode.type === "ConditionalExpression"
                ? `!(${exprText})`
                : `!${exprText}`;
              return fixer.replaceText(node, replacement);
            },
          });
        } else {
          context.report({
            node,
            messageId: "preferTruthy",
            data: { expr: exprText, nullish: nullishLabel },
            fix(fixer) {
              return fixer.replaceText(node, exprText);
            },
          });
        }
      },
    };
  },
};
