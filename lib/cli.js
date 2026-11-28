// Obsidian CLI runner.
//
// The Obsidian desktop app (1.12+) ships a console entry point — on Windows
// `Obsidian.com`, next to `Obsidian.exe`. It talks to the running app over IPC
// and prints either tab-separated/JSON data or a single `Error: ...` line.
// Two facts drive this module:
//
//   1. The CLI exits with code 0 even for its own errors; an error is a stdout
//      line that begins with `Error:`. Exit code alone is not a success signal.
//   2. Output is UTF-8 and may be large; everything read here is decoded once
//      and bounded before it reaches the model.

import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Candidate executables, in resolution order. `OBSIDIAN_CLI` wins. */
function candidates(configured) {
  const local = process.env.LOCALAPPDATA
  const pf = process.env.ProgramFiles ?? 'C:/Program Files'
  const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:/Program Files (x86)'
  return [
    configured,
    process.env.OBSIDIAN_CLI,
    join(pf, 'Obsidian', 'Obsidian.com'),
    join(pf86, 'Obsidian', 'Obsidian.com'),
    local ? join(local, 'Obsidian', 'Obsidian.com') : undefined,
    join(pf, 'Obsidian', 'Obsidian.exe'),
    'obsidian',
  ].filter((value) => typeof value === 'string' && value.length > 0)
}

/**
 * Resolve the Obsidian CLI executable. An explicit config value is honoured
 * verbatim (so a broken path surfaces as a spawn error instead of silently
 * falling back); otherwise the first existing well-known path wins.
 */
export function resolveObsidianPath(configured) {
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim()
  }
  for (const candidate of candidates(undefined)) {
    if (candidate === 'obsidian') continue
    if (existsSync(candidate)) return candidate
  }
  return 'obsidian'
}

/**
 * Build the argv for one CLI invocation.
 *
 * Global options (`vault=`) come first, then the command, then `key=value`
 * pairs and bare flags. Values are passed as separate argv entries — never
 * through a shell — so spaces, quotes and non-ASCII text need no escaping.
 */
export function buildArgv({ command, spec = {}, params = {}, vault }) {
  const argv = []
  const targetVault = vault ?? spec.vault
  if (typeof targetVault === 'string' && targetVault.length > 0) {
    argv.push(`vault=${targetVault}`)
  }
  argv.push(command)
  for (const [key, def] of Object.entries(spec)) {
    const value = params[key]
    if (value === undefined || value === null) continue
    const argName = def.arg ?? key
    switch (def.kind) {
      case 'flag':
        if (value === true) argv.push(argName)
        break
      case 'list': {
        const list = Array.isArray(value) ? value : [value]
        const joined = list
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0)
          .join(',')
        if (joined.length > 0) argv.push(`${argName}=${joined}`)
        break
      }
      case 'json':
        argv.push(`${argName}=${JSON.stringify(value)}`)
        break
      default: {
        const text = String(value)
        if (text.length > 0) argv.push(`${argName}=${text}`)
        break
      }
    }
  }
  return argv
}

function decodeChunk(chunk) {
  if (typeof chunk === 'string') return chunk
  return Buffer.from(chunk).toString('utf8')
}

function firstNonEmptyLine(text) {
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().length > 0) return line.trim()
  }
  return ''
}

/**
 * Run one CLI call.
 *
 * @returns {Promise<{ok: boolean, argv: string[], exitCode: number|null,
 *   stdout: string, stderr: string, error: string|undefined,
 *   timedOut: boolean, truncated: boolean, totalChars: number}>}
 */
export async function runCli(subprocess, options) {
  const {
    exe,
    argv,
    cwd = process.cwd(),
    timeoutMs = 30000,
    signal,
    maxOutputChars = 20000,
  } = options

  const handle = subprocess.spawn({
    argv: [exe, ...argv],
    cwd,
    stdio: { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' },
    graceMs: 2000,
    ...(signal === undefined ? {} : { signal }),
  })

  const stdoutChunks = []
  const stderrChunks = []
  let totalChars = 0

  const drain = async (stream, sink) => {
    if (stream === undefined) return
    try {
      for await (const chunk of stream) {
        const text = decodeChunk(chunk)
        totalChars += text.length
        sink.push(text)
      }
    } catch {
      // A terminated child can break its pipes mid-read; the exit outcome below
      // still describes what happened.
    }
  }

  let timedOut = false
  const timer = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? setTimeout(() => {
        timedOut = true
        try {
          handle.terminate()
        } catch {
          // Already gone.
        }
      }, timeoutMs)
    : undefined
  timer?.unref?.()

  const onAbort = () => {
    try {
      handle.terminate()
    } catch {
      // Already gone.
    }
  }
  signal?.addEventListener?.('abort', onAbort, { once: true })

  let outcome
  try {
    const [, , result] = await Promise.all([
      drain(handle.stdout, stdoutChunks),
      drain(handle.stderr, stderrChunks),
      handle.done,
    ])
    outcome = result
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    signal?.removeEventListener?.('abort', onAbort)
  }

  const rawStdout = stdoutChunks.join('')
  const stderr = stderrChunks.join('')
  const truncated = rawStdout.length > maxOutputChars
  const stdout = truncated
    ? `${rawStdout.slice(0, maxOutputChars)}\n… [truncated: ${
        rawStdout.length - maxOutputChars
      } of ${rawStdout.length} chars omitted; narrow the query with path/limit]`
    : rawStdout

  const exitCode = outcome?.exitCode ?? null
  let error
  if (timedOut) {
    error = `Obsidian CLI did not answer within ${timeoutMs} ms (the app may be busy or not running).`
  } else if (signal?.aborted) {
    error = 'Obsidian CLI call was cancelled.'
  } else if (exitCode !== null && exitCode !== 0) {
    error = firstNonEmptyLine(stderr) || `Obsidian CLI exited with code ${exitCode}.`
  } else {
    const line = firstNonEmptyLine(rawStdout)
    if (line.startsWith('Error:')) error = line.slice('Error:'.length).trim()
  }

  return {
    ok: error === undefined,
    argv,
    ...(exitCode === null ? {} : { exitCode }),
    ...(error === undefined ? {} : { error }),
    stdout,
    ...(stderr.trim().length === 0 ? {} : { stderr }),
    ...(timedOut ? { timedOut } : {}),
    ...(truncated ? { truncated } : {}),
    totalChars,
  }
}

/**
 * Best-effort JSON decode of CLI stdout. The CLI prints compact JSON for its
 * `format=json` surfaces and several plugin commands answer with JSON objects
 * regardless of flags; anything else stays text.
 */
export function parseJsonOutput(text) {
  const trimmed = text.trim()
  if (trimmed.length === 0) return undefined
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return undefined
  try {
    return JSON.parse(trimmed)
  } catch {
    return undefined
  }
}
