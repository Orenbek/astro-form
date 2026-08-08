import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { StorybookConfig } from 'storybook-react-rsbuild'

/**
 * Resolve absolute package path for Yarn PnP / monorepo installs.
 */
const getAbsolutePath = (value: string): string => {
  return resolve(fileURLToPath(new URL(import.meta.resolve(`${value}/package.json`, import.meta.url))), '..')
}

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    {
      name: getAbsolutePath('storybook-addon-rslib'),
    },
  ],
  framework: {
    // @ts-ignore
    name: getAbsolutePath('storybook-react-rsbuild'),
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen-typescript',
    check: true,
  },
}

export default config
