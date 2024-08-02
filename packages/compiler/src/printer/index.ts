/* eslint-disable no-restricted-syntax */
import type * as t from '@astrojs/compiler/types'
import { is } from '@astrojs/compiler/utils'

import { SourceMap } from '../shared/source-map'
import type { TransformOptions } from '../index'

import { printSlotElement, printElementWithSlotAttribute } from './print-slot'
import { getElementName, getFormPropsName } from './utils'
import { printGlobalExpression } from './print-frontmatter'
import { printComponent } from './print-component'

export function print(node: t.Node, opts: TransformOptions): SourceMap {
  if (is.root(node)) {
    return printRoot(node, opts)
  }
  if (is.frontmatter(node)) {
    // frontmatter 得单独在外面处理
    return new SourceMap()
  }
  if (is.expression(node)) {
    return printExpression(node, opts)
  }
  if (is.literal(node)) {
    return printLiteral(node, opts)
  }
  if (is.tag(node)) {
    return printTag(node, opts)
  }
  throw new Error('unsupported node type')
}

function printRoot(node: t.RootNode, opts: TransformOptions) {
  const rootNode = new SourceMap()
  rootNode.add(...node.children.map((child) => print(child, opts)))
  return rootNode
}

function printExpression(node: t.ExpressionNode, opts: TransformOptions) {
  const expressionNode = new SourceMap()
  expressionNode.add(`{`, ...node.children.map((child) => print(child, opts)), `}`)
  return expressionNode
}

function printLiteral(node: t.LiteralNode, opts: TransformOptions) {
  const literalNode = new SourceMap()
  if (is.comment(node)) {
    return literalNode
  }
  literalNode.add(
    new SourceMap({
      filename: opts.filename,
      line: node.position!.start.line,
      column: node.position!.start.column,
      target: node.value,
      source: node.value,
      sourceOffset: node.position!.start.offset,
    })
  )
  return literalNode
}

function printTag(node: t.TagLikeNode, opts: TransformOptions) {
  const tagNode = new SourceMap()
  if (node.name === 'slot') {
    return printSlotElement(node as t.ElementNode, opts)
  }
  const elementName = getElementName(node.name, opts.isLanguageServer)
  tagNode.add(
    '<',
    new SourceMap({
      filename: opts.filename,
      line: node.position!.start.line,
      column: node.position!.start.column,
      target: elementName,
      source: node.name,
      sourceOffset: node.position!.start.offset + 1,
    })
  )
  tagNode.add(...node.attributes.map((attr) => printAttribute(attr, opts)))
  if (node.children.length === 0) {
    tagNode.add(` />`)
  } else {
    const [slotSourceMap, normalNodes] = printElementWithSlotAttribute(node.children, opts)
    tagNode.add(slotSourceMap, '>')
    tagNode.add(...normalNodes.map((child) => print(child, opts)), `</${elementName}>`)
  }
  return tagNode
}

function printAttribute(node: t.AttributeNode, opts: TransformOptions) {
  const attributeNode = new SourceMap()
  attributeNode.add(' ')
  const attrName = getFormPropsName(node.name, opts.isLanguageServer)
  switch (node.kind) {
    case 'empty':
      attributeNode.add(
        new SourceMap({
          filename: opts.filename,
          line: node.position!.start.line,
          column: node.position!.start.column,
          target: attrName,
          source: node.name,
          sourceOffset: node.position!.start.offset,
        })
      )
      break
    case 'expression':
      attributeNode.add(
        new SourceMap({
          filename: opts.filename,
          line: node.position!.start.line,
          column: node.position!.start.column,
          target: `${attrName}={${node.value}}`,
          source: `${node.name}={${node.value}}`,
          sourceOffset: node.position!.start.offset,
        })
      )
      break
    case 'quoted':
      attributeNode.add(
        new SourceMap({
          filename: opts.filename,
          line: node.position!.start.line,
          column: node.position!.start.column,
          // AstroFieldComponent 组件是泛型，为了正确推导 props 类型，as 得是 const
          target: attrName === 'as' ? `${attrName}={"${node.value}" as const}` : `${attrName}="${node.value}"`,
          source: `${node.name}="${node.value}"`,
          sourceOffset: node.position!.start.offset,
        })
      )
      break
    case 'template-literal':
      attributeNode.add(
        new SourceMap({
          filename: opts.filename,
          line: node.position!.start.line,
          column: node.position!.start.column,
          target: `${attrName}={\`${node.value}\`}`,
          source: `${node.name}={\`${node.value}\`}`,
          sourceOffset: node.position!.start.offset,
        })
      )
      break
    case 'shorthand': {
      // don't supported
      break
    }
    case 'spread':
      attributeNode.add(
        new SourceMap({
          filename: opts.filename,
          line: node.position!.start.line,
          column: node.position!.start.column,
          target: `{...${node.name}}`,
          source: `{...${node.name}}`,
          sourceOffset: node.position!.start.offset - 4,
        })
      )
      break
    default:
      break
  }
  return attributeNode
}

export function doPrint(node: t.Node, opts: TransformOptions, globalExpression: string) {
  const sourceMap = new SourceMap()
  // locate frontmatter
  let frontmatterNode: t.FrontmatterNode | undefined
  if (is.root(node) && node.children[0].type === 'frontmatter') {
    // eslint-disable-next-line prefer-destructuring
    frontmatterNode = node.children[0]
  }
  sourceMap.add(printGlobalExpression(opts, globalExpression))
  sourceMap.add(printComponent(node, frontmatterNode, opts))
  return sourceMap
}
