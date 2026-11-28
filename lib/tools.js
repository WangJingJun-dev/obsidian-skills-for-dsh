// Tool surface for the Obsidian CLI.
//
// Every operation maps to one `obsidian <command> [key=value|flag ...]`
// invocation. Operations are grouped the way Obsidian's own help groups them,
// so a model that knows the CLI can predict the tool it needs. The return
// value is always `{ok, command, output, ...}`; `output` is the parsed JSON
// when the CLI printed JSON, otherwise the exact text.
//
// Effect is tracked per operation, not per tool: `obsidian_task` reads the
// TaskNotes board but also starts time tracking, and a mixed group must not let
// a read inherit a sibling's write semantics.

import { buildArgv, parseJsonOutput, runCli } from './cli.js'

/** Operations that are denied in the generic escape hatch unless allowDev. */
export const DANGEROUS_COMMANDS = new Set([
  'eval',
  'dev:cdp',
  'dev:console',
  'dev:css',
  'dev:debug',
  'dev:dom',
  'dev:errors',
  'dev:mobile',
  'dev:screenshot',
  'devtools',
  'restart',
])

/** Shared parameter definitions: `kind` builds argv, `schema` is model-facing. */
const PARAMS = {
  vault: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Vault name to target (for example "MyVault" or "Research"). Omit to use the plugin-configured vault or the active vault.',
  },
  file: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Resolve a note by name, like a wikilink (for example "quarterly-report.md"). Use `path` instead when the exact location matters.',
  },
  path: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Exact vault-relative path (for example "开发/Houdini MCP/任务/完成/quarterly-report.md.md"). In search operations this is a folder scope.',
  },
  info: {
    kind: 'string',
    schema: { type: 'string', enum: ['name', 'path', 'files', 'folders', 'size'] },
    desc: 'Return only one field of the vault info.',
  },
  ext: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Filter files by extension, without the dot (for example "md").',
  },
  folder: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Folder path filter, vault-relative (list operations and random note).',
  },
  targetFolder: {
    kind: 'string',
    toolOnly: true,
    schema: { type: 'string' },
    desc: 'Optional destination folder for a captured TaskNotes task, vault-relative (for example "个人成长/学习/任务"). The plugin creates the task and then moves it there; omit it to use the TaskNotes default folder.',
  },
  content: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Text to write. Real newlines are accepted; the CLI also understands \\n and \\t escapes.',
  },
  name: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Name (file name, template name, tag name, property name, or new file name, depending on the operation).',
  },
  value: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Property value.',
  },
  type: {
    kind: 'string',
    schema: { type: 'string', enum: ['text', 'list', 'number', 'checkbox', 'date', 'datetime'] },
    desc: 'Property value type. Defaults to the CLI default (text).',
  },
  template: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Template name to apply when creating the file.',
  },
  to: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Destination folder or full path for move/rename.',
  },
  query: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Text or substring to search for.',
  },
  title: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Explicit title (TaskNotes task title, or template variable title).',
  },
  ref: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Task reference as path:line (for example "开发/Houdini MCP/任务/完成/quarterly-report.md.md:12").',
  },
  line: {
    kind: 'number',
    schema: { type: 'number' },
    desc: 'Line number of the task.',
  },
  status: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Task status. For plain Markdown tasks this is the status character; for TaskNotes it is the configured status value (this vault uses 脑暴/计划/当前/完成/受阻/取消).',
  },
  paneType: {
    kind: 'string',
    schema: { type: 'string', enum: ['tab', 'split', 'window'] },
    desc: 'How to open the note.',
  },
  format: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Output format. Depends on the operation; the valid set is listed for each operation in the tool description.',
  },
  limit: {
    kind: 'number',
    schema: { type: 'number' },
    desc: 'Maximum number of results.',
  },
  sort: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Sort order: name (default) or count.',
  },
  filter: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Filter. Plugin commands accept core|community; `commands` accepts an ID prefix.',
  },
  id: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Obsidian command ID or plugin ID.',
  },
  view: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Base view name.',
  },
  action: {
    kind: 'string',
    schema: {
      type: 'string',
      enum: ['status', 'start', 'pause', 'resume', 'stop', 'short-break', 'long-break'],
    },
    desc: 'Pomodoro action (default status).',
  },
  duration: {
    kind: 'number',
    schema: { type: 'number' },
    desc: 'Pomodoro work-session duration in minutes.',
  },
  details: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Task body/details.',
  },
  priority: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Task priority (this vault uses 低/中/高).',
  },
  due: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Due date or datetime, YYYY-MM-DD or YYYY-MM-DDTHH:MM.',
  },
  scheduled: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Scheduled date or datetime, YYYY-MM-DD or YYYY-MM-DDTHH:MM.',
  },
  tags: {
    kind: 'list',
    schema: { type: 'array', items: { type: 'string' } },
    desc: 'Tags (array of strings).',
  },
  contexts: {
    kind: 'list',
    schema: { type: 'array', items: { type: 'string' } },
    desc: 'Contexts (array of strings).',
  },
  projects: {
    kind: 'list',
    schema: { type: 'array', items: { type: 'string' } },
    desc: 'Projects (array of strings).',
  },
  recurrence: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Recurrence rule (for example "FREQ=WEEKLY;BYDAY=MO").',
  },
  recurrenceAnchor: {
    arg: 'recurrence-anchor',
    kind: 'string',
    schema: { type: 'string', enum: ['scheduled', 'completion'] },
    desc: 'How a recurring task advances: from its scheduled date or from its completion date.',
  },
  reminders: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Reminder spec, for example "due:-PT1H;scheduled:-PT30M;at:2026-04-02T09:00", or a JSON array string.',
  },
  estimate: {
    kind: 'number',
    schema: { type: 'number' },
    desc: 'Time estimate in minutes.',
  },
  entryDescription: {
    arg: 'description',
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Description for the started time entry.',
  },
  literal: {
    kind: 'flag',
    schema: { type: 'boolean' },
    desc: 'Treat `text` as a literal title instead of parsing it with NLP.',
  },
  text: {
    kind: 'string',
    schema: { type: 'string' },
    desc: 'Free text to parse with TaskNotes NLP (or a literal title with `literal`).',
  },
  // ---- flags ----
  total: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Return only the count.' },
  verbose: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Include extra detail.' },
  counts: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Include occurrence counts.' },
  case: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Case-sensitive search.' },
  active: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Use the currently active file.' },
  all: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Include non-Markdown files.' },
  ids: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Include IDs.' },
  versions: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Include version numbers.' },
  toggle: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Toggle the task status.' },
  done: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Mark the task done (or list completed tasks).' },
  todo: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Mark the task todo (or list incomplete tasks).' },
  daily: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Operate on the daily note.' },
  permanent: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Skip the trash and delete permanently.' },
  overwrite: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Overwrite an existing file.' },
  open: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Open the file after the operation.' },
  newtab: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Open in a new tab.' },
  inline: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Add the content without a newline.' },
  resolve: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Resolve template variables.' },
  enable: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Enable after installing.' },
  words: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Return only the word count.' },
  characters: { kind: 'flag', schema: { type: 'boolean' }, desc: 'Return only the character count.' },
}

