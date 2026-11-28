import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveObsidianPath, runCli } from './cli.js'
import { createTools } from './tools.js'

const here = dirname(fileURLToPath(import.meta.url))
const SYSTEM_PROMPT_PATH = resolve(here, '../assets/system-prompt.md')

const DEFAULT_CONFIG = {
  // Empty means: resolve a well-known install path, else fall back to PATH.
  obsidianPath: '',
  // Empty means: let the CLI use the active vault.
  vault: '',
  toolCallTimeoutMs: 30000,
  maxOutputChars: 20000,
  readOnly: false,
  allowDev: false,
}

export function normalizeConfig(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const config = { ...DEFAULT_CONFIG }
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue
    config[key] = value
  }
  const timeout = Number(config.toolCallTimeoutMs)
  config.toolCallTimeoutMs = Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_CONFIG.toolCallTimeoutMs
  const maxChars = Number(config.maxOutputChars)
  config.maxOutputChars = Number.isFinite(maxChars) && maxChars > 1000 ? maxChars : DEFAULT_CONFIG.maxOutputChars
  config.readOnly = config.readOnly === true
  config.allowDev = config.allowDev === true
  config.vault = typeof config.vault === 'string' ? config.vault : ''
  config.obsidianPath = typeof config.obsidianPath === 'string' ? config.obsidianPath : ''
  return config
}

export function registerNativeTools(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig)
  const obsidianPath = resolveObsidianPath(config.obsidianPath)
  const context = { config, subprocess: ctx.subprocess, obsidianPath }
  const log = ctx.logger

  const tools = createTools(context)
  for (const tool of tools) {
    ctx.tools.register(tool)
  }
  log?.info?.(`[obsidian-for-dsh] registered ${tools.length} native tools (cli: ${obsidianPath})`)

  registerSystemPrompt(ctx, log)
  registerCommands(ctx, context, log)
  return { tools, config, obsidianPath }
}

function registerSystemPrompt(ctx, log) {
  if (typeof ctx.inject !== 'function') return
  let text
  try {
    text = readFileSync(SYSTEM_PROMPT_PATH, 'utf8').trim()
  } catch (error) {
    log?.warn?.(`[obsidian-for-dsh] system-prompt asset unavailable: ${describe(error)}`)
    return
  }
  if (text.length === 0) return
  ctx.inject(['systemPrompt'], (scope) => {
    try {
      scope.systemPrompt.section({
        name: 'OBSIDIAN_CLI_BEHAVIOR_CONTRACT',
        order: 700,
        text,
      })
    } catch (error) {
      log?.warn?.(`[obsidian-for-dsh] system-prompt section skipped: ${describe(error)}`)
    }
  })
}

const STATUS_COMMAND_DESCRIPTION =
  'Report Obsidian CLI health: version, vault inventory, enabled community plugins, and TaskNotes time-tracking state.'

function registerCommands(ctx, context, log) {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['commands'], (scope) => {
    try {
      scope.commands.register({
        name: 'obsidian-status',
        description: STATUS_COMMAND_DESCRIPTION,
        input: { attachments: false },
        handler: async (invocation) => {
          const lines = await statusReport(context, invocation?.signal)
          return { kind: 'success', text: lines.join('\n') }
        },
      })
      log?.info?.('[obsidian-for-dsh] registered /obsidian-status')
    } catch (error) {
      log?.warn?.(`[obsidian-for-dsh] slash command skipped: ${describe(error)}`)
    }
  })
}

function describe(error) {
  return error instanceof Error ? error.message : String(error)
}

async function cliText(context, argv, signal) {
  const result = await runCli(context.subprocess, {
    exe: context.obsidianPath,
    argv,
    timeoutMs: Math.max(context.config.toolCallTimeoutMs, 15000),
    maxOutputChars: 4000,
    signal,
  })
  if (!result.ok) return `Error: ${result.error ?? 'unknown error'}`
  return result.stdout.trim() || '(no output)'
}

export async function statusReport(context, signal) {
  const vaultArgs = context.config.vault ? [`vault=${context.config.vault}`] : []
  const lines = []
  const version = await cliText(context, ['version'], signal)
  lines.push(`Obsidian CLI: ${version}`)
  const vaults = await cliText(context, ['vaults', 'verbose'], signal)
  lines.push(`Vaults:\n${indent(vaults)}`)
  const info = await cliText(context, [...vaultArgs, 'vault'], signal)
  lines.push(`Active vault:\n${indent(info)}`)
  const plugins = await cliText(context, [...vaultArgs, 'plugins:enabled', 'filter=community', 'versions'], signal)
  lines.push(`Enabled community plugins:\n${indent(plugins)}`)
  const tracking = await cliText(context, [...vaultArgs, 'tasknotes:time-status'], signal)
  lines.push(`TaskNotes time status:\n${indent(tracking)}`)
  return lines
}

function indent(text) {
  if (!text) return '  (no output)'
  return text
    .split(/\r?\n/)
    .map((line) => `  ${line}`)
    .join('\n')
}
