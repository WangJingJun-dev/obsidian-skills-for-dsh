import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  UPSTREAM_ROUTE,
  UPSTREAM_UPDATE_ROUTE,
  apply,
  compareVersions,
  inject,
  name,
  readBundledUpstream,
  readUpstreamStatus,
} from '../index.js'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const expectedSkills = [
  'defuddle',
  'json-canvas',
  'knap',
  'obsidian-bases',
  'obsidian-cli',
  'obsidian-headless',
  'obsidian-markdown',
]

function loadProvider() {
  let factory
  apply({
    skills: {
      registerProvider(next) {
        factory = next
        return () => {}
      },
    },
  })
  assert.equal(typeof factory, 'function')
  return factory()
}

test('exports the skill service injection and stable plugin name', () => {
  assert.equal(name, 'obsidian-skills')
  assert.deepEqual(inject, ['skills'])
})

test('registers all packaged upstream skills with working resource paths', async () => {
  const provider = loadProvider()
  assert.equal(provider.name, 'obsidian-skills')
  const candidates = await provider.list()
  assert.deepEqual(candidates.map((candidate) => candidate.name).sort(), expectedSkills)
  assert.equal(candidates.length, 7)

  for (const candidate of candidates) {
    assert.equal(candidate.provider, 'obsidian-skills')
    assert.equal(candidate.source, 'bundled')
    assert.equal(candidate.rank, 600)
    assert.deepEqual(candidate.invocation, { modelInvocable: true, userInvocable: true })
    assert.equal(candidate.resourceBase.kind, 'directory')
    assert.ok(candidate.description.length > 20)
    assert.ok(candidate.path.startsWith(packageRoot))

    const skill = await provider.get(candidate)
    assert.equal(skill.name, candidate.name)
    assert.equal(skill.provider, 'obsidian-skills')
    assert.ok(skill.content.length > 100)
    assert.ok(!skill.content.startsWith('---'))
    assert.ok(existsSync(join(dirname(skill.path), 'SKILL.md')))

    for (const match of skill.content.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0]
      if (target === '' || /^(?:https?:|mailto:)/.test(target)) continue
      if (!target.includes('/') && !target.includes('.')) continue
      assert.ok(existsSync(resolve(dirname(skill.path), target)), `${skill.name}: missing ${target}`)
    }
  }
})

test('returns undefined for an unknown candidate', async () => {
  const provider = loadProvider()
  assert.equal(await provider.get({ name: 'not-packaged' }), undefined)
})

test('keeps manifest, upstream record, locales, and icon aligned', () => {
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
  const upstream = JSON.parse(readFileSync(join(packageRoot, 'upstream.json'), 'utf8'))
  const en = JSON.parse(readFileSync(join(packageRoot, 'locale', 'en.json'), 'utf8'))
  const zh = JSON.parse(readFileSync(join(packageRoot, 'locale', 'zh.json'), 'utf8'))

  assert.equal(manifest.name, 'obsidian-skills-for-dsh')
  assert.equal(manifest.version, upstream.version)
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.dsh.client.platform, 'web')
  assert.equal(manifest.exports['./client'], './client.js')
  assert.equal(manifest.files.includes('client.js'), true)
  assert.equal(manifest.files.includes('icon.png'), true)
  assert.equal(manifest.exports['./icon'], './icon.png')
  assert.ok(manifest.files.includes('skills'))
  assert.ok(manifest.files.includes('locale/*.json'))
  assert.ok(en.meta.title && en.meta.description.includes('GitHub Release'))
  assert.ok(zh.meta.title && zh.meta.description.includes('GitHub Release'))
  const icon = readFileSync(join(packageRoot, 'icon.png'))
  assert.deepEqual([...icon.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  assert.equal(icon[25], 6)
  assert.ok(icon.byteLength <= 256 * 1024)
  assert.ok(readFileSync(join(packageRoot, 'client.js'), 'utf8').includes("id: 'obsidian-skills-for-dsh'"))
})

test('compares and exposes the bundled upstream release', () => {
  assert.equal(compareVersions('1.2.1', '1.2.1'), 0)
  assert.equal(compareVersions('1.2.1', '1.2.0'), 1)
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1)
  assert.throws(() => compareVersions('v1.2.1', '1.2.1'), /invalid version/)

  const bundled = readBundledUpstream()
  assert.equal(bundled.version, '1.2.1')
  assert.match(bundled.commit, /^[0-9a-f]{40}$/)
  assert.equal(bundled.repository, 'https://github.com/obsidianmd/obsidian-skills')
})

test('reports a newer upstream release from the mocked GitHub response', async () => {
  const checkedAt = Date.UTC(2026, 10, 21, 7, 30, 0)
  const status = await readUpstreamStatus({
    refresh: true,
    now: checkedAt,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          tag_name: 'v1.2.2',
          published_at: '2026-11-20T19:22:47Z',
          html_url: 'https://github.com/obsidianmd/obsidian-skills/releases/tag/1.2.2',
        }
      },
    }),
  })

  assert.equal(status.ok, true)
  assert.equal(status.bundled.version, '1.2.1')
  assert.equal(status.latest.version, '1.2.2')
  assert.equal(status.updateAvailable, true)
  assert.equal(status.status, 'update-available')
  assert.equal(status.checkedAt, new Date(checkedAt).toISOString())
})

test('keeps the five public README languages linked', () => {
  const readmes = ['README.md', 'README.en.md', 'README.ko.md', 'README.ja.md', 'README.ru.md']
  for (const readme of readmes) {
    const text = readFileSync(join(packageRoot, readme), 'utf8')
    assert.ok(text.startsWith('# Obsidian Skills for DSH'))
    for (const linked of readmes) assert.ok(text.includes(`(${linked})`), `${readme}: missing ${linked}`)
    assert.ok(text.includes('CONTRIBUTORS.md'), `${readme}: missing contributor credit`)
  }
  assert.ok(readFileSync(join(packageRoot, 'CONTRIBUTORS.md'), 'utf8').includes('deepseek-ai'))
  assert.ok(readFileSync(join(packageRoot, 'README.md'), 'utf8').includes('轻量'))
})

test('registers the host endpoints for the plugin detail version section', () => {
  const routes = []
  const webServer = {
    register(value) {
      routes.push(value)
      return () => {}
    },
  }
  apply({
    skills: {
      registerProvider() {
        return () => {}
      },
    },
    inject(services, callback) {
      if (services.includes('webServer')) {
        callback({
          reflect: { get: () => webServer },
          effect(fn) { fn() },
        })
      }
    },
  })

  const statusRoute = routes.find((route) => route.path === UPSTREAM_ROUTE)
  const updateRoute = routes.find((route) => route.path === UPSTREAM_UPDATE_ROUTE)
  assert.equal(statusRoute.kind, 'exact')
  assert.equal(typeof statusRoute.resource, 'function')
  assert.equal(updateRoute.kind, 'exact')
  assert.equal(typeof updateRoute.handler, 'function')
})