function collectParams(operations) {
  const names = new Set(['vault'])
  for (const op of operations) for (const key of Object.keys(op.params ?? {})) names.add(key)
  const properties = {}
  for (const name of names) {
    const def = PARAMS[name]
    if (def === undefined) throw new Error(`unknown parameter "${name}"`)
    properties[name] = { ...def.schema, ...(def.desc ? { description: def.desc } : {}) }
  }
  return properties
}

function buildSpec(operation) {
  const spec = {}
  for (const key of Object.keys(operation.params ?? {})) {
    const def = PARAMS[key]
    if (def.toolOnly === true) continue
    spec[key] = { arg: def.arg ?? key, kind: def.kind }
  }
  return spec
}

function requiredNames(operation) {
  return Object.entries(operation.params ?? {})
    .filter(([, flag]) => flag === 'required')
    .map(([key]) => key)
}

function renderResult(value) {
  if (value === undefined || value === null) return [{ type: 'text', text: '(no result)' }]
  if (value.ok === true) {
    const output = value.output
    const text =
      typeof output === 'string'
        ? output.trimEnd()
        : JSON.stringify(output, null, 2)
    const extras = []
    if (typeof value.movedTo === 'string' && value.movedTo.length > 0) {
      extras.push(`moved to: ${value.movedTo}`)
    }
    for (const note of value.notes ?? []) extras.push(`note: ${note}`)
    return [{ type: 'text', text: [text.length === 0 ? '(no output)' : text, ...extras].join('\n') }]
  }
  const lines = [`Obsidian CLI failed: ${value.error ?? 'unknown error'}`]
  if (Array.isArray(value.argv)) lines.push(`argv: obsidian ${value.argv.join(' ')}`)
  if (typeof value.stdout === 'string' && value.stdout.trim().length > 0) {
    lines.push(`stdout:\n${value.stdout.trimEnd()}`)
  }
  if (typeof value.stderr === 'string' && value.stderr.trim().length > 0) {
    lines.push(`stderr:\n${value.stderr.trimEnd()}`)
  }
  for (const note of value.notes ?? []) lines.push(`note: ${note}`)
  return [{ type: 'text', text: lines.join('\n') }]
}

