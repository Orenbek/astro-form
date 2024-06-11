import { dirname } from 'node:path'

import type { HTMLDocument, Node } from 'vscode-html-languageservice'
import type * as prettier from 'prettier'

/**
 * Return if a given position is inside a JSX expression
 */
export function isInsideExpression(html: string, tagStart: number, position: number) {
  const charactersInNode = html.substring(tagStart, position)
  return charactersInNode.lastIndexOf('{') > charactersInNode.lastIndexOf('}')
}

/**
 * Return true if a specific node could be a component.
 * This is not a 100% sure test as it'll return false for any component that does not match the standard format for a component
 */
export function isPossibleComponent(node: Node): boolean {
  return !!node.tag?.[0].match(/[A-Z]/) || !!node.tag?.match(/.+[.][A-Z]?/)
}

/**
 * Return if a given offset is inside the start tag of a component
 */
export function isInComponentStartTag(html: HTMLDocument, offset: number): boolean {
  const node = html.findNodeAt(offset)
  return isPossibleComponent(node) && (!node.startTagEnd || offset < node.startTagEnd)
}

/**
 * Get the path of a package's directory from the paths in `fromPath`, if `root` is set to false, it will return the path of the package's entry point
 */
export function getPackagePath(packageName: string, fromPath: string[], root = true): string | undefined {
  try {
    return root
      ? dirname(require.resolve(`${packageName}/package.json`, { paths: fromPath }))
      : require.resolve(packageName, { paths: fromPath })
  } catch (e) {
    return undefined
  }
}

export function importPrettier(fromPath: string): typeof prettier | undefined {
  const prettierPkg = getPackagePath('prettier', [fromPath, __dirname])
  if (!prettierPkg) {
    return undefined
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(prettierPkg)
}

export function getPrettierPluginPath(fromPath: string): string | undefined {
  const prettierPluginPath = getPackagePath('prettier-plugin-astro-form', [fromPath, __dirname], false)
  if (!prettierPluginPath) {
    return undefined
  }
  return prettierPluginPath
}
