import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'

import { buildArgv, parseJsonOutput, resolveObsidianPath, runCli } from '../lib/cli.js'
import { createTools, DANGEROUS_COMMANDS } from '../lib/tools.js'

const baseConfig = {
  vault: '',
  toolCallTimeoutMs: 5000,
  maxOutputChars: 20000,
  readOnly: false,
  allowDev: false,
}

/** Minimal SubprocessService double: one canned answer per call. */
function fakeSubprocess(answer) {
  const calls = []
  return {
    calls,
    spawn({ argv }) {
      calls.push(argv)
      const chunks = answer(argv)
      return {
        pid: 1,
        stdout: Readable.from(chunks.stdout ?? []),
        stderr: Readable.from(chunks.stderr ?? []),
        done: Promise.resolve({ exitCode: chunks.exitCode ?? 0, signal: null }),
        terminate() {},
      }
    },
  }
}

function tool(named, tools) {
  const found = tools.find((entry) => entry.name === named)
  assert.ok(found, `tool ${named} exists`)
  return found
}

/** Subprocess double that answers successive calls from a queue. */
function queuedSubprocess(answers) {
  const calls = []
  let index = 0
  return {
    calls,
    spawn({ argv }) {
      calls.push(argv)
      const answer = answers[Math.min(index++, answers.length - 1)]
      return {
        pid: index,
        stdout: Readable.from([...(answer.stdout ?? [])]),
        stderr: Readable.from([...(answer.stderr ?? [])]),
        done: Promise.resolve({ exitCode: answer.exitCode ?? 0, signal: null }),
        terminate() {},
      }
    },
  }
}

const captureAnswer = {
  stdout: [
    '{"title":"T","path":"个人成长/规划/任务/T.md","status":"计划","priority":"中","usedNlp":false}\n',
  ],
}

test('buildArgv puts vault first and maps kinds', () => {
  const argv = buildArgv({
    command: 'search',
    vault: 'MyVault',
    params: { query: '周报', limit: 3, total: true, case: false, format: 'json' },
    spec: {
      query: { kind: 'string' },
      limit: { kind: 'number' },
      total: { kind: 'flag' },
      case: { kind: 'flag' },
      format: { kind: 'string' },
    },
  })
  assert.deepEqual(argv, ['vault=MyVault', 'search', 'query=周报', 'limit=3', 'total', 'format=json'])
})

test('buildArgv comma-joins list params and renames args', () => {
  const argv = buildArgv({
    command: 'tasknotes:capture',
    params: { tags: ['学习', 'hmcp'], recurrenceAnchor: 'completion' },
    spec: {
      tags: { kind: 'list' },
      recurrenceAnchor: { kind: 'string', arg: 'recurrence-anchor' },
    },
  })
  assert.deepEqual(argv, ['tasknotes:capture', 'tags=学习,hmcp', 'recurrence-anchor=completion'])
})

test('parseJsonOutput only decodes JSON documents', () => {
  assert.deepEqual(parseJsonOutput('[{"a":1}]'), [{ a: 1 }])
  assert.equal(parseJsonOutput('Created: note.md'), undefined)
  assert.equal(parseJsonOutput('{not json'), undefined)
})

test('resolveObsidianPath finds the installed console entry point', () => {
  const resolved = resolveObsidianPath('')
  assert.match(resolved, /Obsidian/i)
})

test('runCli reports ok on tab-separated output', async () => {
  const subprocess = fakeSubprocess(() => ({ stdout: ['name\tMyVault\nfiles\t569\n'] }))
  const result = await runCli(subprocess, { exe: 'obsidian', argv: ['vault'] })
  assert.equal(result.ok, true)
  assert.equal(result.stdout, 'name\tMyVault\nfiles\t569\n')
  assert.equal(subprocess.calls[0][0], 'obsidian')
})

