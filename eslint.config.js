import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import eslintConfigPrettier from "eslint-config-prettier";
import stylistic from "@stylistic/eslint-plugin";
import preferFalsyPlugin from "./eslint-rules/index.js";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "playwright-report"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "@stylistic": stylistic,
      local: preferFalsyPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "error",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      curly: "error",
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "if", next: "*" },
      ],
      "local/prefer-falsy-over-explicit-nullish": "warn",
      "local/max-use-effect-count": ["warn", { max: 2 }],
      "prefer-destructuring": [
        "warn",
        {
          VariableDeclarator: {
            object: true,
            array: false,
          },
          AssignmentExpression: {
            object: true,
            array: false,
          },
        },
      ],
    },
  },
  eslintConfigPrettier
);
