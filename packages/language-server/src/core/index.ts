/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
import path from 'node:path'

import { type CodeMapping, type LanguagePlugin, type VirtualCode, forEachEmbeddedCode } from '@volar/language-core'
import type { DiagnosticMessage } from '@astrojs/compiler/types'
import type * as ts from 'typescript'
import type { HTMLDocument } from 'vscode-html-languageservice'
import { URI } from 'vscode-uri'

import { AstroMetadata, getAstroMetadata } from './parseAstroForm'
import { parseHTML } from './parseHTML'

const LANGUAGE_ID = 'astro-form'

export const AstroFormLanguagePlugin: LanguagePlugin<URI, AstroFormVirtualCode> = {
  getLanguageId(uri) {
    if (uri.path.endsWith('.aform')) {
      return LANGUAGE_ID
    }
    return undefined
  },
  createVirtualCode(_uri, languageId, snapshot) {
    if (languageId === LANGUAGE_ID) {
      const fileName = path.basename(_uri.path)
      return new AstroFormVirtualCode(fileName, snapshot)
    }
    return undefined
  },
  updateVirtualCode(_scriptId, astroFormCode, snapshot) {
    astroFormCode.update(snapshot)
    return astroFormCode
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
    // TODO 这里应该还有其他 functionality 需要补充
  },
}

export class AstroFormVirtualCode implements VirtualCode {
  id = 'root'

  languageId = LANGUAGE_ID

  mappings!: CodeMapping[]

  embeddedCodes: VirtualCode[] = []

  htmlDocument!: HTMLDocument

  astroMeta!: AstroMetadata

  compilerDiagnostics!: DiagnosticMessage[]

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

  public onSnapshotUpdated() {
    this.mappings = [
      {
        sourceOffsets: [0],
        generatedOffsets: [0],
        lengths: [this.snapshot.getLength()],
        data: {
          completion: true,
          format: true,
          navigation: true,
          semantic: true,
          structure: true,
          verification: true,
        },
      },
    ]
    this.compilerDiagnostics = []

    const astroMetadata = getAstroMetadata(this.fileName, this.snapshot.getText(0, this.snapshot.getLength()))

    if (astroMetadata.diagnostics.length > 0) {
      this.compilerDiagnostics.push(...astroMetadata.diagnostics)
    }

    const { htmlDocument, virtualCode: htmlVirtualCode } = parseHTML(
      this.snapshot,
      astroMetadata.frontmatter.status === 'closed' ? astroMetadata.frontmatter.position.end.offset : 0
    )
    this.htmlDocument = htmlDocument
    this.embeddedCodes = []
    this.embeddedCodes.push(htmlVirtualCode)
  }
}
