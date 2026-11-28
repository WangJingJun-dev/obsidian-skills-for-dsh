import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { checkUpstream, compareVersions, readUpstream, syncUpstream } from '../scripts/sync-upstream.mjs'

async function writeFixture(root, version, skillName, body) {
  const plugin = join(root, 'upstream', 'plugins', 'obsidian')
  await mkdir(join(plugin, 'skills', skillName), { recursive: true })
  await writeFile(join(root, 'upstream', 'LICENSE'), 'MIT\n')
  await writeFile(join(plugin, 'plugin.json'), JSON.stringify({
    name: 'obsidian',
    version,
    repository: 'https://github.com/obsidianmd/obsidian-skills',
  }))
  await writeFile(join(plugin, 'skills', skillName, 'SKILL.md'), [
    '---',
    `name: ${skillName}`,
    'description: Fixture skill for the upstream sync test.',
    '---',
    '',
    body,
    '',
  ].join('\n'))

  await mkdir(join(root, 'target', 'skills', skillName), { recursive: true })
  await writeFile(join(root, 'target', 'skills', skillName, 'SKILL.md'), 'old\n')
  await writeFile(join(root, 'target', 'package.json'), JSON.stringify({ name: 'fixture', version: '1.2.0' }, null, 2))
  await writeFile(join(root, 'target', 'upstream.json'), JSON.stringify({ version: '1.2.0' }, null, 2))
}

test('compares plain semantic versions', () => {
  assert.equal(compareVersions('1.2.0', '1.2.0'), 0)
  assert.equal(compareVersions('1.2.1', '1.2.0'), 1)
  assert.equal(compareVersions('2.0.0', '1.99.99'), 1)
  assert.throws(() => compareVersions('v1.2.0', '1.2.0'), /plain semantic version/)
})

test('checks and synchronizes a newer upstream package into a target package', async () => {
  const root = await mkdtemp(join(tmpdir(), 'obsidian-for-dsh-sync-'))
  try {
    await writeFixture(root, '1.2.1', 'obsidian-markdown', '# New skill body\n')
    const check = await checkUpstream(join(root, 'upstream'), { targetRoot: join(root, 'target') })
    assert.equal(check.update, true)
    assert.equal(check.currentVersion, '1.2.0')
    assert.equal(check.upstreamVersion, '1.2.1')

    const synced = await syncUpstream(join(root, 'upstream'), { targetRoot: join(root, 'target') })
    assert.equal(synced.changed, true)
    assert.match(await readFile(join(root, 'target', 'skills', 'obsidian-markdown', 'SKILL.md'), 'utf8'), /New skill body/)
    assert.equal(JSON.parse(await readFile(join(root, 'target', 'package.json'), 'utf8')).version, '1.2.1')
    assert.equal(JSON.parse(await readFile(join(root, 'target', 'upstream.json'), 'utf8')).version, '1.2.1')
    assert.equal((await checkUpstream(join(root, 'upstream'), { targetRoot: join(root, 'target') })).update, false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('refuses to downgrade a packaged version', async () => {
  const root = await mkdtemp(join(tmpdir(), 'obsidian-for-dsh-downgrade-'))
  try {
    await writeFixture(root, '1.1.9', 'knap', '# Older\n')
    await assert.rejects(
      syncUpstream(join(root, 'upstream'), { targetRoot: join(root, 'target') }),
      /refusing to downgrade/,
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('reads the pinned upstream commit when the source is a Git checkout', async () => {
  const root = await mkdtemp(join(tmpdir(), 'obsidian-for-dsh-commit-'))
  try {
    await writeFixture(root, '1.2.0', 'knap', '# Pinned\n')
    const source = join(root, 'upstream')
    execFileSync('git', ['init', '-q', source])
    execFileSync('git', ['-C', source, 'config', 'user.name', 'Test'])
    execFileSync('git', ['-C', source, 'config', 'user.email', 'test@example.com'])
    execFileSync('git', ['-C', source, 'add', '.'])
    execFileSync('git', ['-C', source, 'commit', '-qm', 'fixture'])
    const resolved = await readUpstream(source)
    assert.equal(resolved.version, '1.2.0')
    assert.match(resolved.commit ?? '', /^[0-9a-f]{40}$/)
    assert.deepEqual(resolved.skills, ['knap'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
