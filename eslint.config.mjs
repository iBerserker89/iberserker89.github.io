import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["script/**/*.js"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: globals.browser,
    },

    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
