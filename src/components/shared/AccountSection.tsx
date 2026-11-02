import { useCallback, useEffect, useState } from 'react'
import { useSyncStore } from '../../store/syncStore'
import { useTranslation } from '../../hooks/useTranslation'
import * as api from '../../sync/api'
import { ApiError } from '../../sync/api'
import { onLoggedIn, syncNow } from '../../sync/engine'

const rowCls = 'flex items-center justify-between px-4 py-4 rounded-2xl bg-surface-container-low'
const pillBtn =
  'px-4 py-2.5 rounded-full text-sm font-headline font-medium whitespace-nowrap active:scale-[0.98] transition-all disabled:opacity-50'
const primaryBtn = `${pillBtn} bg-gradient-to-b from-primary-container to-primary text-on-primary shadow-lg shadow-primary/20`
const subtleBtn = `${pillBtn} bg-surface-container-highest text-on-surface`
const inputCls =
  'w-full px-4 py-3 rounded-xl bg-surface-container-highest text-on-surface font-headline text-sm outline-none'

function deviceLabel(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Android/.test(ua)) return 'Android'
  return 'Device'
}

function relativeTime(at: number, lang: string, justNow: string): string {
  const diffSec = Math.round((at - Date.now()) / 1000)
  if (Math.abs(diffSec) < 60) return justNow
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const mins = Math.round(diffSec / 60)
  if (Math.abs(mins) < 60) return rtf.format(mins, 'minute')
  const hours = Math.round(mins / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(hours / 24), 'day')
}

