export default {
  // 后端接口返回snake_case的情况比较多，关闭此配置
  camelcase: 'off',
  // 从实际应用来看，_xxx这种变量形式比较常见，关闭此项规则
  'no-underscore-dangle': 'off',
  // 针对immer.js，允许修改函数参数draft、draftState
  // 针对koa，允许修改函数参数ctx、req、res
  // 允许reduce方法的第一个参数acc
  'no-param-reassign': [
    'error',
    {
      props: true,
      ignorePropertyModificationsFor: ['draft', 'draftState', 'ctx', 'req', 'res', 'acc'],
    },
  ],
  // import时，可以忽略文件后缀
  'import/extensions': 'off',
  'import/no-unresolved': 'off',
  // 不推荐使用export default
  'import/prefer-default-export': 'off',
  // 对于开发过程中使用的文件，可以字节使用devDependencies里的包
  'import/no-extraneous-dependencies': [
    'error',
    {
      devDependencies: [
        'test/**',
        'scripts/**',
        '**/jest.config.js',
        '**/jest.config.ts',
        '**/jest.transform.js',
        '**/modern.config.ts',
        '**/*.test.js',
        '**/*.spec.js',
      ],
    },
  ],
  // 在prettier的格式化下，三元表达式能比较好的阅读
  // 从实际应用来看，嵌套的三元表达式能简化较多的代码
  'no-nested-ternary': 'off',
  // 允许 catch 内容为空
  'no-empty': ['error', { allowEmptyCatch: true }],
  // Promise禁用return xxx; 可能把 return value 与 resolve 混淆
  // https://eslint.org/docs/rules/no-promise-executor-return
  'no-promise-executor-return': 'error',
  // 与TS冲突的eslint config
  'no-undef': 'off',
  'no-shadow': 'off',
  'no-redeclare': 'off',
  'no-unused-vars': 'off',
  'no-use-before-define': 'off',
  // 不允许作用域内部有跟外部一样的变量名
  // 但是从实际应用出发，对于如下变量允许存在同名变量
  // ['data', 'res', 'e', 'err']
  '@typescript-eslint/no-shadow': [
    'error',
    {
      allow: ['data', 'res', 'e', 'err'],
    },
  ],
  // 未使用变量
  '@typescript-eslint/no-unused-vars': ['warn'],
  '@typescript-eslint/no-empty-interface': 'off',
  // 允许使用() => {}
  '@typescript-eslint/no-empty-function': 'off',
  // 不允许定义前使用变量，但是对于function和Class，允许放在文件尾部
  '@typescript-eslint/no-use-before-define': ['error', { classes: false, functions: false }],
  // 规则同时对ts和js生效，此条规则对js有问题，禁用
  '@typescript-eslint/no-var-requires': 'off',
  '@typescript-eslint/no-redeclare': ['error', { ignoreDeclarationMerge: true }],
  // 某些函数可以自动推导，因为这个规则，又必须多引入一些类型，有点冗余
  // 再者，结合ts的noImplicitAny，能强制要求不能自动推导的函数明确写返回值
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  // any 不能使用可能太严格了 不强制
  '@typescript-eslint/no-explicit-any': 'warn',
  // 不强制使用 interface 或者 type
  '@typescript-eslint/consistent-type-definitions': 'off',
  // val?.property 这种会直接报错，建议只是报 warning 并且不要 autofix 它
  '@typescript-eslint/no-unnecessary-condition': 'off',
  'no-autofix/@typescript-eslint/no-unnecessary-condition': 'warn',
  '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
  'no-autofix/@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
  // 建议使用 camelCase，强制要求不合适
  '@typescript-eslint/naming-convention': 'warn',
  // 配合 import/recommend 规则一起使用，需要关闭此规则
  'import/named': 'off',
  'import/order': [
    'warn',
    {
      'newlines-between': 'always',
      pathGroups: [
        {
          pattern: '{src,@}/**',
          group: 'internal',
        },
      ],
      groups: ['builtin', 'external', 'internal', 'parent', ['sibling', 'index']],
    },
  ],
}
