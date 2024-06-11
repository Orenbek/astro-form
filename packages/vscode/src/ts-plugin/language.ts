/* eslint-disable no-restricted-syntax */
/* eslint-disable consistent-return */
import path from 'node:path'

import { type CodeMapping, type LanguagePlugin, type VirtualCode, forEachEmbeddedCode } from '@volar/language-core'
import type ts from 'typescript'
import { URI } from 'vscode-uri'

import { astro2tsx } from './astro2tsx'

const LANGUAGE_ID = 'astro-form'

export function getLanguagePlugin(): LanguagePlugin<URI, AstroFormVirtualCode> {
  return {
    getLanguageId(scriptId) {
      if (scriptId.path.endsWith('.aform')) {
        return LANGUAGE_ID
      }
      return undefined
    },
    createVirtualCode(scriptId, languageId, snapshot) {
      if (languageId === LANGUAGE_ID) {
        const fileName = path.basename(scriptId.path)
        return new AstroFormVirtualCode(fileName, snapshot)
      }
      return undefined
    },
    updateVirtualCode(_scriptId, astroFile, snapshot) {
      astroFile.update(snapshot)
      return astroFile
    },
    typescript: {
      extraFileExtensions: [{ extension: 'aform', isMixedContent: true, scriptKind: 7 }],
      getServiceScript(astroFormCode) {
        for (const code of forEachEmbeddedCode(astroFormCode)) {
          if (code.id === 'tsx') {
            return {
              code,
              extension: '.tsx',
              scriptKind: 4 satisfies ts.ScriptKind.TSX,
            }
          }
        }
        return undefined
      },
    },
  }
}

export class AstroFormVirtualCode implements VirtualCode {
  id = 'root'

  languageId = LANGUAGE_ID

  mappings!: CodeMapping[]

  embeddedCodes!: VirtualCode[]

  codegenStacks = []

  constructor(
    public fileName: string,
    public snapshot: ts.IScriptSnapshot
  ) {
    this.onSnapshotUpdated()
  }

  public update(newSnapshot: ts.IScriptSnapshot) {
    this.snapshot = newSnapshot
    this.onSnapshotUpdated()
  }

  onSnapshotUpdated() {
    this.mappings = [
      {
        sourceOffsets: [0],
        generatedOffsets: [0],
        lengths: [this.snapshot.getLength()],
        data: {
          verification: true,
          completion: true,
          semantic: true,
          navigation: true,
          structure: true,
          format: false,
        },
      },
    ]

    this.embeddedCodes = []

    const tsx = astro2tsx(this.snapshot.getText(0, this.snapshot.getLength()), this.fileName)

    this.embeddedCodes.push(tsx.virtualFile)
  }
}
