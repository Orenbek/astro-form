export default {
  // 使用TS，没有必要使用react prop types
  'react/prop-types': 'off',
  // jsx允许{...props}，但是会warn
  'react/jsx-props-no-spreading': 'warn',
  // 此条规则不合适，建议在解构时添加
  'react/require-default-props': 'off',
  // 仅允许jsx和tsx文件使用jsx语法
  'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
  // 关闭react折行
  'react/jsx-one-expression-per-line': 'off',
  // prettier接管jsx样式
  'react/jsx-closing-tag-location': 'off',
  // prettier接管jsx样式
  'react/jsx-curly-newline': 'off',
  // 遍历输出jsx时，必须存在key
  'react/jsx-key': 'error',
  // 此规则对于Functional Component意义不大
  // 日常使用中，存在较多的此种用法
  'react/jsx-no-bind': 'off',
  'react/function-component-definition': [
    'error',
    {
      namedComponents: ['arrow-function', 'function-declaration'],
      unnamedComponents: ['arrow-function'],
    },
  ],
  'react/display-name': 'off',
  'react/jsx-no-leaked-render': 'off',
  // edenx 项目中不需要在文件中引入 React 也可以写 JSX
  'react/react-in-jsx-scope': 'off',
}