export function AccountSection() {
  const { t, lang } = useTranslation()
  const { loggedIn, hasUser, loginAvailable, status, dirty, lastSyncedAt } = useSyncStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [passphrase, setPassphrase] = useState('')
  const [showRecoveryInput, setShowRecoveryInput] = useState(false)
  const [recoveryInput, setRecoveryInput] = useState('')
  const [shownCode, setShownCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [passkeys, setPasskeys] = useState<api.PasskeyInfo[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const loadPasskeys = useCallback(async () => {
    try {
      setPasskeys((await api.listPasskeys()).passkeys)
    } catch {
      /* status shown by sync state */
    }
  }, [])

  useEffect(() => {
    if (loggedIn && !shownCode) void loadPasskeys()
  }, [loggedIn, shownCode, loadPasskeys])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await fn()
    } catch (e) {
      if (e instanceof ApiError && e.code === 'bad_passphrase') setError(t.authErrorBadPassphrase)
      else if (e instanceof ApiError && e.code === 'rate_limited') setError(t.authErrorRateLimited)
      else setError(t.authErrorGeneric)
    } finally {
      setBusy(false)
    }
  }

  const finishCodeDisplay = () => {
    setShownCode(null)
    setCopied(false)
    void onLoggedIn()
  }

  if (shownCode) {
    return (
      <div className="flex flex-col gap-3 px-4 py-5 rounded-2xl bg-primary-fixed">
        <p className="text-sm font-headline font-semibold text-on-surface">{t.recoveryCodeTitle}</p>
        <p className="font-headline text-2xl font-bold tracking-wider text-primary text-center select-all">{shownCode}</p>
        <p className="text-xs text-outline">{t.recoveryCodeNote}</p>
        <div className="flex gap-2">
          <button
            className={`flex-1 ${subtleBtn}`}
            onClick={() => {
              void navigator.clipboard?.writeText(shownCode).then(() => setCopied(true))
            }}
          >
            {copied ? t.copied : t.copy}
          </button>
          <button className={`flex-1 ${primaryBtn}`} onClick={finishCodeDisplay}>
            {t.iWroteItDown}
          </button>
        </div>
      </div>
    )
  }

  const statusText = (() => {
    if (status === 'needs-login') return t.syncStatusNeedsLogin
    if (status === 'offline') return t.syncStatusOffline
    if (status === 'syncing') return t.syncStatusSyncing
    if (status === 'error') return t.syncStatusError
    return dirty ? t.syncStatusDirty : t.syncStatusSynced
  })()

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-outline font-headline px-1">{t.accountTitle}</p>

      {!loginAvailable ? (
        <div className={rowCls}>
          <span className="text-sm text-outline font-headline">{t.loginOnlyOn}</span>
        </div>
      ) : !loggedIn ? (
        <div className="flex flex-col gap-3 px-4 py-4 rounded-2xl bg-surface-container-low">
          {status === 'needs-login' && <p className="text-sm text-primary font-headline">{t.syncStatusNeedsLogin}</p>}
          {hasUser ? (
            <>
              <button
                className={primaryBtn}
                disabled={busy}
                onClick={() => run(async () => {
                  await api.login()
                  await onLoggedIn()
                })}
              >
                {t.loginWithPasskey}
              </button>
              <button
                className="text-xs text-outline font-headline underline self-center"
                onClick={() => setShowRecoveryInput((v) => !v)}
              >
                {t.loginWithRecovery}
              </button>
              {showRecoveryInput && (
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={recoveryInput}
                    placeholder={t.recoveryCodePlaceholder}
                    autoCapitalize="characters"
                    autoComplete="off"
                    onChange={(e) => setRecoveryInput(e.target.value)}
                  />
                  <button
                    className={subtleBtn}
                    disabled={busy || !recoveryInput.trim()}
                    onClick={() => run(async () => {
                      const { recoveryCode } = await api.recover(recoveryInput)
                      setRecoveryInput('')
                      setShowRecoveryInput(false)
                      setShownCode(recoveryCode)
                    })}
                  >
                    {t.submit}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-headline font-medium text-on-surface">{t.setupTitle}</p>
              <input
                className={inputCls}
                type="password"
                value={passphrase}
                placeholder={t.setupPassphrasePlaceholder}
                onChange={(e) => setPassphrase(e.target.value)}
              />
              <button
                className={primaryBtn}
                disabled={busy || !passphrase}
                onClick={() => run(async () => {
                  const { recoveryCode } = await api.register(passphrase, deviceLabel())
                  setPassphrase('')
                  if (recoveryCode) setShownCode(recoveryCode)
                  else await onLoggedIn()
                })}
              >
                {t.registerPasskey}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className={rowCls}>
            <div className="flex flex-col">
              <span className="text-sm font-headline font-medium text-on-surface">{statusText}</span>
              {lastSyncedAt && (
                <span className="text-xs text-outline">{t.lastSynced(relativeTime(lastSyncedAt, lang, t.justNow))}</span>
              )}
            </div>
            <button className={subtleBtn} disabled={busy || status === 'syncing'} onClick={() => run(syncNow)}>
              {t.syncNow}
            </button>
          </div>

          <div className="flex flex-col gap-2 px-4 py-4 rounded-2xl bg-surface-container-low">
            <span className="text-sm font-headline font-medium text-on-surface">{t.passkeysTitle}</span>
            {passkeys.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1">
                <span className="text-sm text-on-surface">
                  {p.label ?? 'Passkey'}
                  <span className="text-xs text-outline ml-2">{new Date(p.createdAt).toLocaleDateString(lang)}</span>
                </span>
                {passkeys.length > 1 && (
                  <button
                    className="text-xs text-outline font-headline underline"
                    disabled={busy}
                    onClick={() => {
                      if (!confirm(t.deletePasskeyConfirm(p.label ?? 'Passkey'))) return
                      void run(async () => {
                        await api.deletePasskey(p.id)
                        await loadPasskeys()
                      })
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              className={`${subtleBtn} self-start`}
              disabled={busy}
              onClick={() => run(async () => {
                await api.register(undefined, deviceLabel())
                await loadPasskeys()
              })}
            >
              {t.addPasskey}
            </button>
          </div>

          <div className="flex gap-2">
            <button
              className={`flex-1 ${subtleBtn}`}
              disabled={busy}
              onClick={() => {
                if (!confirm(t.revokeOthersConfirm)) return
                void run(async () => {
                  await api.revokeOthers()
                  setNotice(t.done2)
                })
              }}
            >
              {t.revokeOthers}
            </button>
            <button
              className={`flex-1 ${subtleBtn}`}
              disabled={busy}
              onClick={() => run(async () => {
                await api.logout()
                useSyncStore.setState({ loggedIn: false, status: 'idle' })
                setPasskeys([])
              })}
            >
              {t.logout}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm text-center text-primary font-headline">{error}</p>}
      {notice && <p className="text-sm text-center text-outline font-headline">{notice}</p>}
    </div>
  )
}