test('runCli treats an Error: line as a failure even with exit code 0', async () => {
  const subprocess = fakeSubprocess(() => ({ stdout: ['Error: File "nope.md" not found.\n'] }))
  const result = await runCli(subprocess, { exe: 'obsidian', argv: ['read'] })
  assert.equal(result.ok, false)
  assert.equal(result.error, 'File "nope.md" not found.')
})

test('every tool exposes JSON-Schema parameters and a renderer', () => {
  const tools = createTools({ config: baseConfig, subprocess: fakeSubprocess(() => ({})), obsidianPath: 'obsidian' })
  assert.equal(tools.length, 7)
  for (const entry of tools) {
    assert.equal(entry.parameters.type, 'object')
    assert.equal(typeof entry.parameters.properties, 'object')
    assert.equal(typeof entry.output.render, 'function')
    if (entry.name !== 'obsidian_cli') {
      assert.equal(typeof entry.parameters.properties.operation, 'object')
    }
  }
})

test('operation argv is built end to end for a read', async () => {
  const subprocess = fakeSubprocess(() => ({ stdout: ['line1\nline2\n'] }))
  const tools = createTools({
    config: { ...baseConfig, vault: 'MyVault' },
    subprocess,
    obsidianPath: 'obsidian',
  })
  const note = tool('obsidian_note', tools)
  const value = await note.execute({ operation: 'read', path: 'a/b.md' }, { signal: undefined })
  assert.deepEqual(subprocess.calls[0], ['obsidian', 'vault=MyVault', 'read', 'path=a/b.md'])
  assert.equal(value.ok, true)
  assert.equal(value.output, 'line1\nline2\n')
})

test('per-call vault overrides the configured vault', async () => {
  const subprocess = fakeSubprocess(() => ({ stdout: ['ok'] }))
  const tools = createTools({ config: { ...baseConfig, vault: 'MyVault' }, subprocess, obsidianPath: 'obsidian' })
  await tool('obsidian_vault', tools).execute({ operation: 'info', vault: 'Research' })
  assert.deepEqual(subprocess.calls[0], ['obsidian', 'vault=Research', 'vault'])
})

test('required per-operation parameters are enforced', async () => {
  const tools = createTools({ config: baseConfig, subprocess: fakeSubprocess(() => ({})), obsidianPath: 'obsidian' })
  await assert.rejects(
    () => tool('obsidian_task', tools).execute({ operation: 'capture' }),
    /requires one of: text, title/,
  )
  await assert.rejects(
    () => tool('obsidian_note', tools).execute({ operation: 'create' }),
    /requires one of: name, path/,
  )
  await assert.rejects(
    () => tool('obsidian_task', tools).execute({ operation: 'time_start' }),
    /requires one of: path, title, query/,
  )
})

test('readOnly mode refuses writes but allows reads', async () => {
  const subprocess = fakeSubprocess(() => ({ stdout: ['ok'] }))
  const tools = createTools({ config: { ...baseConfig, readOnly: true }, subprocess, obsidianPath: 'obsidian' })
  await assert.rejects(
    () => tool('obsidian_note', tools).execute({ operation: 'delete', path: 'x.md' }),
    /readOnly/,
  )
  const read = await tool('obsidian_note', tools).execute({ operation: 'read', path: 'x.md' })
  assert.equal(read.ok, true)
})

test('pomodoro is read-only only for action=status', async () => {
  const subprocess = fakeSubprocess(() => ({ stdout: ['{"state":"idle"}'] }))
  const tools = createTools({ config: { ...baseConfig, readOnly: true }, subprocess, obsidianPath: 'obsidian' })
  const status = await tool('obsidian_task', tools).execute({ operation: 'pomodoro' })
  assert.equal(status.ok, true)
  assert.ok(subprocess.calls[0].includes('action=status'))
  await assert.rejects(
    () => tool('obsidian_task', tools).execute({ operation: 'pomodoro', action: 'start' }),
    /readOnly/,
  )
})

