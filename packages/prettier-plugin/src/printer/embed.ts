/* eslint-disable no-param-reassign */

import type { Doc, Options } from 'prettier'
import * as _doc from 'prettier/doc'

import type { AttributeNode, ExpressionNode, FragmentNode, Node } from './nodes'
import {
  atSignReplace,
  closingBracketReplace,
  dotReplace,
  interrogationReplace,
  isNodeWithChildren,
  isTagLikeNode,
  isTextNode,
  openingBracketReplace,
  printRaw,
  type AstPath,
} from './utils'

const {
  builders: { group, indent, line, softline, hardline, lineSuffixBoundary },
  utils: { stripTrailingHardline, mapDoc },
} = _doc

// https://prettier.io/docs/en/plugins.html#optional-embed
type TextToDoc = (text: string, options: Options) => Promise<Doc>

type Embed =
  | ((
      path: AstPath,
      options: Options
    ) =>
      | ((
          textToDoc: TextToDoc,
          print: (selector?: string | number | Array<string | number> | AstPath) => Doc,
          path: AstPath,
          options: Options
        ) => Promise<Doc | undefined> | Doc | undefined)
      | Doc
      | null)
  | undefined

export const embed = ((path: AstPath, options: Options) => {
  return async (textToDoc, print) => {
    const { node } = path

    if (!node) return undefined

    if (node.type === 'expression') {
      const jsxNode = makeNodeJSXCompatible<ExpressionNode>(node)
      const textContent = printRaw(jsxNode)

      let content: Doc

      content = await wrapParserTryCatch(textToDoc, textContent, {
        ...options,
        parser: 'astroExpressionParser',
      })

      content = stripTrailingHardline(content)

      // HACK: Bit of a weird hack to get if a document is exclusively comments
      // Using `mapDoc` directly to build the array for some reason caused it to always be undefined? Not sure why
      const strings: string[] = []
      mapDoc(content, (doc) => {
        if (typeof doc === 'string') {
          strings.push(doc)
        }
      })

      if (strings.every((value) => value.startsWith('//'))) {
        return group(['{', content, softline, lineSuffixBoundary, '}'])
      }

      // Create a Doc without the things we had to add to make the expression compatible with Babel
      const astroDoc = mapDoc(content, (doc) => {
        if (typeof doc === 'string') {
          doc = doc.replaceAll(openingBracketReplace, '{')
          doc = doc.replaceAll(closingBracketReplace, '}')
          doc = doc.replaceAll(atSignReplace, '@')
          doc = doc.replaceAll(dotReplace, '.')
          doc = doc.replaceAll(interrogationReplace, '?')
        }

        return doc
      })

      return group(['{', indent([softline, astroDoc]), softline, lineSuffixBoundary, '}'])
    }

    // Attribute using an expression as value
    if (node.type === 'attribute' && node.kind === 'expression') {
      const value = node.value.trim()
      const name = node.name.trim()

      const attrNodeValue = await wrapParserTryCatch(textToDoc, value, {
        ...options,
        parser: 'astroExpressionParser',
      })

      if (name === value && options.astroAllowShorthand) {
        return [line, '{', attrNodeValue, '}']
      }

      return [line, name, '=', '{', attrNodeValue, '}']
    }

    if (node.type === 'attribute' && node.kind === 'spread') {
      const spreadContent = await wrapParserTryCatch(textToDoc, node.name, {
        ...options,
        parser: 'astroExpressionParser',
      })

      return [line, '{...', spreadContent, '}']
    }

    // Frontmatter
    if (node.type === 'frontmatter') {
      if (options.astroSkipFrontmatter) {
        return [group(['---', node.value, '---', hardline]), hardline]
      }

      const frontmatterContent = await wrapParserTryCatch(textToDoc, node.value, {
        ...options,
        parser: 'babel-ts',
      })
      return [group(['---', hardline, frontmatterContent, hardline, '---', hardline]), hardline]
    }

    // GlobalExpression
    if (node.type === 'global-expression') {
      const globalExpressionContent = await wrapParserTryCatch(textToDoc, node.value, {
        ...options,
        parser: 'babel-ts',
      })
      return [group([globalExpressionContent, hardline]), hardline]
    }

    return undefined
  }
}) satisfies Embed

