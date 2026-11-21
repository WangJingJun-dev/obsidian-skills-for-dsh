#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const VERSION = /^\d+\.\d+\.\d+$/
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function versionParts(version, subject) {
  if (!VERSION.test(version)) throw new Error(`${subject}: expected a plain semantic version, got "${version}"`)
  return version.split('.').map(Number)
}

export function compareVersions(left, right) {
  const a = versionParts(left, 'left version')
  const b = versionParts(right, 'right version')
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1
  }
  return 0
}

async function readJson(path, subject) {
  let raw
  try {
    raw = await readFile(path, 'utf8')
  } catch (error) {
    throw new Error(`${subject}: cannot read ${path}: ${error.message}`)
  }
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`${subject}: invalid JSON in ${path}: ${error.message}`)
  }
}

function gitCommit(directory) {
  try {
    return execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

export async function readUpstream(sourceDirectory) {
  const source = resolve(sourceDirectory)
  if (!existsSync(source)) throw new Error(`upstream source does not exist: ${source}`)

  const directPlugin = join(source, 'plugin.json')
  const nestedPlugin = join(source, 'plugins', 'obsidian', 'plugin.json')
  const pluginRoot = existsSync(directPlugin) ? source : dirname(nestedPlugin)
  const pluginManifestPath = join(pluginRoot, 'plugin.json')
  const manifest = await readJson(pluginManifestPath, 'upstream plugin')

  versionParts(manifest.version, `upstream plugin ${pluginManifestPath}`)
  const skillsRoot = join(pluginRoot, 'skills')
  const entries = await readdir(skillsRoot, { withFileTypes: true })
  const skills = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'))

  if (skills.length === 0) throw new Error(`${skillsRoot}: upstream package contains no skills`)
  for (const skill of skills) {
    if (!SKILL_NAME.test(skill)) throw new Error(`${skillsRoot}: invalid skill directory "${skill}"`)
    await readFile(join(skillsRoot, skill, 'SKILL.md'), 'utf8')
  }

  const upstreamRoot = pluginRoot === source ? resolve(source, '..', '..') : source
  return {
    source,
    pluginRoot,
    upstreamRoot,
    repoRoot: PACKAGE_ROOT,
    repository: typeof manifest.repository === 'string'
      ? manifest.repository
      : 'https://github.com/obsidianmd/obsidian-skills',
    version: manifest.version,
    commit: gitCommit(pluginRoot),
    skillsRoot,
    skills,
  }
}

async function readTarget(targetRoot) {
  const packagePath = join(targetRoot, 'package.json')
  const upstreamPath = join(targetRoot, 'upstream.json')
  const manifest = await readJson(packagePath, 'target package')
  let upstream = null
  if (existsSync(upstreamPath)) upstream = await readJson(upstreamPath, 'target upstream record')
  return { manifest, upstream, packagePath, upstreamPath }
}

export async function checkUpstream(sourceDirectory, options = {}) {
  const targetRoot = resolve(options.targetRoot ?? PACKAGE_ROOT)
  const target = await readTarget(targetRoot)
  const source = await readUpstream(sourceDirectory)
  const currentVersion = target.upstream?.version ?? target.manifest.version
  return {
    update: compareVersions(source.version, currentVersion) > 0,
    currentVersion,
    upstreamVersion: source.version,
    upstreamCommit: source.commit,
    skills: source.skills,
  }
}

export async function syncUpstream(sourceDirectory, options = {}) {
  const targetRoot = resolve(options.targetRoot ?? PACKAGE_ROOT)
  const force = options.force === true
  const target = await readTarget(targetRoot)
  const source = await readUpstream(sourceDirectory)
  const currentVersion = target.upstream?.version ?? target.manifest.version
  const comparison = compareVersions(source.version, currentVersion)

  if (comparison < 0) throw new Error(`upstream ${source.version} is older than packaged ${currentVersion}; refusing to downgrade`)
  if (comparison === 0 && !force) {
    return { changed: false, currentVersion, upstreamVersion: source.version, skills: source.skills }
  }

  const targetSkills = resolve(targetRoot, 'skills')
  if (dirname(targetSkills) !== targetRoot || basename(targetSkills) !== 'skills') {
    throw new Error(`refusing to replace unexpected skills path: ${targetSkills}`)
  }

  await rm(targetSkills, { recursive: true, force: true })
  await mkdir(targetSkills, { recursive: true })
  for (const skill of source.skills) {
    await cp(join(source.skillsRoot, skill), join(targetSkills, skill), { recursive: true })
  }

  const licensePath = join(source.upstreamRoot, 'LICENSE')
  if (existsSync(licensePath)) await cp(licensePath, join(targetRoot, 'LICENSE.upstream'))

  const syncedAt = new Date().toISOString()
  const record = {
    repository: source.repository,
    version: source.version,
    commit: source.commit,
    sourcePath: 'plugins/obsidian',
    syncedAt,
  }
  await writeFile(target.upstreamPath, `${JSON.stringify(record, null, 2)}\n`)

  target.manifest.version = source.version
  await writeFile(target.packagePath, `${JSON.stringify(target.manifest, null, 2)}\n`)

  return {
    changed: true,
    currentVersion,
    upstreamVersion: source.version,
    upstreamCommit: source.commit,
    skills: source.skills,
  }
}

function usage() {
  return [
    'Usage: node scripts/sync-upstream.mjs --source <obsidian-skills checkout> [--check] [--force]',
    '',
    'Checks or synchronizes Obsidian skills from the official repository.',
    '--source may point at the repository root or at plugins/obsidian.',
    '--check reports whether a newer upstream package version exists without writing files.',
    '--force rewrites the same version (for local repair only).',
  ].join('\n')
}

async function main(argv) {
  let source = null
  let check = false
  let force = false
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--source') {
      source = argv[index + 1]
      index += 1
    } else if (argument === '--check') {
      check = true
    } else if (argument === '--force') {
      force = true
    } else if (argument === '--help' || argument === '-h') {
      console.log(usage())
      return
    } else {
      throw new Error(`unknown argument "${argument}"\n\n${usage()}`)
    }
  }
  if (!source) throw new Error(usage())
  const result = check
    ? await checkUpstream(source)
    : await syncUpstream(source, { force })
  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(`sync-upstream: ${error.message}`)
    process.exitCode = 1
  })
}
