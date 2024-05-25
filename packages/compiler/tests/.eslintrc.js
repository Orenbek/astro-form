// eslint-disable-next-line import/no-commonjs
module.exports = {
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: require.resolve('./tsconfig.json'),
  },
}