async function wrapParserTryCatch(cb: TextToDoc, text: string, options: Options) {
  try {
    return await cb(text, options)
  } catch (e) {
    // If we couldn't parse the expression (ex: syntax error) and we throw here, Prettier fallback to `print` and we'll
    // get a totally useless error message (ex: unhandled node type). An undocumented way to work around this is to set
    // `PRETTIER_DEBUG=1`, but nobody know that exists / want to do that just to get useful error messages. So we force it on
    process.env.PRETTIER_DEBUG = 'true'
    throw e
  }
}

/**
 * Due to the differences between Astro and JSX, Prettier's TypeScript parsers (be it `typescript` or `babel-ts`) are not
 * able to parse all expressions. So we need to first make the expression compatible before passing it to the parser
 *
 * A list of the difference that matters here:
 * - Astro allows a shorthand syntax for props. ex: `<Component {props} />`
 * - Astro allows multiple root elements. ex: `<div></div><div></div>`
 * - Astro allows attributes to include at signs (@) and dots (.)
 */
function makeNodeJSXCompatible<T>(node: any): T {
  const newNode = { ...node }
  const childBundle: Node[][] = []
  let childBundleIndex = 0

  if (isNodeWithChildren(newNode)) {
    newNode.children = newNode.children.reduce((result: Node[], child, index) => {
      const previousChildren = newNode.children[index - 1]
      const nextChildren = newNode.children[index + 1]
      if (isTagLikeNode(child)) {
        child.attributes = child.attributes.map(makeAttributeJSXCompatible)

        if (!childBundle[childBundleIndex]) {
          childBundle[childBundleIndex] = []
        }

        if (isNodeWithChildren(child)) {
          child = makeNodeJSXCompatible<typeof child>(child)
        }

        // If we don't have a previous children, or it's not an element AND
        // we have a next children, and it's an element. Add the current children to the bundle
        if ((!previousChildren || isTextNode(previousChildren)) && nextChildren && isTagLikeNode(nextChildren)) {
          childBundle[childBundleIndex].push(child)
          return result
        }

        // If we have a previous children, and it's an element AND
        // we have a next children, and it's also an element. Add the current children to the bundle
        if (previousChildren && isTagLikeNode(previousChildren) && nextChildren && isTagLikeNode(nextChildren)) {
          childBundle[childBundleIndex].push(child)
          return result
        }

        // If we have elements in our bundle, and there's no next children, or it's a text node
        // Create a fake parent, and add all the previous encountered elements as children of it
        if ((!nextChildren || isTextNode(nextChildren)) && childBundle[childBundleIndex].length > 0) {
          childBundle[childBundleIndex].push(child)

          const parentNode: FragmentNode = {
            type: 'fragment',
            name: '',
            attributes: [],
            children: childBundle[childBundleIndex],
          }

          childBundleIndex += 1
          result.push(parentNode)
          return result
        }
      } else {
        childBundleIndex += 1
      }

      result.push(child)
      return result
    }, [])
  }

  return newNode

  function makeAttributeJSXCompatible(attr: AttributeNode): AttributeNode {
    // Transform shorthand attributes into an empty attribute, ex: `{shorthand}` becomes `shorthand` and wrap it
    // so we can transform it back into {}
    if (attr.kind === 'shorthand') {
      attr.kind = 'empty'
      attr.name = openingBracketReplace + attr.name + closingBracketReplace
    }

    // For spreads, we don't need to do anything because it should already be JSX compatible
    if (attr.kind !== 'spread') {
      if (attr.name.includes('@')) {
        attr.name = attr.name.replaceAll('@', atSignReplace)
      }

      if (attr.name.includes('.')) {
        attr.name = attr.name.replaceAll('.', dotReplace)
      }

      if (attr.name.includes('?')) {
        attr.name = attr.name.replaceAll('?', interrogationReplace)
      }
    }

    return attr
  }
}
