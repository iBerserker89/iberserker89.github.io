import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["src/scripts/**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },

    rules: {
      ...js.configs.recommended.rules,
    },
  },
  {
    files: ["tests/**/*.mjs", "*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
