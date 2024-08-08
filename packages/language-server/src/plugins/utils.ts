import { dirname } from 'node:path'

import type { DocumentContext, HTMLDocument, Node } from 'vscode-html-languageservice'
import type * as prettier from 'prettier'
import { LanguageServiceContext } from '@volar/language-server'
import { URI, Utils } from 'vscode-uri'

import type { FrontmatterStatus } from '../core/parseAstroForm'

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

/**
 * Return if a given offset is inside the frontmatter
 */
export function isInsideFrontmatter(offset: number, frontmatter: FrontmatterStatus) {
  switch (frontmatter.status) {
    case 'closed':
      return offset > frontmatter.position.start.offset && offset < frontmatter.position.end.offset
    case 'open':
      return offset > frontmatter.position.start.offset
    case 'doesnt-exist':
      return false
    default:
      return false
  }
}

export function isBeforeFrontmatter(offset: number, frontmatter: FrontmatterStatus, globalExpression: string) {
  switch (frontmatter.status) {
    case 'closed':
      return offset < globalExpression.length
    case 'open':
      return offset < globalExpression.length
    case 'doesnt-exist':
      return false
    default:
      return false
  }
}

const reg = /^[a-zA-Z:]+/
export function textSelectionOnOffset(text: string, offset: number) {
  const before = text.slice(0, offset).split('').reverse().join('')
  const after = text.slice(offset)
  const beforeMatch = before.match(reg)
  const afterMatch = after.match(reg)
  return `${beforeMatch ? beforeMatch[0].split('').reverse().join('') : ''}${afterMatch ? afterMatch[0] : ''}`
}

export function getDocumentContext(context: LanguageServiceContext): DocumentContext {
  return {
    resolveReference(ref, base) {
      let baseUri = URI.parse(base)
      const decoded = context.decodeEmbeddedDocumentUri(baseUri)
      if (decoded) {
        // eslint-disable-next-line prefer-destructuring
        baseUri = decoded[0]
      }
      return resolveReference(ref, baseUri, context.env.workspaceFolders)
    },
  }
}
function resolveReference(ref: string, baseUri: URI, workspaceFolders: URI[]) {
  if (ref.match(/^\w[\w\d+.-]*:/)) {
    // starts with a schema
    return ref
  }
  if (ref[0] === '/') {
    // resolve absolute path against the current workspace folder
    const folderUri = getRootFolder()
    if (folderUri) {
      return folderUri + ref.substr(1)
    }
  }
  const baseUriDir = baseUri.path.endsWith('/') ? baseUri : Utils.dirname(baseUri)
  return Utils.resolvePath(baseUriDir, ref).toString(true)

  // eslint-disable-next-line consistent-return
  function getRootFolder(): string | undefined {
    // eslint-disable-next-line no-restricted-syntax
    for (const folder of workspaceFolders) {
      let folderURI = folder.toString()
      if (!folderURI.endsWith('/')) {
        folderURI += '/'
      }
      if (baseUri.toString().startsWith(folderURI)) {
        return folderURI
      }
    }
  }
}
