/* eslint-disable no-plusplus */
/* eslint-disable no-restricted-syntax */
import { transform, TransformResult } from '@astro-form/compiler'
import type { VirtualCode } from '@volar/language-core'

import { v3mappingToCodemapping } from './v3mapping-to-codemapping'

function safeConvertToTSX(content: string, filename: string) {
  try {
    const tsx = transform(content, filename)
    return tsx
  } catch (e) {
    console.error(
      `There was an error transforming ${filename} to TSX. An empty file will be returned instead. Error: ${e}.`
    )

    return {
      code: '',
      map: {
        file: filename,
        sources: [],
        sourcesContent: [],
        names: [],
        mappings: '',
        version: 0,
      },
      diagnostics: [
        {
          code: 1000,
          location: { file: filename, line: 1, column: 1, length: content.length },
          severity: 1,
          text: `The Astro compiler encountered an unknown error while parsing this file. Please create an issue with your code and the error shown in the server's logs`,
        },
      ],
    } satisfies TransformResult
  }
}

export function astro2tsx(input: string, fileName: string) {
  const tsx = safeConvertToTSX(input, fileName)
  const mappings = v3mappingToCodemapping(input, tsx, fileName)
  const virtualCode: VirtualCode = {
    id: 'tsx',
    languageId: 'typescriptreact',
    snapshot: {
      getText: (start, end) => tsx.code.substring(start, end),
      getLength: () => tsx.code.length,
      getChangeRange: () => undefined,
    },
    mappings,
    embeddedCodes: [],
  }
  return {
    virtualCode,
    diagnostics: tsx.diagnostics,
  }
}
