import { createLanguageServicePlugin } from '@volar/typescript/lib/quickstart/createLanguageServicePlugin'

import { getLanguagePlugin } from './language'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export = createLanguageServicePlugin(() => ({
  languagePlugins: [getLanguagePlugin()],
}))

// this file needs to be bundled separately
