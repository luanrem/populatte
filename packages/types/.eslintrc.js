module.exports = {
  root: true,
  extends: ['@populatte/eslint-config/base'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    // Pure types package - relax some rules
    '@typescript-eslint/no-empty-interface': 'off',
  },
};