function callCli(context, argv, signal) {
  return runCli(context.subprocess, {
    exe: context.obsidianPath,
    argv,
    cwd: context.config.workspaceCwd ?? process.cwd(),
    timeoutMs: context.config.toolCallTimeoutMs,
    maxOutputChars: context.config.maxOutputChars,
    signal,
  })
}

function makeTool(spec) {
  const operations = spec.operations
  const parameters = {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: Object.keys(operations),
        description: `Operation to run: ${Object.keys(operations).join(', ')}.`,
      },
      ...collectParams(Object.values(operations)),
    },
    required: ['operation'],
  }
  const output = {
    schema: { description: 'Obsidian CLI result; JSON with ok/command/output or the raw text output.' },
  }

  const tool = {
    name: spec.name,
    description: spec.description,
    parameters,
    output: { ...output, render: (_args, value) => renderResult(value) },
    execute: async (args, exec) => {
      const raw = args ?? {}
      const operation = String(raw.operation ?? '')
      const op = operations[operation]
      if (op === undefined) {
        throw new Error(
          `unknown operation "${operation}" for ${spec.name}; valid: ${Object.keys(operations).join(', ')}`,
        )
      }
      const effect = typeof op.dynamicEffect === 'function' ? op.dynamicEffect(raw) : op.effect
      if (effect === 'write' && spec.context.config.readOnly === true) {
        throw new Error(`${spec.name} operation "${operation}" writes to the vault, but the plugin is in readOnly mode`)
      }
      for (const key of requiredNames(op)) {
        const value = raw[key]
        if (value === undefined || value === null || String(value).length === 0) {
          throw new Error(`${spec.name} operation "${operation}" requires parameter "${key}"`)
        }
      }
      const anyOf = op.requireAnyOf ?? []
      if (anyOf.length > 0) {
        const anyPresent = anyOf.some(
          (key) => raw[key] !== undefined && raw[key] !== null && String(raw[key]).length > 0,
        )
        if (!anyPresent) {
          throw new Error(
            `${spec.name} operation "${operation}" requires one of: ${anyOf.join(', ')}`,
          )
        }
      }
      const params = { ...raw }
      if (op.defaults !== undefined) {
        for (const [key, value] of Object.entries(op.defaults)) {
          if (params[key] === undefined) params[key] = value
        }
      }
      const argv = buildArgv({
        command: op.command ?? operation,
        spec: buildSpec(op),
        params,
        vault: typeof raw.vault === 'string' && raw.vault.length > 0
          ? raw.vault
          : spec.context.config.vault,
      })
      const result = await callCli(spec.context, argv, exec?.signal)
      const value = {
        ...result,
        command: op.command ?? operation,
        ...(result.ok && typeof result.stdout === 'string'
          ? { output: parseJsonOutput(result.stdout) ?? result.stdout }
          : {}),
      }
      if (typeof op.after === 'function') {
        return op.after({ raw, result: value, context: spec.context, signal: exec?.signal })
      }
      return value
    },
  }
  return tool
}

/**
 * Build every tool definition. `context` is the live plugin context:
 * `{config, subprocess, obsidianPath}`.
 */
