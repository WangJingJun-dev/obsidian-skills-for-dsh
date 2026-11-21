import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  applyUpstreamUpdate,
  handleUpdateRequest,
} from '../index.js'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

async function writeFileAt(path, content) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

async function git(directory, ...args) {
  return execFileSync('git', ['-C', directory, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function makeRelease(root) {
  const source = join(root, 'source')
  const plugin = join(source, 'plugins', 'obsidian')
  await writeFileAt(join(plugin, 'plugin.json'), JSON.stringify({
    name: 'obsidian',
    version: '1.2.2',
    repository: 'https://github.com/obsidianmd/obsidian-skills',
  }))
  await writeFileAt(join(source, 'LICENSE'), 'MIT fixture\n')
  await writeFileAt(join(plugin, 'skills', 'common', 'SKILL.md'), [
    '---',
    'name: common',
    'description: Common fixture skill after update.',
    '---',
    '',
    '# New common body',
    '',
  ].join('\n'))
  await writeFileAt(join(plugin, 'skills', 'new-skill', 'SKILL.md'), [
    '---',
    'name: new-skill',
    'description: New fixture skill from the release.',
    '---',
    '',
    '# New skill body',
    '',
  ].join('\n'))
  await git(source, 'init', '-q')
  await git(source, 'config', 'user.name', 'Fixture')
  await git(source, 'config', 'user.email', 'fixture@example.com')
  await git(source, 'add', '.')
  await git(source, 'commit', '-qm', 'release 1.2.2')
  await git(source, 'tag', '1.2.2')
  return source
}

async function makeTarget(root) {
  const target = join(root, 'target')
  await cp(join(packageRoot, 'scripts'), join(target, 'scripts'), { recursive: true })
  await writeFileAt(join(target, 'package.json'), JSON.stringify({
    name: 'fixture',
    version: '1.2.1',
  }, null, 2))
  await writeFileAt(join(target, 'upstream.json'), JSON.stringify({
    repository: 'https://github.com/obsidianmd/obsidian-skills',
    version: '1.2.1',
    commit: 'a'.repeat(40),
    syncedAt: '2026-11-20T00:00:00.000Z',
  }, null, 2))
  await writeFileAt(join(target, 'skills', 'common', 'SKILL.md'), 'old common\n')
  await writeFileAt(join(target, 'skills', 'old-skill', 'SKILL.md'), 'old skill\n')
  return target
}

function fakeResponse() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    writeHead(status, headers) {
      this.statusCode = status
      this.headers = headers
    },
    end(body) {
      this.body = body
    },
  }
}

test('updates a target by replacing the complete skill tree', async () => {
  const root = await mkdtemp(join(tmpdir(), 'obsidian-skills-update-test-'))
  try {
    const source = await makeRelease(root)
    const target = await makeTarget(root)

    const result = await applyUpstreamUpdate('1.2.2', {
      targetRoot: target,
      repository: source,
    })

    assert.equal(result.previousVersion, '1.2.1')
    assert.equal(result.updatedVersion, '1.2.2')
    assert.equal(
      await readFile(join(target, 'skills', 'common', 'SKILL.md'), 'utf8'),
      [
        '---',
        'name: common',
        'description: Common fixture skill after update.',
        '---',
        '',
        '# New common body',
        '',
      ].join('\n'),
    )
    assert.equal(existsSync(join(target, 'skills', 'old-skill')), false)
    assert.equal(existsSync(join(target, 'skills', 'new-skill', 'SKILL.md')), true)
    assert.equal(JSON.parse(await readFile(join(target, 'package.json'), 'utf8')).version, '1.2.2')
    assert.equal(JSON.parse(await readFile(join(target, 'upstream.json'), 'utf8')).version, '1.2.2')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('refuses to update to the version already installed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'obsidian-skills-update-noop-'))
  try {
    const target = await makeTarget(root)
    await assert.rejects(
      applyUpstreamUpdate('1.2.1', { targetRoot: target }),
      (error) => error.code === 'no-update',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects non-POST and cross-origin update requests before any work', async () => {
  const getResponse = fakeResponse()
  await handleUpdateRequest({ method: 'GET', headers: {} }, getResponse)
  assert.equal(getResponse.statusCode, 405)

  const crossOrigin = fakeResponse()
  await handleUpdateRequest({
    method: 'POST',
    headers: {
      host: '127.0.0.1:62008',
      origin: 'https://evil.example',
      'x-obsidian-skills-update': '1',
    },
  }, crossOrigin)
  assert.equal(crossOrigin.statusCode, 403)

  const missingHeader = fakeResponse()
  await handleUpdateRequest({
    method: 'POST',
    headers: { host: '127.0.0.1:62008', origin: 'http://127.0.0.1:62008' },
  }, missingHeader)
  assert.equal(missingHeader.statusCode, 403)
})
