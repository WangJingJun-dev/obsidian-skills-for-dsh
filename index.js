import { execFile } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { parse } from 'yaml'
import { registerNativeTools } from './lib/native.js'

export const name = 'obsidian'
export const inject = ['skills', 'tools', 'subprocess']

export const UPSTREAM_ROUTE = '/obsidian-for-dsh/upstream.json'
export const UPSTREAM_UPDATE_ROUTE = '/obsidian-for-dsh/update'
export const UPSTREAM_REPOSITORY = 'obsidianmd/obsidian-skills'
export const UPSTREAM_RELEASES_URL = `https://api.github.com/repos/${UPSTREAM_REPOSITORY}/releases/latest`

const GIT_REPOSITORY = 'https://github.com/obsidianmd/obsidian-skills.git'
const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url))
const SYNC_SCRIPT = join(PACKAGE_ROOT, 'scripts', 'sync-upstream.mjs')
const execFileAsync = promisify(execFile)
const UPDATE_TIMEOUT_MS = 90_000

const PROVIDER_NAME = 'obsidian'
const SKILL_RANK = 600
const SKILLS_ROOT = fileURLToPath(new URL('./skills/', import.meta.url))
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/
const INVOCATION = Object.freeze({ modelInvocable: true, userInvocable: true })
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
const UPSTREAM_CACHE_TTL_MS = 5 * 60 * 1000

let latestReleaseCache = null
let updateInFlight = false

