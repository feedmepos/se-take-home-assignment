import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

const importSortOverrides = [
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    rules: {
      "simple-import-sort/imports": [
        "warn",
        {
          groups: [
            // Style imports
            ["^.+\\.s?css$"],
            // `react` first, `next` second, then packages starting with a character
            ["^react$", "^next", "^[a-z]", "^@ant-design"],
            // Packages starting with `@`
            ["^@"],
            // `type` imports
            ["^.*\\u0000$"],
            // Packages starting with `~`
            ["^~"],
            // Imports starting with `../`
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            // Imports starting with `./`
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
            // Side effect imports
            ["^\\u0000"],
          ],
        },
      ],
    },
  },
];

export default tseslint.config(
  { ignores: ["dist", ".next", "node_modules"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...importSortOverrides,
    ],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
