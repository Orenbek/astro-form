# @astro-form/ts-plugin

> Using the AstroForm VS Code extension? This plugin is automatically installed and configured for you.

TypeScript plugin adding support for `.aform` imports in `.ts` files. This plugin also adds support for renaming symbols and finding references across `.ts` and `.aform` files.

## Installation

```bash
npm install --save-dev @astro-form/ts-plugin
```

## Usage

Add the plugin to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@astro-form/ts-plugin"
      }
    ]
  }
}
```
