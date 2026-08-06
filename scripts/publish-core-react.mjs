#!/usr/bin/env node
/**
 * Publish @astro-form/core + @astro-form/react with npm only.
 *
 * Why not pnpm publish: in this environment pnpm always hits
 * ERR_PNPM_OTP_NON_INTERACTIVE even with a bypass-2FA token.
 * npm publish works with .npmrc.local token.
 *
 * Policy:
 * - core and react versions are forced equal
 * - react depends on core with an exact version (no ^ / ~)
 * - local monorepo keeps "workspace:*"; only the published tarball uses exact version
 *
 * Usage:
 *   node scripts/publish-core-react.mjs              # publish current (synced) version
 *   node scripts/publish-core-react.mjs 0.1.3        # set both to 0.1.3 then publish
 *   node scripts/publish-core-react.mjs --dry-run
 *
 * Auth: repo-root .npmrc.local (gitignored), via NPM_CONFIG_USERCONFIG
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const registry = 'https://registry.npmjs.org/'
const authFile = path.join(root, '.npmrc.local')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const versionArg = args.find((a) => a !== '--dry-run')

const corePkgPath = path.join(root, 'packages/core/package.json')
const reactPkgPath = path.join(root, 'packages/react/package.json')

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`)
}

function run(cmd, cmdArgs, cwd) {
  console.log(`\n> ${cmd} ${cmdArgs.join(' ')}  (cwd: ${path.relative(root, cwd) || '.'})`)
  execFileSync(cmd, cmdArgs, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      NPM_CONFIG_USERCONFIG: authFile,
      npm_config_registry: registry,
    },
  })
}

if (!fs.existsSync(authFile)) {
  console.error(`Missing ${path.relative(root, authFile)}`)
  console.error('Create it with:')
  console.error('  //registry.npmjs.org/:_authToken=npm_YOUR_AUTOMATION_TOKEN')
  console.error('  auth-type=legacy')
  process.exit(1)
}

const corePkg = readJson(corePkgPath)
const reactPkg = readJson(reactPkgPath)

const version = versionArg || corePkg.version
if (!versionArg && corePkg.version !== reactPkg.version) {
  console.error(
    `Version mismatch: core@${corePkg.version} vs react@${reactPkg.version}.\n` +
      `Pass an explicit version: node scripts/publish-core-react.mjs x.y.z`
  )
  process.exit(1)
}

// 1) Sync versions on disk (local package.json)
corePkg.version = version
reactPkg.version = version
// Keep workspace protocol in the repo for monorepo installs.
reactPkg.dependencies = reactPkg.dependencies || {}
reactPkg.dependencies['@astro-form/core'] = 'workspace:*'
writeJson(corePkgPath, corePkg)
writeJson(reactPkgPath, reactPkg)
console.log(`Synced versions → @astro-form/core@${version}, @astro-form/react@${version}`)
console.log(`Local react dep stays workspace:* ; published tarball will use exact "${version}"`)

// 2) Build (package prepare scripts also build; explicit build first for clearer errors)
run('pnpm', ['--filter', '@astro-form/core', 'build'], root)
run('pnpm', ['--filter', '@astro-form/react', 'build'], root)

// 3) Publish core with npm
const publishArgs = ['publish', '--access', 'public', '--registry', registry]
if (dryRun) publishArgs.push('--dry-run')
run('npm', publishArgs, path.join(root, 'packages/core'))

// 4) Publish react: temporarily rewrite workspace:* → exact version for the tarball only
const reactBackup = structuredClone(reactPkg)
reactPkg.dependencies['@astro-form/core'] = version // exact, no caret
writeJson(reactPkgPath, reactPkg)
try {
  run('npm', publishArgs, path.join(root, 'packages/react'))
} finally {
  // Always restore monorepo workspace protocol
  writeJson(reactPkgPath, reactBackup)
  console.log('Restored packages/react dependency to workspace:*')
}

console.log(
  dryRun
    ? `\nDry run done for ${version}.`
    : `\nPublished @astro-form/core@${version} and @astro-form/react@${version} (dep: "${version}").`
)
