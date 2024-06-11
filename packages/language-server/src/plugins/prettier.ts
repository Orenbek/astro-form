import { LanguageServicePlugin, Connection, ShowMessageNotification, MessageType } from '@volar/language-server'
import { create as createPrettierService } from 'volar-service-prettier'
import { URI } from 'vscode-uri'

import { importPrettier, getPrettierPluginPath } from './utils'

export const create = (connection: Connection): LanguageServicePlugin => {
  let prettierPluginPath: string | undefined
  return createPrettierService(
    (context) => {
      const workspaceUri = context.env.workspaceFolders[0]
      if (workspaceUri.scheme === 'file') {
        prettierPluginPath = getPrettierPluginPath(workspaceUri.fsPath)
        return importPrettier(workspaceUri.fsPath)
      }
      return undefined
    },
    {
      documentSelector: ['astro-form'],
      getFormattingOptions: async (prettierInstance, document, formatOptions, context) => {
        const filePath = URI.parse(document.uri).fsPath

        if (!filePath) {
          return {}
        }

        let configOptions = null
        try {
          configOptions = await prettierInstance.resolveConfig(filePath, {
            // This seems to be broken since Prettier 3, and it'll always use its cumbersome cache. Hopefully it works one day.
            useCache: false,
            editorconfig: true,
          })
        } catch (e) {
          connection.sendNotification(ShowMessageNotification.type, {
            message: `Failed to load Prettier config.\n\nError:\n${e}`,
            type: MessageType.Warning,
          })
          console.error('Failed to load Prettier config.', e)
        }

        const editorOptions = await context.env.getConfiguration<object>?.('prettier', document.uri)

        // Return a config with the following cascade:
        // - Prettier config file should always win if it exists, if it doesn't:
        // - Prettier config from the VS Code extension is used, if it doesn't exist:
        // - Use the editor's basic configuration settings
        const resolvedConfig = {
          filepath: filePath,
          tabWidth: formatOptions.tabSize,
          useTabs: !formatOptions.insertSpaces,
          ...editorOptions,
          ...configOptions,
        }

        return {
          ...resolvedConfig,
          plugins: [...(prettierPluginPath ? [prettierPluginPath] : []), ...(resolvedConfig.plugins ?? [])],
          parser: 'astro-form',
        }
      },
    }
  )
}
