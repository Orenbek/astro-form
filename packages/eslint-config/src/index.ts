import rules from './rules/base'

export = {
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
    // 解决prettier和eslint的冲突，此项配置必须在最后
    'plugin:prettier/recommended',
    'plugin:import/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', 'no-autofix'],
  rules,
  globals: {},
  ignorePatterns: ['.eslintrc.js'],
  parserOptions: {
    ecmaVersion: 11,
    project: true,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      legacyDecorators: true,
    },
  },
}
