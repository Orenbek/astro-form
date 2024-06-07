/* eslint-disable no-plusplus */
import {
  CodeMapping,
  TypeScriptExtraServiceScript,
  forEachEmbeddedCode,
  type LanguagePlugin,
  type VirtualCode,
} from '@volar/language-core'
import type * as ts from 'typescript'
import * as html from 'vscode-html-languageservice'
import { URI } from 'vscode-uri'

export const html1LanguagePlugin: LanguagePlugin<URI, Html1VirtualCode> = {
  getLanguageId(uri) {
    if (uri.path.endsWith('.aform')) {
      return 'astro-form'
    }
    return undefined
  },
  createVirtualCode(_uri, languageId, snapshot) {
    if (languageId === 'astro-form') {
      const fileName = _uri.toString()
      return new Html1VirtualCode(snapshot)
    }
    return undefined
  },
  updateVirtualCode(_scriptId, astroCode, snapshot) {
    astroCode.update(snapshot)
    return astroCode
  },
  typescript: {
    extraFileExtensions: [{ extension: 'aform', isMixedContent: true, scriptKind: 7 satisfies ts.ScriptKind.Deferred }],
    getServiceScript() {
      return undefined
    },
    getExtraServiceScripts(fileName, root) {
      const scripts: TypeScriptExtraServiceScript[] = []
      // eslint-disable-next-line no-restricted-syntax
      for (const code of forEachEmbeddedCode(root)) {
        if (code.languageId === 'javascript') {
          scripts.push({
            fileName: `${fileName}.${code.id}.js`,
            code,
            extension: '.js',
            scriptKind: 1 satisfies ts.ScriptKind.JS,
          })
        } else if (code.languageId === 'typescript') {
          scripts.push({
            fileName: `${fileName}.${code.id}.ts`,
            code,
            extension: '.ts',
            scriptKind: 3 satisfies ts.ScriptKind.TS,
          })
        }
      }
      return scripts
    },
  },
}

const htmlLs = html.getLanguageService()

export class Html1VirtualCode implements VirtualCode {
  id = 'root'

  languageId = 'astro-form'

  mappings!: CodeMapping[]

  embeddedCodes: VirtualCode[] = []

  // Reuse in custom language service plugin
  htmlDocument!: html.HTMLDocument

  constructor(public snapshot: ts.IScriptSnapshot) {
    this.onSnapshotUpdated()
  }

  public update(newSnapshot: ts.IScriptSnapshot) {
    this.snapshot = newSnapshot
    this.onSnapshotUpdated()
  }

  public onSnapshotUpdated() {
    // Do something with the snapshot
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
    this.htmlDocument = htmlLs.parseHTMLDocument(
      html.TextDocument.create('', 'html', 0, this.snapshot.getText(0, this.snapshot.getLength()))
    )
    this.embeddedCodes = [...getHtml1EmbeddedCodes(this.snapshot, this.htmlDocument)]
  }
}

function* getHtml1EmbeddedCodes(snapshot: ts.IScriptSnapshot, htmlDocument: html.HTMLDocument): Generator<VirtualCode> {
  const styles = htmlDocument.roots.filter((root) => root.tag === 'style')
  const scripts = htmlDocument.roots.filter((root) => root.tag === 'script')

  for (let i = 0; i < styles.length; i++) {
    const style = styles[i]
    if (style.startTagEnd !== undefined && style.endTagStart !== undefined) {
      const styleText = snapshot.getText(style.startTagEnd, style.endTagStart)
      yield {
        id: `style_${i}`,
        languageId: 'css',
        snapshot: {
          getText: (start, end) => styleText.substring(start, end),
          getLength: () => styleText.length,
          getChangeRange: () => undefined,
        },
        mappings: [
          {
            sourceOffsets: [style.startTagEnd],
            generatedOffsets: [0],
            lengths: [styleText.length],
            data: {
              completion: true,
              format: true,
              navigation: true,
              semantic: true,
              structure: true,
              verification: true,
            },
          },
        ],
        embeddedCodes: [],
      }
    }
  }

  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i]
    if (script.startTagEnd !== undefined && script.endTagStart !== undefined) {
      const text = snapshot.getText(script.startTagEnd, script.endTagStart)
      const lang = script.attributes?.lang
      const isTs = lang === 'ts' || lang === '"ts"' || lang === "'ts'"
      yield {
        id: `script_${i}`,
        languageId: isTs ? 'typescript' : 'javascript',
        snapshot: {
          getText: (start, end) => text.substring(start, end),
          getLength: () => text.length,
          getChangeRange: () => undefined,
        },
        mappings: [
          {
            sourceOffsets: [script.startTagEnd],
            generatedOffsets: [0],
            lengths: [text.length],
            data: {
              completion: true,
              format: true,
              navigation: true,
              semantic: true,
              structure: true,
              verification: true,
            },
          },
        ],
        embeddedCodes: [],
      }
    }
  }
}
