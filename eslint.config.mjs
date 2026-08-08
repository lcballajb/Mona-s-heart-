export default [
  {
    files: [
      "eslint.config.mjs",
      "server/*.mjs",
      "tests/*.mjs",
      "scripts/*.mjs",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: Object.fromEntries(
        [
          "AbortController",
          "Buffer",
          "URL",
          "clearTimeout",
          "console",
          "fetch",
          "performance",
          "process",
          "setTimeout",
          "structuredClone",
        ].map((name) => [name, "readonly"]),
      ),
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-constant-condition": "error",
      "no-unreachable": "error",
      "no-dupe-keys": "error",
    },
  },
];
