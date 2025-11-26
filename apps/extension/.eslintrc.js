module.exports = {
  root: true,
  extends: ['@populatte/eslint-config/react'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.eslintrc.js', 'vite.config.ts'],
};
