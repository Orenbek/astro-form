import { SourceMap } from '../shared/source-map'
import { TransformOptions } from '..'

export function printGlobalExpression(opts: TransformOptions, globalFrontmatter: string) {
  const frontmatterNode = new SourceMap()
  if (!opts.isLanguageServer) {
    frontmatterNode.add(`import * as $$React from 'react'
import {useForm as useForm$$, f as $$Field, useRef as useRef$$, observer as $$observer, AstroFormGlobal, passRefToChild as $$passRefToChild, hasSlotProp as $$hasSlotProp,getFormProps as $$getFormProps} from '@astro-form/react'\n`)
  } else {
    frontmatterNode.add(`import {AstroFormGlobal} from '@astro-form/react'\n`)
  }
  if (globalFrontmatter) {
    frontmatterNode.add(
      new SourceMap({
        filename: opts.filename,
        line: 1,
        column: 1,
        target: globalFrontmatter,
        source: globalFrontmatter,
        sourceOffset: 0,
      })
    )
  }
  frontmatterNode.add(`\ninterface Props {}\n`)
  return frontmatterNode
}
