/**
 * Jest babel transformer for @astro-form/core.
 *
 * @modern-js/plugin-testing's default transformer uses
 * `@modern-js/babel-preset/node` with legacy decorators, which forces
 * `@babel/plugin-transform-class-properties`. That shared class-features
 * pipeline errors on `#privateMethod` unless private-methods plugins are
 * also enabled (see babel helper-create-class-features-plugin).
 *
 * Node 16+ supports private methods natively, so preset-env would skip them
 * — but the forced class-properties include still visits the class and fails.
 */

// Resolve through plugin-testing so we reuse the same babel stack as Modern.js
// without adding duplicate babel deps under packages/core.
const pluginTestingEntry = require.resolve('@modern-js/plugin-testing')

function resolveFromPluginTesting(request) {
  return require.resolve(request, { paths: [pluginTestingEntry] })
}

const { createTransformer } = require(resolveFromPluginTesting('babel-jest'))

module.exports = createTransformer({
  presets: [
    [
      resolveFromPluginTesting('@modern-js/babel-preset/node'),
      {
        pluginDecorators: {
          version: 'legacy',
        },
        // Merged into preset-env.include together with class-properties when
        // legacy decorators are enabled (see @modern-js/babel-preset base.js).
        presetEnv: {
          include: ['@babel/plugin-transform-private-methods', '@babel/plugin-transform-private-property-in-object'],
        },
      },
    ],
    [
      resolveFromPluginTesting('@babel/preset-react'),
      {
        runtime: 'automatic',
      },
    ],
  ],
  configFile: false,
  babelrc: false,
})
