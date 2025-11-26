module.exports = {
  root: true,
  extends: ['@populatte/eslint-config/next'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    '.eslintrc.js',
    'next.config.js',
    'tailwind.config.ts',
    'postcss.config.js',
  ],
};
