import baseRules from './rules/base'
import reactRules from './rules/react'

export = {
  extends: [
    'airbnb',
    'airbnb-typescript',
    // react和react-hooks相关配置
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',

    // ts推荐配置
    'plugin:@typescript-eslint/recommended',
    // 解决prettier和eslint的冲突，此项配置必须在最后
    'plugin:prettier/recommended',
    'plugin:import/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['import', 'no-autofix'],
  rules: {
    ...baseRules,
    ...reactRules,
  },
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