export function createTools(context) {
  const tools = []

  // ── Vault reads ─────────────────────────────────────────────────────────
  tools.push(
    makeTool({
      name: 'obsidian_vault',
      context,
      description:
        'Read the Obsidian vault as a whole: vaults, info, files, folders, full-text search, tags, properties, recents, bases, workspace, tabs, word counts. ' +
        'Operations: ' +
        '`vaults`, `info`, `files`, `folders`, `search` (full text, `format=json` returns paths), `search_context` (matching line context), ' +
        '`tags`, `tag`, `properties`, `recents`, `bases`, `workspace`, `tabs`, `wordcount`.',
      operations: {
        vaults: { command: 'vaults', params: { verbose: 'optional', total: 'optional' } },
        info: { command: 'vault', params: { info: 'optional' } },
        files: { command: 'files', params: { folder: 'optional', ext: 'optional', total: 'optional' } },
        folders: { command: 'folders', params: { folder: 'optional', total: 'optional' } },
        search: {
          command: 'search',
          params: { query: 'required', path: 'optional', limit: 'optional', total: 'optional', case: 'optional', format: 'optional' },
        },
        search_context: {
          command: 'search:context',
          params: { query: 'required', path: 'optional', limit: 'optional', case: 'optional', format: 'optional' },
        },
        tags: {
          command: 'tags',
          params: { file: 'optional', path: 'optional', total: 'optional', counts: 'optional', sort: 'optional', format: 'optional', active: 'optional' },
        },
        tag: { command: 'tag', params: { name: 'required', total: 'optional', verbose: 'optional' } },
        properties: {
          command: 'properties',
          params: { file: 'optional', path: 'optional', name: 'optional', total: 'optional', sort: 'optional', counts: 'optional', format: 'optional', active: 'optional' },
        },
        recents: { command: 'recents', params: { total: 'optional' } },
        bases: { command: 'bases', params: {} },
        workspace: { command: 'workspace', params: { ids: 'optional' } },
        tabs: { command: 'tabs', params: { ids: 'optional' } },
        wordcount: {
          command: 'wordcount',
          params: { file: 'optional', path: 'optional', words: 'optional', characters: 'optional' },
        },
      },
    }),
  )

  // ── Notes ───────────────────────────────────────────────────────────────
  tools.push(
    makeTool({
      name: 'obsidian_note',
      context,
      description:
        'Read, create, edit, move and delete notes, plus the link graph and daily/template surfaces. ' +
        'Operations: `read`, `file_info`, `create`*, `append`*, `prepend`*, `move`*, `rename`*, `delete`*, `open`*, `outline`, ' +
        '`random_read`, `links`, `backlinks`, `unresolved`, `orphans`, `deadends`, `aliases`, ' +
        '`daily_path`, `daily_read`, `daily_append`*, `daily_prepend`*, `daily_open`*, `templates`, `template_read`, `template_insert`*. ' +
        'Operations marked * write or open UI. `file` resolves by name; `path` is exact.',
      operations: {
        read: { command: 'read', params: { file: 'optional', path: 'optional' } },
        file_info: { command: 'file', params: { file: 'optional', path: 'optional' } },
        create: {
          command: 'create',
          effect: 'write',
          requireAnyOf: ['name', 'path'],
          params: { name: 'optional', path: 'optional', content: 'optional', template: 'optional', overwrite: 'optional', open: 'optional', newtab: 'optional' },
        },
        append: {
          command: 'append',
          effect: 'write',
          params: { file: 'optional', path: 'optional', content: 'required', inline: 'optional' },
        },
        prepend: {
          command: 'prepend',
          effect: 'write',
          params: { file: 'optional', path: 'optional', content: 'required', inline: 'optional' },
        },
        move: { command: 'move', effect: 'write', params: { file: 'optional', path: 'optional', to: 'required' } },
        rename: { command: 'rename', effect: 'write', params: { file: 'optional', path: 'optional', name: 'required' } },
        delete: { command: 'delete', effect: 'write', params: { file: 'optional', path: 'optional', permanent: 'optional' } },
        open: { command: 'open', effect: 'write', params: { file: 'optional', path: 'optional', newtab: 'optional' } },
        outline: {
          command: 'outline',
          params: { file: 'optional', path: 'optional', format: 'optional', total: 'optional' },
        },
        random_read: { command: 'random:read', params: { folder: 'optional' } },
        links: { command: 'links', params: { file: 'optional', path: 'optional', total: 'optional' } },
        backlinks: {
          command: 'backlinks',
          params: { file: 'optional', path: 'optional', counts: 'optional', total: 'optional', format: 'optional' },
        },
        unresolved: {
          command: 'unresolved',
          params: { total: 'optional', counts: 'optional', verbose: 'optional', format: 'optional' },
        },
        orphans: { command: 'orphans', params: { total: 'optional', all: 'optional' } },
        deadends: { command: 'deadends', params: { total: 'optional', all: 'optional' } },
        aliases: {
          command: 'aliases',
          params: { file: 'optional', path: 'optional', total: 'optional', verbose: 'optional', active: 'optional' },
        },
        daily_path: { command: 'daily:path', params: {} },
        daily_read: { command: 'daily:read', params: {} },
        daily_append: {
          command: 'daily:append',
          effect: 'write',
          params: { content: 'required', inline: 'optional', open: 'optional', paneType: 'optional' },
        },
        daily_prepend: {
          command: 'daily:prepend',
          effect: 'write',
          params: { content: 'required', inline: 'optional', open: 'optional', paneType: 'optional' },
        },
        daily_open: { command: 'daily', effect: 'write', params: { paneType: 'optional' } },
        templates: { command: 'templates', params: { total: 'optional' } },
        template_read: { command: 'template:read', params: { name: 'required', resolve: 'optional', title: 'optional' } },
        template_insert: { command: 'template:insert', effect: 'write', params: { name: 'required' } },
      },
    }),
  )

  // ── Frontmatter properties ──────────────────────────────────────────────
  tools.push(
    makeTool({
      name: 'obsidian_property',
      context,
      description:
        'Read, set and remove one frontmatter property of a note. ' +
        'Operations: `read`, `set`*, `remove`*. Property names are case-sensitive and may be non-ASCII (this vault uses 状态/优先级/预计结束/预计开始/项目/上下文).',
      operations: {
        read: { command: 'property:read', params: { name: 'required', file: 'optional', path: 'optional' } },
        set: {
          command: 'property:set',
          effect: 'write',
          params: { name: 'required', value: 'required', type: 'optional', file: 'optional', path: 'optional' },
        },
        remove: { command: 'property:remove', effect: 'write', params: { name: 'required', file: 'optional', path: 'optional' } },
      },
    }),
  )

  // ── Bases (the kanban lives here) ───────────────────────────────────────
  tools.push(
    makeTool({
      name: 'obsidian_base',
      context,
      description:
        'Work with Obsidian Bases - the tables and kanban boards used by TaskNotes. ' +
        'Operations: `list`, `views`, `query` (returns the board rows; `format=json|csv|tsv|md|paths`), `create`* (new item in a base). ' +
        'A TaskNotes kanban is a `.base` file; querying it is the reliable way to read the board.',
      operations: {
        list: { command: 'bases', params: {} },
        views: { command: 'base:views', params: { file: 'optional', path: 'optional' } },
        query: {
          command: 'base:query',
          params: { file: 'optional', path: 'optional', view: 'optional', format: 'optional' },
        },
        create: {
          command: 'base:create',
          effect: 'write',
          params: { file: 'optional', path: 'optional', view: 'optional', name: 'optional', content: 'optional', open: 'optional', newtab: 'optional' },
        },
      },
    }),
  )

  // ── Tasks: Markdown checkboxes + TaskNotes ──────────────────────────────
  tools.push(
    makeTool({
      name: 'obsidian_task',
      context,
      description:
        'Tasks. `tasks`/`task` cover Markdown checkbox tasks; `capture`, `pomodoro`, `time_*` are TaskNotes plugin commands (one note per task, frontmatter-encoded). ' +
        'Operations: `list`, `show`, `update`*, `capture`*, `pomodoro`, `time_start`*, `time_stop`*, `time_status`. ' +
        '`capture` accepts `targetFolder` to route the new task onto a specific board folder (capture then move); pair it with the board area tag via `tags`. ' +
        '`pomodoro` is read-only for action=status (the default) and a write for the other actions.',
      operations: {
        list: {
          command: 'tasks',
          params: { file: 'optional', path: 'optional', total: 'optional', done: 'optional', todo: 'optional', status: 'optional', verbose: 'optional', format: 'optional', active: 'optional', daily: 'optional' },
        },
        show: { command: 'task', params: { ref: 'optional', file: 'optional', path: 'optional', line: 'optional' } },
        update: {
          command: 'task',
          effect: 'write',
          params: { ref: 'optional', file: 'optional', path: 'optional', line: 'optional', toggle: 'optional', done: 'optional', todo: 'optional', daily: 'optional', status: 'optional' },
        },
        capture: {
          command: 'tasknotes:capture',
          effect: 'write',
          requireAnyOf: ['text', 'title'],
          params: {
            text: 'optional',
            title: 'optional',
            details: 'optional',
            status: 'optional',
            priority: 'optional',
            due: 'optional',
            scheduled: 'optional',
            tags: 'optional',
            contexts: 'optional',
            projects: 'optional',
            recurrence: 'optional',
            recurrenceAnchor: 'optional',
            reminders: 'optional',
            estimate: 'optional',
            literal: 'optional',
            targetFolder: 'optional',
          },
          // TaskNotes writes into its single configured tasks folder and the
          // CLI has no folder flag, so a multi-board vault needs a move step to
          // route the new task to the board it belongs to. Composed here so the
          // caller still gets one result (and never loses the captured path if
          // the move fails).
          after: async ({ raw, result, context, signal }) => {
            const target = typeof raw.targetFolder === 'string' ? raw.targetFolder.trim().replace(/\/+$/, '') : ''
            if (target.length === 0 || result.ok !== true) return result
            const captured =
              result.output !== null && typeof result.output === 'object'
                ? result.output.path
                : undefined
            if (typeof captured !== 'string' || captured.length === 0) {
              return {
                ...result,
                notes: [...(result.notes ?? []), 'capture reported no task path, so the folder move was skipped'],
              }
            }
            if (captured === target || captured.startsWith(`${target}/`)) return result
            const move = await callCli(
              context,
              ['move', `path=${captured}`, `to=${target}`],
              signal,
            )
            if (move.ok !== true) {
              return {
                ...result,
                notes: [
                  ...(result.notes ?? []),
                  `captured at ${captured}, but moving it to ${target} failed: ${move.error ?? 'unknown error'}`,
                ],
              }
            }
            const name = captured.split('/').pop()
            return { ...result, path: `${target}/${name}`, movedTo: `${target}/${name}` }
          },
        },
        pomodoro: {
          command: 'tasknotes:pomodoro',
          params: { action: 'optional', path: 'optional', title: 'optional', query: 'optional', duration: 'optional' },
          defaults: { action: 'status' },
          dynamicEffect: (raw) => (String(raw.action ?? 'status') === 'status' ? 'read' : 'write'),
        },
        time_start: {
          command: 'tasknotes:start-time',
          effect: 'write',
          requireAnyOf: ['path', 'title', 'query'],
          params: { path: 'optional', title: 'optional', query: 'optional', entryDescription: 'optional' },
        },
        time_stop: {
          command: 'tasknotes:stop-time',
          effect: 'write',
          params: { path: 'optional', title: 'optional', query: 'optional' },
        },
        time_status: {
          command: 'tasknotes:time-status',
          params: { path: 'optional', title: 'optional', query: 'optional' },
        },
      },
    }),
  )

  // ── Plugins and commands ────────────────────────────────────────────────
  tools.push(
    makeTool({
      name: 'obsidian_plugin',
      context,
      description:
        'Obsidian plugin and command surfaces. Reading plugin/command IDs is how Hearth and TaskNotes are driven: Hearth exposes hearth:open-home and hearth:open-dashboard-N; TaskNotes exposes tasknotes:open-kanban-view and friends. ' +
        'Operations: `list`, `enabled`, `info`, `commands`, `command`* (run one command), `hotkeys`, `hotkey`, `enable`*, `disable`*, `install`*, `uninstall`*, `reload`*, `reload_vault`*.',
      operations: {
        list: { command: 'plugins', params: { filter: 'optional', versions: 'optional', format: 'optional' } },
        enabled: { command: 'plugins:enabled', params: { filter: 'optional', versions: 'optional', format: 'optional' } },
        info: { command: 'plugin', params: { id: 'required' } },
        commands: { command: 'commands', params: { filter: 'optional' } },
        command: { command: 'command', effect: 'write', params: { id: 'required' } },
        hotkeys: { command: 'hotkeys', params: { total: 'optional', verbose: 'optional', format: 'optional', all: 'optional' } },
        hotkey: { command: 'hotkey', params: { id: 'required', verbose: 'optional' } },
        enable: { command: 'plugin:enable', effect: 'write', params: { id: 'required', filter: 'optional' } },
        disable: { command: 'plugin:disable', effect: 'write', params: { id: 'required', filter: 'optional' } },
        install: { command: 'plugin:install', effect: 'write', params: { id: 'required', enable: 'optional' } },
        uninstall: { command: 'plugin:uninstall', effect: 'write', params: { id: 'required' } },
        reload: { command: 'plugin:reload', effect: 'write', params: { id: 'required' } },
        reload_vault: { command: 'reload', effect: 'write', params: {} },
      },
    }),
  )

  // ── Raw escape hatch ────────────────────────────────────────────────────
  tools.push({
    name: 'obsidian_cli',
    description:
      'Escape hatch: run any Obsidian CLI command with arbitrary key=value arguments. Use it for commands without a typed operation (bookmark, history, sync, diff, theme, snippet, base:*, dev:*) or for plugin-registered commands. ' +
      'Boolean true becomes a bare flag, arrays are comma-joined, objects are JSON. ' +
      'Developer commands (eval, dev:*, devtools) and restart are refused unless the plugin config sets allowDev.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'CLI command, for example "sync:status", "bookmark", "base:query", "tasknotes:capture".',
        },
        args: {
          type: 'object',
          description: 'Argument map: boolean true = bare flag; string/number = key=value; array = comma-joined; object = JSON.',
          additionalProperties: true,
        },
        vault: {
          type: 'string',
          description: 'Vault name to target. Omit for the configured/active vault.',
        },
      },
      required: ['command'],
    },
    output: {
      schema: { description: 'Obsidian CLI result; JSON with ok/command/output or the raw text output.' },
      render: (_args, value) => renderResult(value),
    },
    execute: async (args, exec) => {
      const raw = args ?? {}
      const command = String(raw.command ?? '').trim()
      if (command.length === 0) throw new Error('obsidian_cli requires "command"')
      if (!context.config.allowDev && DANGEROUS_COMMANDS.has(command)) {
        throw new Error(
          `obsidian_cli refuses "${command}": developer/restart commands need allowDev=true in the obsidian plugin config`,
        )
      }
      const argv = []
      const vault = typeof raw.vault === 'string' && raw.vault.length > 0 ? raw.vault : context.config.vault
      if (typeof vault === 'string' && vault.length > 0) argv.push(`vault=${vault}`)
      argv.push(command)
      const argMap = raw.args
      if (argMap !== undefined && argMap !== null) {
        if (typeof argMap !== 'object' || Array.isArray(argMap)) {
          throw new Error('obsidian_cli "args" must be an object')
        }
        for (const [key, value] of Object.entries(argMap)) {
          if (value === undefined || value === null || value === false) continue
          if (value === true) {
            argv.push(key)
            continue
          }
          if (Array.isArray(value)) {
            argv.push(`${key}=${value.map((item) => String(item)).join(',')}`)
            continue
          }
          if (typeof value === 'object') {
            argv.push(`${key}=${JSON.stringify(value)}`)
            continue
          }
          argv.push(`${key}=${String(value)}`)
        }
      }
      const result = await callCli(context, argv, exec?.signal)
      return {
        ...result,
        command,
        ...(result.ok && typeof result.stdout === 'string'
          ? { output: parseJsonOutput(result.stdout) ?? result.stdout }
          : {}),
      }
    },
  })

  return tools
}
