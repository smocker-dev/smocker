module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "jest", "react"],
  settings: {
    react: {
      version: "detect",
    },
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jest/recommended",
    "plugin:react/recommended",
    "prettier/@typescript-eslint",
  ],
  rules: {
    "no-empty": ["error", { allowEmptyCatch: true }],
  },
};
