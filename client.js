window.__ModuleLoader__.load({
  id: 'obsidian-skills-for-dsh',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PACKAGE_NAME = 'obsidian-skills-for-dsh'
    const STATUS_PATH = '/obsidian-skills-for-dsh/upstream.json'
    const UPDATE_PATH = '/obsidian-skills-for-dsh/update'
    const ERROR_CODES = new Set([
      'timeout',
      'rate-limited',
      'network',
      'upstream-response',
      'local-record',
      'bad-response',
      'update-unsupported',
      'update-in-progress',
      'no-update',
      'git-unavailable',
      'update-timeout',
      'write-failed',
      'update-failed',
      'forbidden',
    ])
    const STRINGS = {
      zh: {
        title: '上游技能版本',
        subtitle: '来自 obsidianmd/obsidian-skills，不是本插件版本',
        checking: '正在检查上游版本…',
        checkingShort: '检查中…',
        latest: '已是最新版本',
        available: '上游有新版本',
        ahead: '本地内置版本高于上游最新 Release',
        failed: '无法检查上游版本',
        current: '当前内置',        commit: 'commit',
        synced: '同步于',
        published: '上游发布于',
        checked: '检查于',
        recheck: '重新检查',
        release: '查看 Release',
        retry: '重试',
        update: '更新到',
        updating: '正在更新技能…',
        updateSuccess: '已更新到',
        updateFailed: '更新失败',
        'error.timeout': '检查超时，请稍后重试',
        'error.rate-limited': 'GitHub 检查频率受限，请稍后再试',
        'error.network': '无法连接 GitHub，请检查网络',
        'error.upstream-response': '上游 Release 信息无法读取',
        'error.local-record': '本地 upstream.json 无法读取',
        'error.bad-response': '检查接口返回了无效响应',
        'error.update-unsupported': '当前安装不支持自动更新',
        'error.update-in-progress': '另一个更新正在进行',
        'error.no-update': '已经是最新版本',
        'error.git-unavailable': '未找到 git，无法拉取上游 Release',
        'error.update-timeout': '拉取上游或写入技能超时',
        'error.write-failed': '写入技能目录失败，请检查文件权限',
        'error.update-failed': '上游技能同步失败',
        'error.forbidden': '更新请求未通过来源校验',
        'error.unknown': '检查失败，请稍后重试',
      },
      en: {
        title: 'Upstream skill version',
        subtitle: 'From obsidianmd/obsidian-skills, not this plugin version',
        checking: 'Checking the upstream version…',
        checkingShort: 'Checking…',
        latest: 'Up to date with upstream',
        available: 'Upstream update available',
        ahead: 'Included version is newer than the latest upstream release',
        failed: 'Could not check the upstream version',
        current: 'Included',
        commit: 'commit',
        synced: 'synced',
        published: 'Upstream published',
        checked: 'Checked',
        recheck: 'Check again',
        release: 'View release',
        retry: 'Retry',
        update: 'Update to',
        updating: 'Updating skills…',
        updateSuccess: 'Updated to',
        updateFailed: 'Update failed',
        'error.timeout': 'The check timed out. Try again shortly.',
        'error.rate-limited': 'GitHub rate-limited the check. Try again later.',
        'error.network': 'Could not reach GitHub. Check the network.',
        'error.upstream-response': 'The upstream release information could not be read.',
        'error.local-record': 'The local upstream.json could not be read.',
        'error.bad-response': 'The check returned an invalid response.',
        'error.update-unsupported': 'This installation cannot update itself.',
        'error.update-in-progress': 'Another update is already running.',
        'error.no-update': 'The skills are already up to date.',
        'error.git-unavailable': 'git is unavailable, so the upstream release cannot be fetched.',
        'error.update-timeout': 'Fetching upstream or writing the skills timed out.',
        'error.write-failed': 'Could not write the skills directory. Check file permissions.',
        'error.update-failed': 'The upstream skill sync failed.',
        'error.forbidden': 'The update request failed its origin check.',
        'error.unknown': 'The check failed. Try again shortly.',
      },
    }

    function formatDate(value, locale) {
      if (typeof value !== 'string' || value.length === 0) return null
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return null
      return date.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' })
    }

    function formatTime(value, locale) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return null
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    }

    function packageNameOf(subject) {
      if (subject === null || typeof subject !== 'object' || subject.kind !== 'bundle') return undefined
      const pkg = subject.pkg
      if (pkg !== null && typeof pkg === 'object') return pkg.name
      return subject.name ?? subject.packageName
    }

    function errorText(t, code) {
      return ERROR_CODES.has(code) ? t(`error.${code}`) : t('error.unknown')
    }

    function statusIcon(kind) {
      const color = kind === 'error'
        ? 'var(--dsw-alias-state-error-primary)'
        : kind === 'update'
          ? 'var(--dsw-alias-state-warn-primary)'
          : kind === 'current'
            ? 'var(--dsw-alias-state-success-primary)'
            : 'var(--dsw-alias-label-secondary)'
      const path = kind === 'update'
        ? 'M12 4v9m0 0 4-4m-4 4-4-4M5 18h14'
        : kind === 'error'
          ? 'M12 8v5m0 3h.01M4.7 19h14.6L12 4.5 4.7 19Z'
          : kind === 'loading'
            ? 'M12 3a9 9 0 1 0 9 9'
            : 'm7 12 3 3 7-7'
      return h('span', {
        'aria-hidden': true,
        style: {
          width: 30,
          height: 30,
          flex: '0 0 30px',
          display: 'grid',
          placeItems: 'center',
          borderRadius: '50%',
          background: 'var(--dsw-alias-bg-layer-1)',
          color,
        },
      }, h('svg', {
        width: 18,
        height: 18,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }, h('path', { d: path })))
    }

    function cardStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
        padding: '12px 14px',
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 10,
        background: 'var(--dsw-alias-bg-layer-2)',
      }
    }

    function UpstreamVersionBody({ t }) {
      const locale = typeof document === 'object' && document.documentElement.lang
        ? document.documentElement.lang
        : 'en'
      const [data, setData] = React.useState(null)
      const [failure, setFailure] = React.useState(null)
      const [updateFailure, setUpdateFailure] = React.useState(null)
      const [updateDone, setUpdateDone] = React.useState(null)
      const [checking, setChecking] = React.useState(true)
      const [updating, setUpdating] = React.useState(false)
      const requestId = React.useRef(0)
      const abortRef = React.useRef(null)
      const updateAbortRef = React.useRef(null)

      const check = React.useCallback(async (refresh) => {
        const currentRequest = requestId.current + 1
        requestId.current = currentRequest
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        setChecking(true)
        setFailure(null)
        setUpdateFailure(null)

        try {
          const response = await fetch(`${STATUS_PATH}${refresh ? '?refresh=1' : ''}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          })
          const text = await response.text()
          let payload = null
          try {
            payload = JSON.parse(text)
          } catch {
            payload = null
          }
          if (requestId.current !== currentRequest) return
          if (!response.ok || payload?.ok !== true) {
            if (payload?.bundled) setData(payload)
            console.warn(
              '[obsidian-skills] upstream check failed',
              payload?.error ?? text.slice(0, 200),
            )
            throw new Error(payload?.code ?? 'bad-response')
          }
          setData(payload)
        } catch (error) {
          if (requestId.current !== currentRequest) return
          const code = error instanceof Error && error.name === 'AbortError'
            ? 'timeout'
            : error instanceof Error && ERROR_CODES.has(error.message)
              ? error.message
              : 'unknown'
          if (code !== 'timeout') {
            console.warn('[obsidian-skills] upstream check failed', error)
          }
          setFailure(code)
        } finally {
          if (requestId.current === currentRequest) setChecking(false)
        }
      }, [])

      const update = React.useCallback(async () => {
        setUpdating(true)
        setUpdateFailure(null)
        setUpdateDone(null)
        setFailure(null)
        const controller = new AbortController()
        updateAbortRef.current?.abort()
        updateAbortRef.current = controller
        try {
          const response = await fetch(UPDATE_PATH, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-Obsidian-Skills-Update': '1',
            },
            body: '{}',
            signal: controller.signal,
          })
          const text = await response.text()
          let payload = null
          try {
            payload = JSON.parse(text)
          } catch {
            payload = null
          }
          if (!response.ok || payload?.ok !== true) {
            if (payload?.bundled) setData(payload)
            console.warn(
              '[obsidian-skills] upstream update failed',
              payload?.error ?? text.slice(0, 200),
            )
            throw new Error(payload?.code ?? 'update-failed')
          }
          setData(payload)
          setUpdateDone(payload.updatedVersion)
        } catch (error) {
          const code = error instanceof Error && ERROR_CODES.has(error.message)
            ? error.message
            : 'update-failed'
          console.warn('[obsidian-skills] upstream update failed', error)
          setUpdateFailure(code)
        } finally {
          setUpdating(false)
        }
      }, [])

      React.useEffect(() => {
        void check(false)
        return () => {
          requestId.current += 1
          abortRef.current?.abort()
          updateAbortRef.current?.abort()
        }
      }, [check])

      const kind = checking || updating
        ? 'loading'
        : updateFailure !== null || failure !== null
          ? 'error'
          : data === null
            ? 'error'
            : updateDone !== null
              ? 'current'
              : data.status === 'update-available'
                ? 'update'
                : data.status === 'up-to-date'
                  ? 'current'
                  : 'unknown'

      let message = t('checking')
      let detailLines = []
      if (updating) {
        message = t('updating')
        if (data?.bundled?.version) detailLines = [`${t('current')} v${data.bundled.version}`]
      } else if (updateFailure !== null) {
        message = t('updateFailed')
        detailLines = [errorText(t, updateFailure)]
      } else if (failure !== null) {
        message = t('failed')
        const bundledVersion = data?.bundled?.version
        detailLines = [
          errorText(t, failure) + (bundledVersion ? ` · ${t('current')} v${bundledVersion}` : ''),
        ]
      } else if (!checking && updateDone !== null) {
        message = `${t('updateSuccess')} v${updateDone}`
        const commit = typeof data?.bundled?.commit === 'string'
          ? data.bundled.commit.slice(0, 7)
          : null
        const synced = formatDate(data?.bundled?.syncedAt, locale)
        detailLines = [
          [
            `${t('current')} v${data.bundled.version}`,
            commit === null ? null : `${t('commit')} ${commit}`,
            synced === null ? null : `${t('synced')} ${synced}`,
          ].filter(Boolean).join(' · '),
        ]
      } else if (!checking && data !== null) {
        message = kind === 'update'
          ? `${t('available')}: v${data.latest.version}`
          : kind === 'current'
            ? t('latest')
            : kind === 'unknown'
              ? t('failed')
              : t('ahead')
        const commit = typeof data.bundled?.commit === 'string'
          ? data.bundled.commit.slice(0, 7)
          : null
        const synced = formatDate(data.bundled?.syncedAt, locale)
        const published = formatDate(data.latest?.publishedAt, locale)
        const checked = formatTime(data.checkedAt, locale)
        const primary = [
          `${t('current')} v${data.bundled.version}`,
          commit === null ? null : `${t('commit')} ${commit}`,
          synced === null ? null : `${t('synced')} ${synced}`,
        ].filter(Boolean).join(' · ')
        const secondary = [
          published === null ? null : `${t('published')} ${published}`,
          checked === null ? null : `${t('checked')} ${checked}`,
        ].filter(Boolean).join(' · ')
        detailLines = secondary.length > 0 ? [primary, secondary] : [primary]
      } else if (!checking) {
        message = t('failed')
        detailLines = [t('error.unknown')]
      }

      const releaseUrl = typeof data?.latest?.url === 'string' && /^https:\/\//u.test(data.latest.url)
        ? data.latest.url
        : null
      const showUpdate = data?.updateAvailable === true && data?.canUpdate === true

      return h('section', {
        'aria-labelledby': 'obsidian-upstream-version-title',
        style: {
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--dsw-alias-border-l1)',
        },
      }, [
        h('div', {
          key: 'head',
          style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
        }, [
          h('div', { key: 'copy', style: { minWidth: 0 } }, [
            h('h4', {
              key: 'title',
              id: 'obsidian-upstream-version-title',
              style: {
                margin: 0,
                color: 'var(--dsw-alias-label-primary)',
                fontSize: 13,
                fontWeight: 600,
              },
            }, t('title')),
            h('div', {
              key: 'subtitle',
              style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, marginTop: 3 },
            }, t('subtitle')),
          ]),
          h('div', {
            key: 'actions',
            style: { display: 'flex', gap: 8, flex: '0 0 auto', alignItems: 'center' },
          }, [
            showUpdate
              ? h('button', {
                  key: 'update',
                  type: 'button',
                  disabled: checking || updating,
                  onClick: () => void update(),
                  style: {
                    border: '1px solid transparent',
                    borderRadius: 8,
                    padding: '5px 10px',
                    color: '#fff',
                    background: 'var(--dsw-alias-brand-primary)',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    cursor: checking || updating ? 'default' : 'pointer',
                    opacity: checking || updating ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  },
                }, updating ? t('updating') : `${t('update')} v${data.latest.version}`)
              : null,
            h('button', {
              key: 'check',
              type: 'button',
              disabled: checking || updating,
              onClick: () => void check(true),
              style: {
                border: '1px solid var(--dsw-alias-border-l1)',
                borderRadius: 8,
                padding: '5px 10px',
                color: 'var(--dsw-alias-label-primary)',
                background: 'var(--dsw-alias-bg-layer-1)',
                fontFamily: 'inherit',
                fontSize: 12,
                cursor: checking || updating ? 'default' : 'pointer',
                opacity: checking || updating ? 0.6 : 1,
                whiteSpace: 'nowrap',
              },
            }, checking ? t('checkingShort') : (data === null ? t('retry') : t('recheck'))),
          ]),
        ]),
        h('div', {
          key: 'status',
          role: 'status',
          'aria-live': 'polite',
          'aria-busy': checking || updating,
          style: cardStyle(),
        }, [
          statusIcon(kind),
          h('div', { key: 'text', style: { minWidth: 0, flex: 1 } }, [
            h('div', {
              key: 'message',
              style: {
                color: kind === 'error'
                  ? 'var(--dsw-alias-state-error-primary)'
                  : 'var(--dsw-alias-label-primary)',
                fontSize: 13,
                fontWeight: 500,
              },
            }, message),
            ...detailLines.map((line, index) => h('div', {
              key: `detail-${index}`,
              style: {
                color: 'var(--dsw-alias-label-secondary)',
                fontSize: 12,
                marginTop: index === 0 ? 3 : 1,
                overflowWrap: 'anywhere',
              },
            }, line)),
          ]),
          releaseUrl
            ? h('a', {
                key: 'release',
                href: releaseUrl,
                target: '_blank',
                rel: 'noreferrer',
                style: {
                  color: 'var(--dsw-alias-brand-primary)',
                  fontSize: 12,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                },
              }, t('release'))
            : null,
        ]),
      ])
    }

    function UpstreamVersionSection({ subject, t }) {
      if (packageNameOf(subject) !== PACKAGE_NAME) return null
      return h(UpstreamVersionBody, { t })
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.register('obsidianUpstream', 'en', STRINGS.en),
          'obsidian-skills: upstream version strings (en)',
        )
        ctx.effect(
          () => ctx.locale.register('obsidianUpstream', 'zh', STRINGS.zh),
          'obsidian-skills: upstream version strings (zh)',
        )
        const t = ctx.locale.bind('obsidianUpstream')
        ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
          name: 'plugins.detail.section',
          id: 'obsidian-upstream-version',
          order: 20,
        }, (props) => h(UpstreamVersionSection, { ...props, t })))
      },
    }
  },
})
