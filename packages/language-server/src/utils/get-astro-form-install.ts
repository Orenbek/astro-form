import * as path from 'node:path'

import { getPackagePath } from '../plugins/utils'

export interface AstroFormInstall {
  path: string
  version: {
    full: string
    major: number
    minor: number
    patch: number
  }
}

export function getAstroFormInstall(
  basePaths: string[],
  checkForAstro?: {
    nearestPackageJson: string | undefined
    readDirectory: typeof import('typescript').sys.readDirectory
  }
): AstroFormInstall | 'not-found' {
  let astroFormPath
  let version

  if (checkForAstro && checkForAstro.nearestPackageJson) {
    basePaths.push(path.dirname(checkForAstro.nearestPackageJson))

    const deps: Set<string> = new Set()
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const packageJSON = require(checkForAstro.nearestPackageJson)
      ;[
        ...Object.keys(packageJSON.dependencies ?? {}),
        ...Object.keys(packageJSON.devDependencies ?? {}),
        ...Object.keys(packageJSON.peerDependencies ?? {}),
      ].forEach((dep) => deps.add(dep))
    } catch {}

    if (!deps.has('@astro-form/react')) {
      return 'not-found'
    }
  }

  try {
    astroFormPath = getPackagePath('@astro-form/react', basePaths)

    if (!astroFormPath) {
      throw Error('')
    }

    // eslint-disable-next-line import/no-dynamic-require, global-require
    version = require(path.resolve(astroFormPath, 'package.json')).version
  } catch {
    // If we couldn't find it inside the workspace's node_modules, it might means we're in the monorepo
    return 'not-found'
  }

  if (!version) {
    return 'not-found'
  }

  // eslint-disable-next-line prefer-const
  let [major, minor, patch] = version.split('.')

  if (patch.includes('-')) {
    const patchParts = patch.split('-')
    // eslint-disable-next-line prefer-destructuring
    patch = patchParts[0]
  }

  return {
    path: astroFormPath,
    version: {
      full: version,
      major: Number(major),
      minor: Number(minor),
      patch: Number(patch),
    },
  }
}