function parseString(value, field, path) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${path}: frontmatter field "${field}" must be a non-empty string`)
  }
  return value.trim()
}

function loadSkill(directoryName) {
  const path = join(SKILLS_ROOT, directoryName, 'SKILL.md')
  const raw = readFileSync(path, 'utf8')
  const match = FRONTMATTER.exec(raw)
  if (match === null) throw new Error(`${path}: missing YAML frontmatter`)

  let metadata
  try {
    metadata = parse(match[1])
  } catch (error) {
    throw new Error(`${path}: invalid YAML frontmatter: ${error.message}`)
  }
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error(`${path}: frontmatter must be a YAML mapping`)
  }

  const skillName = parseString(metadata.name, 'name', path)
  if (!SKILL_NAME.test(skillName)) throw new Error(`${path}: invalid skill name "${skillName}"`)
  if (skillName !== directoryName) {
    throw new Error(`${path}: skill name "${skillName}" must match directory "${directoryName}"`)
  }

  const description = parseString(metadata.description, 'description', path)
  const content = raw.slice(match[0].length).trimStart()
  if (content.length === 0) throw new Error(`${path}: skill body is empty`)

  return {
    name: skillName,
    description,
    invocation: { ...INVOCATION },
    source: 'bundled',
    provider: PROVIDER_NAME,
    path,
    resourceBase: { kind: 'directory', path: dirname(path) },
    content,
  }
}

function loadSkills() {
  const directories = readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'))

  if (directories.length === 0) throw new Error(`${SKILLS_ROOT}: no packaged skills found`)
  return directories.map(loadSkill)
}

function candidateOf(skill) {
  return {
    name: skill.name,
    description: skill.description,
    invocation: skill.invocation,
    source: skill.source,
    provider: skill.provider,
    path: skill.path,
    resourceBase: skill.resourceBase,
    rank: SKILL_RANK,
    locator: skill.path,
  }
}

function definitionOf(skill) {
  return {
    name: skill.name,
    description: skill.description,
    invocation: skill.invocation,
    source: skill.source,
    provider: skill.provider,
    path: skill.path,
    resourceBase: skill.resourceBase,
    content: skill.content,
  }
}

export function compareVersions(left, right) {
  const a = SEMVER.exec(String(left))
  const b = SEMVER.exec(String(right))
  if (a === null || b === null) throw new Error(`invalid version: "${left}" or "${right}"`)
  for (let index = 1; index <= 3; index += 1) {
    const difference = Number(a[index]) - Number(b[index])
    if (difference !== 0) return difference < 0 ? -1 : 1
  }
  return 0
}

export function readBundledUpstream(targetRoot = PACKAGE_ROOT) {
  const record = JSON.parse(readFileSync(join(targetRoot, 'upstream.json'), 'utf8'))
  compareVersions(record.version, record.version)
  return {
    repository: record.repository,
    version: record.version,
    commit: record.commit,
    syncedAt: record.syncedAt,
  }
}

async function readLatestRelease({ refresh = false, fetchImpl = fetch, now = Date.now() } = {}) {
  if (!refresh && latestReleaseCache !== null && now - latestReleaseCache.cachedAt < UPSTREAM_CACHE_TTL_MS) {
    return latestReleaseCache.value
  }

  const response = await fetchImpl(UPSTREAM_RELEASES_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'obsidian-for-dsh',
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new Error(`GitHub Releases responded with HTTP ${response.status}`)
  }

  const release = await response.json()
  const version = String(release.tag_name ?? '').replace(/^v/u, '')
  compareVersions(version, version)
  const value = {
    version,
    publishedAt: typeof release.published_at === 'string' ? release.published_at : null,
    url: typeof release.html_url === 'string' ? release.html_url : null,
  }
  latestReleaseCache = { cachedAt: now, value }
  return value
}

export async function readUpstreamStatus(options = {}) {
  const now = options.now ?? Date.now()
  const bundled = readBundledUpstream()
  const latest = await readLatestRelease({ ...options, now })
  const comparison = compareVersions(latest.version, bundled.version)
  return {
    ok: true,
    repository: UPSTREAM_REPOSITORY,
    bundled,
    latest,
    updateAvailable: comparison > 0,
    canUpdate: existsSync(SYNC_SCRIPT),
    status: comparison > 0 ? 'update-available' : comparison < 0 ? 'ahead-of-upstream' : 'up-to-date',
    checkedAt: new Date(now).toISOString(),
  }
}

function codedError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

async function cloneRelease(version, repository = GIT_REPOSITORY) {
  const temporary = await mkdtemp(join(tmpdir(), 'obsidian-skills-update-'))
  const source = join(temporary, 'source')
  let lastError = null
  for (const tag of [version, `v${version}`]) {
    try {
      await execFileAsync('git', [
        '-c',
        'core.autocrlf=false',
        '-c',
        'core.eol=lf',
        'clone',
        '--depth',
        '1',
        '--branch',
        tag,
        repository,
        source,
      ], {
        timeout: UPDATE_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      })
      return { temporary, source }
    } catch (error) {
      lastError = error
      await rm(source, { recursive: true, force: true })
    }
  }
  await rm(temporary, { recursive: true, force: true })
  if (lastError?.code === 'ENOENT') throw codedError('git-unavailable', 'git is not installed')
  if (lastError?.killed) throw codedError('update-timeout', 'git clone timed out')
  throw codedError('update-failed', lastError?.message ?? 'git clone failed')
}

async function backupTarget(targetRoot, backupRoot) {
  const paths = ['skills', 'upstream.json', 'package.json', 'LICENSE.upstream']
  const saved = []
  await mkdir(backupRoot, { recursive: true })
  for (const relative of paths) {
    const source = join(targetRoot, relative)
    if (!existsSync(source)) continue
    const destination = join(backupRoot, relative)
    await cp(source, destination, { recursive: true, force: true })
    saved.push(relative)
  }
  return saved
}

async function restoreTarget(targetRoot, backupRoot, saved) {
  for (const relative of saved) {
    const target = join(targetRoot, relative)
    await rm(target, { recursive: true, force: true })
    await cp(join(backupRoot, relative), target, { recursive: true, force: true })
  }
}

export async function applyUpstreamUpdate(version, options = {}) {
  const targetRoot = options.targetRoot ?? PACKAGE_ROOT
  const syncScript = join(targetRoot, 'scripts', 'sync-upstream.mjs')
  if (!existsSync(syncScript)) {
    throw codedError('update-unsupported', 'the sync script is not available in this installation')
  }

  compareVersions(version, version)
  const previous = readBundledUpstream(targetRoot)
  if (compareVersions(version, previous.version) <= 0) {
    throw codedError('no-update', `upstream ${version} is not newer than ${previous.version}`)
  }

  const { temporary, source } = await cloneRelease(version, options.repository ?? GIT_REPOSITORY)
  const backupRoot = join(temporary, 'backup')
  let saved = []
  let completed = false
  try {
    saved = await backupTarget(targetRoot, backupRoot)
    await execFileAsync(process.execPath, [syncScript, '--source', source], {
      cwd: targetRoot,
      timeout: UPDATE_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    })
    const updated = readBundledUpstream(targetRoot)
    if (compareVersions(updated.version, version) !== 0) {
      throw codedError('update-failed', `updated record reports ${updated.version}, expected ${version}`)
    }
    completed = true
    return {
      previousVersion: previous.version,
      updatedVersion: updated.version,
      commit: updated.commit,
      syncedAt: updated.syncedAt,
    }
  } catch (error) {
    if (!completed) {
      await restoreTarget(targetRoot, backupRoot, saved)
    }
    if (error?.code === 'ENOENT' || error?.code === 'EACCES' || error?.code === 'EPERM') {
      throw codedError('write-failed', error.message)
    }
    if (error?.killed) throw codedError('update-timeout', 'upstream sync timed out')
    if (error?.code === 'update-failed' || error?.code === 'no-update') throw error
    throw codedError('update-failed', error?.message ?? 'upstream sync failed')
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function handleUpstreamRequest(request) {
  let refresh = false
  try {
    refresh = new URL(request.url, 'http://localhost').searchParams.get('refresh') === '1'
  } catch {
    // A malformed request URL is still serviced as a normal cached read.
  }

  try {
    return jsonResponse(await readUpstreamStatus({ refresh }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    let bundled = null
    try {
      bundled = readBundledUpstream()
    } catch {
      // The failure response still reports the check error when the local record is unreadable.
    }

    let code = 'unknown'
    const name = error instanceof Error ? error.name : ''
    if (name === 'TimeoutError' || name === 'AbortError') {
      code = 'timeout'
    } else if (/GitHub Releases responded with HTTP (?:403|429)/u.test(message)) {
      code = 'rate-limited'
    } else if (/GitHub Releases responded with HTTP/u.test(message) || /invalid version/u.test(message)) {
      code = 'upstream-response'
    } else if (/fetch failed|ENOTFOUND|ECONN|EAI_AGAIN|network/u.test(message)) {
      code = 'network'
    } else if (/ENOENT|EACCES|JSON/u.test(message)) {
      code = 'local-record'
    }

    return jsonResponse({
      ok: false,
      code,
      error: message,
      bundled,
      checkedAt: new Date().toISOString(),
    }, 502)
  }
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

function sameOrigin(request) {
  const origin = request.headers.origin
  if (typeof origin !== 'string') return true
  try {
    return new URL(origin).host === request.headers.host
  } catch {
    return false
  }
}

export async function handleUpdateRequest(request, response, invalidate = () => {}) {
  if (request.method !== 'POST') {
    response.writeHead(405, { Allow: 'POST' })
    response.end()
    return
  }
  if (!sameOrigin(request)) {
    writeJson(response, 403, { ok: false, code: 'forbidden' })
    return
  }
  if (request.headers['x-obsidian-for-dsh-update'] !== '1') {
    writeJson(response, 403, { ok: false, code: 'forbidden' })
    return
  }
  if (updateInFlight) {
    writeJson(response, 409, { ok: false, code: 'update-in-progress' })
    return
  }

  updateInFlight = true
  request.resume()
  try {
    const status = await readUpstreamStatus({ refresh: true })
    if (!status.updateAvailable) {
      writeJson(response, 409, {
        ok: false,
        code: 'no-update',
        bundled: status.bundled,
        latest: status.latest,
      })
      return
    }
    const updated = await applyUpstreamUpdate(status.latest.version)
    try {
      invalidate()
    } catch {
      // The files are already updated; a provider cache failure must not report a failed update.
    }
    const next = await readUpstreamStatus({ refresh: false })
    writeJson(response, 200, {
      ok: true,
      updated: true,
      previousVersion: updated.previousVersion,
      updatedVersion: updated.updatedVersion,
      commit: updated.commit,
      ...next,
    })
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'update-failed'
    writeJson(response, code === 'no-update' ? 409 : 500, {
      ok: false,
      code,
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    updateInFlight = false
  }
}

export function apply(ctx, config) {
  loadSkills()
  registerNativeTools(ctx, config)
  let invalidateSkills = () => {}

  ctx.skills.registerProvider((control) => {
    invalidateSkills = () => control?.invalidate?.()
    return {
      name: PROVIDER_NAME,
      list: async () => loadSkills().map(candidateOf),
      get: async (candidate) => {
        const skill = loadSkills().find((entry) => entry.name === candidate?.name)
        return skill === undefined ? undefined : definitionOf(skill)
      },
    }
  })

  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], (webCtx) => {
      const webServer = typeof webCtx.reflect?.get === 'function'
        ? webCtx.reflect.get('webServer')
        : webCtx.webServer
      if (webServer === undefined) return
      webCtx.effect(() => webServer.register({
        kind: 'exact',
        path: UPSTREAM_ROUTE,
        resource: handleUpstreamRequest,
      }), 'obsidian-for-dsh: upstream version route')
      webCtx.effect(() => webServer.register({
        kind: 'exact',
        path: UPSTREAM_UPDATE_ROUTE,
        handler: (request, response) => handleUpdateRequest(request, response, invalidateSkills),
      }), 'obsidian-for-dsh: upstream update route')
    })
  }
}