test('obsidian_cli refuses developer commands unless allowDev', async () => {
  const tools = createTools({ config: baseConfig, subprocess: fakeSubprocess(() => ({})), obsidianPath: 'obsidian' })
  const cli = tool('obsidian_cli', tools)
  for (const command of ['eval', 'dev:dom', 'restart']) {
    assert.ok(DANGEROUS_COMMANDS.has(command))
  }
  await assert.rejects(() => cli.execute({ command: 'eval' }), /allowDev/)
  await assert.rejects(() => cli.execute({ command: 'restart' }), /allowDev/)
})

test('obsidian_cli flattens arguments for commands without a typed operation', async () => {
  const subprocess = fakeSubprocess(() => ({ stdout: ['{"status":"ok"}'] }))
  const tools = createTools({ config: baseConfig, subprocess, obsidianPath: 'obsidian' })
  const cli = tool('obsidian_cli', tools)
  const value = await cli.execute({
    command: 'sync:status',
    args: { on: true, off: false, limit: 5, tags: ['a', 'b'] },
  })
  assert.deepEqual(subprocess.calls[0], ['obsidian', 'sync:status', 'on', 'limit=5', 'tags=a,b'])
  assert.deepEqual(value.output, { status: 'ok' })
})

test('unknown operations fail loudly', async () => {
  const tools = createTools({ config: baseConfig, subprocess: fakeSubprocess(() => ({})), obsidianPath: 'obsidian' })
  await assert.rejects(
    () => tool('obsidian_vault', tools).execute({ operation: 'nope' }),
    /unknown operation/,
  )
})

test('capture with folder moves the new task to the requested board folder', async () => {
  const subprocess = queuedSubprocess([
    captureAnswer,
    { stdout: ['Moved: 个人成长/规划/任务/T.md -> 开发/Houdini MCP/任务/脑暴/T.md\n'] },
  ])
  const tools = createTools({ config: baseConfig, subprocess, obsidianPath: 'obsidian' })
  const value = await tool('obsidian_task', tools).execute({
    operation: 'capture',
    title: 'T',
    targetFolder: '开发/Houdini MCP/任务/脑暴/',
  })
  assert.deepEqual(subprocess.calls[0], ['obsidian', 'tasknotes:capture', 'title=T'])
  assert.deepEqual(subprocess.calls[1], [
    'obsidian',
    'move',
    'path=个人成长/规划/任务/T.md',
    'to=开发/Houdini MCP/任务/脑暴',
  ])
  assert.equal(value.ok, true)
  assert.equal(value.movedTo, '开发/Houdini MCP/任务/脑暴/T.md')
  assert.equal(value.path, '开发/Houdini MCP/任务/脑暴/T.md')
  assert.deepEqual(value.output, {
    title: 'T',
    path: '个人成长/规划/任务/T.md',
    status: '计划',
    priority: '中',
    usedNlp: false,
  })
})

test('capture skips the move when the task already landed in the target folder', async () => {
  const subprocess = queuedSubprocess([captureAnswer])
  const tools = createTools({ config: baseConfig, subprocess, obsidianPath: 'obsidian' })
  const value = await tool('obsidian_task', tools).execute({
    operation: 'capture',
    title: 'T',
    targetFolder: '个人成长/规划/任务',
  })
  assert.equal(subprocess.calls.length, 1)
  assert.equal(value.movedTo, undefined)
})

test('capture reports a failed move without losing the captured path', async () => {
  const subprocess = queuedSubprocess([
    captureAnswer,
    { stdout: ['Error: Destination folder not found.\n'] },
  ])
  const tools = createTools({ config: baseConfig, subprocess, obsidianPath: 'obsidian' })
  const value = await tool('obsidian_task', tools).execute({
    operation: 'capture',
    title: 'T',
    targetFolder: 'does/not/exist',
  })
  assert.equal(value.ok, true)
  assert.equal(value.movedTo, undefined)
  assert.match(value.notes.join('\n'), /moving it to does\/not\/exist failed/)
  assert.equal(value.output.path, '个人成长/规划/任务/T.md')
})
