import type { FrontmatterNode } from '@astrojs/compiler/types'

import { SourceMap } from '../shared/source-map'
import { TransformOptions } from '..'

import { splitFrontMatterIntoGlobalStatementAndComponentExpression } from './utils'

export function printFrotmatter(node: FrontmatterNode | undefined, opts: TransformOptions) {
  const frontmatterNode = new SourceMap()
  frontmatterNode.add(`import * as $$React from 'react'
import {useForm as useForm$$, f as $$Field, useRef as useRef$$, observer as $$observer, AstroFormGlobal, passRefToChild as $$passRefToChild, hasSlotProp as $$hasSlotProp,getFormProps as $$getFormProps} from '@astro-form/react'
`)
  if (node) {
    const [globalStatement] = splitFrontMatterIntoGlobalStatementAndComponentExpression(node.value, opts.source)
    frontmatterNode.add(
      new SourceMap({
        filename: opts.filename,
        line: globalStatement.line,
        column: globalStatement.column,
        target: globalStatement.code,
        source: globalStatement.code,
        sourceOffset: globalStatement.offset,
      })
    )
  }
  return frontmatterNode
}
