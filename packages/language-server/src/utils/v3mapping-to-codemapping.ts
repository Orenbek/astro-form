/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
import { CodeMapping } from '@volar/language-core'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { decode } from '@jridgewell/sourcemap-codec'
import type { TransformResult } from '@astro-form/compiler'

import { LANGUAGE_ID } from './constant'

export function v3mappingToCodemapping(input: string, transformed: TransformResult, fileName: string): CodeMapping[] {
  const v3Mappings = decode(transformed.map.mappings)
  const sourcedDoc = TextDocument.create(fileName, LANGUAGE_ID, 0, input)
  const genDoc = TextDocument.create(`${fileName}.tsx`, 'typescriptreact', 0, transformed.code)
  const mappings: CodeMapping[] = []
  let current:
    | {
        genOffset: number
        sourceOffset: number
      }
    | undefined

  for (let genLine = 0; genLine < v3Mappings.length; genLine++) {
    for (const segment of v3Mappings[genLine]) {
      const genCharacter = segment[0]
      const genOffset = genDoc.offsetAt({ line: genLine, character: genCharacter })
      if (current) {
        let length = genOffset - current.genOffset
        const sourceText = input.substring(current.sourceOffset, current.sourceOffset + length)
        const genText = transformed.code.substring(current.genOffset, current.genOffset + length)
        if (sourceText !== genText) {
          length = 0
          for (let i = 0; i < genOffset - current.genOffset; i++) {
            if (sourceText[i] === genText[i]) {
              length = i + 1
            } else {
              break
            }
          }
        }
        if (length > 0) {
          const lastMapping = mappings.length ? mappings[mappings.length - 1] : undefined
          if (
            lastMapping &&
            lastMapping.generatedOffsets[0] + lastMapping.lengths[0] === current.genOffset &&
            lastMapping.sourceOffsets[0] + lastMapping.lengths[0] === current.sourceOffset
          ) {
            lastMapping.lengths[0] += length
          } else {
            mappings.push({
              sourceOffsets: [current.sourceOffset],
              generatedOffsets: [current.genOffset],
              lengths: [length],
              data: {
                verification: true,
                completion: true,
                semantic: true,
                navigation: true,
                structure: true,
                format: false,
              },
            })
          }
        }
        current = undefined
      }
      if (segment[2] !== undefined && segment[3] !== undefined) {
        const sourceOffset = sourcedDoc.offsetAt({ line: segment[2], character: segment[3] })
        current = {
          genOffset,
          sourceOffset,
        }
      }
    }
  }
  return mappings
}
