export default [
  {
    files: ["eslint.config.js", "tests/*.mjs", "scripts/*.mjs"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "error",
      "no-constant-condition": "error",
      "no-unreachable": "error",
      "no-dupe-keys": "error",
    },
  },
];
