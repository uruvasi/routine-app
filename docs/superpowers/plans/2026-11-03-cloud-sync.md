# クラウド同期（パスキー認証 + Cloudflare）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ルーティン／タスクを、パスキーでログインした端末間で Cloudflare（Pages Functions + D1）経由で同期する。未ログイン時・オフライン時の動作は今までどおりに保つ。

**Architecture:**
- サーバー: `functions/api/[[route]].ts` に Hono アプリを 1 つ置き、D1 にユーザー・パスキー・セッション・復旧コード・ルーティンのスナップショットを保存する。
- クライアント: 既存の `routine-store`（localStorage）をローカルキャッシュとして残す。同期の判定は純粋関数（`src/sync/logic.ts`）にまとめ、`sync-store` と同期エンジン（`src/sync/engine.ts`）がその判定を実行する。
- 衝突時・初回移行時は自動マージしない。上書きされる側のデータは必ず退避する。

**Tech Stack:**
- 既存: Vite 7 / React 19 / TS / Zustand v5 / vite-plugin-pwa
- 追加: Hono, @simplewebauthn/server・@simplewebauthn/browser（v13 系）, Vitest, @cloudflare/vitest-pool-workers, wrangler

**Spec:** `docs/superpowers/specs/2026-11-03-cloud-sync-design.md`

## Global Constraints

- 本番 RP ID は `rt.kazusa.org`、expected origin は `https://rt.kazusa.org` のみ。RP ID を後から変えない。
- 検証環境: `staging` ブランチを `staging.routine-app-bpz.pages.dev` にデプロイし、別の D1 と別の合言葉を使う。RP ID は `staging.routine-app-bpz.pages.dev`。
- 上記以外のオリジン（`routine-app-bpz.pages.dev`、他のプレビュー）ではログイン系 API が `403 { error: 'login_unavailable' }` を返す。
- アカウントは 1 つだけ作れる。最初の登録にはセットアップ用合言葉（secret `SETUP_PASSPHRASE`）が必要。
- セッション Cookie は `__Host-rt_session`（`HttpOnly; Secure; SameSite=Lax; Path=/`）。期限は 180 日で、アクセス時に延長する。D1 にはトークンの SHA-256 ハッシュだけを保存する。
- 同期対象はルーティンとタスクのみ。`settings-store`（言語・テーマ）と `timer-store` は同期しない。
- 編集から送信までの debounce は 2000ms。
- 退避キーは `routine-store-backup-<epochMs>`。最新 5 件だけ残す。
- データを黙って捨てない。上書きや破棄の前には必ず退避する。
- 新しい UI 文言はすべて `src/i18n/translations.ts` に ja / en の両方で追加する。
- デザインは CLAUDE.md の Stitch ルールに従う（1px ボーダー禁止、`rounded-2xl` カード、`rounded-full` ボタン、`whitespace-nowrap`）。
- 新規 ID は `crypto.randomUUID()`。既存 ID は変更しない。

## Review Focus

1. **送信中にさらに編集した場合:** PUT の途中で次の編集が入っても、その変更が失われてはいけない。dirty は残し、続けて再送する（Task 7 でテスト）。
2. **セッション切れ（401）:** 同期中に 401 が返ったら、ローカルデータと dirty は保持する。「再ログインしてください」の状態にし、データは消さない（Task 7 でテスト）。
3. **ログイン済みでオフラインのまま起動:** エラーダイアログを出さずに、ローカルデータで普通に使える。`online` イベントが来たら送信する（Task 7 でテスト）。
4. **Service Worker:** `/api/*` を SPA の navigateFallback やキャッシュで返してはいけない（Task 2 で、ビルド成果物の `sw.js` を検査する）。
5. **開いているルーティンが同期で消えた場合:** エディタで開いている、またはタイマーで選択中のルーティンが同期で消えても、クラッシュせずに一覧へ戻る（Task 8 でテスト）。

---

## File Structure

```
functions/api/[[route]].ts        # Pages Functions エントリ。server/app.ts を handle() で公開するだけ
server/app.ts                     # Hono アプリ組み立て + origin ガード
server/env.ts                     # Env 型 (DB, RP_ID, RP_ORIGIN, SETUP_PASSPHRASE)
server/session.ts                 # トークン生成・ハッシュ・Cookie・requireAuth
server/auth.ts                    # パスキー登録/ログイン、復旧、パスキー一覧/削除、他端末ログアウト
server/routines.ts                # GET/PUT/DELETE /api/routines
server/*.test.ts                  # Workers プールでのテスト
migrations/0001_init.sql
wrangler.toml
vitest.workspace.ts               # client (node) / server (workers) の 2 プロジェクト
src/sync/logic.ts                 # 純粋関数: 判定ロジック
src/sync/backup.ts                # 退避キーの保存と整理
src/sync/api.ts                   # fetch クライアント
src/sync/engine.ts                # 取得/送信/debounce/トリガー/タイマー保留
src/store/syncStore.ts            # sync-store (persist)
src/components/shared/AccountSection.tsx
src/components/shared/SyncConflictDialog.tsx
```

---

### Task 1: テスト基盤と routineStore の拡張

**Files:**
- Modify: `package.json`（`"test": "vitest run"`、devDeps に `vitest`）
- Create: `vitest.workspace.ts`（この時点では client プロジェクトのみ。`include: ['src/**/*.test.ts']`、environment `node`）
- Modify: `src/store/routineStore.ts`
- Test: `src/store/routineStore.test.ts`

**Interfaces:**
- Produces:
  - `genId(): string`（`crypto.randomUUID()`）
  - `isSeedRoutines(routines: Routine[]): boolean`
  - ストアの追加フィールド `localEdited: boolean`
  - アクション `replaceFromSync(routines: Routine[]): void`。`localEdited` を変えない。
  - アクション `clearLocal(): void`。`routines: []`、`localEdited: false` にする。

- [ ] **Step 1: 失敗するテストを書く**
  - `isSeedRoutines` は、既定の「朝ルーティン」（タスク名 `起床・水を飲む`/60、`ストレッチ`/300、`朝食`/600）1 件なら `true`。ID と `createdAt` は無視する。名前やタスクが 1 つでも違えば `false`、`[]` なら `true`。
  - `addRoutine`, `updateRoutine`, `deleteRoutine`, `addTask`, `updateTask`, `deleteTask`, `reorderTasks`, `reorderRoutines`, `importRoutines` のどれを呼んでも、`localEdited === true` になる。
  - `replaceFromSync(x)` の後は `routines === x` で、`localEdited` は呼ぶ前の値のまま。
  - `addRoutine` で作られた ID が UUID 形式（`/^[0-9a-f-]{36}$/`）である。
- [ ] **Step 2:** `npx vitest run src/store/routineStore.test.ts` を実行し、FAIL することを確認する。
- [ ] **Step 3: 実装する**
  - 各編集アクションの `set` に `localEdited: true` を足す。
  - persist の `version: 1` と `migrate` を追加する。v0 から上げるときは、`localEdited = !isSeedRoutines(state.routines)` にする。
- [ ] **Step 4:** `npm test` が PASS し、`npm run build` も成功することを確認する。
- [ ] **Step 5: コミットする** — `feat(store): add localEdited flag, UUID ids, replaceFromSync`

---

### Task 2: Cloudflare 基盤（wrangler, D1 スキーマ, Hono, セッション, SW 除外）

**Files:**
- Create: `wrangler.toml`, `migrations/0001_init.sql`, `functions/api/[[route]].ts`, `server/app.ts`, `server/env.ts`, `server/session.ts`, `server/session.test.ts`
- Modify: `vitest.workspace.ts`（server プロジェクトを追加。`@cloudflare/vitest-pool-workers` を使い、`readD1Migrations('migrations')` を `applyD1Migrations` で適用する）、`package.json`（deps に `hono`、devDeps に `wrangler`, `@cloudflare/vitest-pool-workers`, `@cloudflare/workers-types`）、`vite.config.ts`、`.gitignore`（`.wrangler/`）
- Create: `tsconfig.server.json`（`include: ["server", "functions"]`、types は `@cloudflare/workers-types`）。`tsconfig.json` の references にも追加する。

**`wrangler.toml` に決める値:**
- `name = "routine-app"`, `pages_build_output_dir = "dist"`, `compatibility_date` は作業日。
- `[[d1_databases]] binding = "DB"`。本番 DB 名は `routine-app-db`。`[env.preview]` の DB 名は `routine-app-db-staging`。
- `[vars]` は `RP_ID = "rt.kazusa.org"`, `RP_ORIGIN = "https://rt.kazusa.org"`。`[env.preview.vars]` は `RP_ID = "staging.routine-app-bpz.pages.dev"`, `RP_ORIGIN = "https://staging.routine-app-bpz.pages.dev"`。
- `SETUP_PASSPHRASE` は wrangler.toml に書かず、Pages の secret として登録する（Task 9）。

**`migrations/0001_init.sql` のテーブル:**
- `users(id TEXT PK, created_at INTEGER)`
- `passkeys(credential_id TEXT PK, user_id TEXT, public_key BLOB, counter INTEGER, transports TEXT, label TEXT, created_at INTEGER, last_used_at INTEGER)`
- `sessions(token_hash TEXT PK, user_id TEXT, created_at INTEGER, expires_at INTEGER)`
- `recovery_codes(user_id TEXT PK, code_hash TEXT, created_at INTEGER)`
- `challenges(id TEXT PK, challenge TEXT, purpose TEXT, user_id TEXT NULL, expires_at INTEGER)`。WebAuthn のチャレンジ保管用で、期限は 5 分。
- `routine_snapshots(user_id TEXT PK, revision INTEGER NOT NULL, schema_version INTEGER NOT NULL, payload_json TEXT NOT NULL, updated_at INTEGER NOT NULL, cleared_at INTEGER NULL)`

**Interfaces:**
- Produces:
  - `type Env = { DB: D1Database; RP_ID: string; RP_ORIGIN: string; SETUP_PASSPHRASE: string }`
  - `createApp(): Hono<{ Bindings: Env; Variables: { userId: string } }>`
  - `server/session.ts` から次の関数:
    - `createSession(env: Env, userId: string): Promise<string>`。生トークンを返す。
    - `setSessionCookie(c: Context, token: string): void`
    - `requireAuth: MiddlewareHandler`。`c.var.userId` を設定する。失敗したら `401 { error: 'unauthorized' }`。
    - `revokeSessions(env: Env, userId: string, exceptTokenHash?: string): Promise<void>`
    - `sha256Hex(s: string): Promise<string>`
  - `originGuard`: `/api/auth/*` で、`Origin` ヘッダー（無ければ `new URL(c.req.url).origin`）が `RP_ORIGIN` と違えば `403 { error: 'login_unavailable' }` を返す。CSRF 対策も兼ねる。
  - `GET /api/session` は `{ loggedIn: boolean; hasUser: boolean; loginAvailable: boolean }` を返す。
  - `POST /api/logout` は現在のセッションを削除し、Cookie を消す。

- [ ] **Step 1: 失敗するテストを書く**（`server/session.test.ts`、`SELF.fetch` または `createApp().request(path, init, env)` を使う）
  - Cookie なしの `GET /api/session` は `{ loggedIn:false, hasUser:false, loginAvailable:true }` を返す（Origin は `https://rt.kazusa.org`）。
  - Origin が `https://routine-app-bpz.pages.dev` のとき、`loginAvailable:false` になる。`POST /api/auth/login/options` は 403 で `login_unavailable` を返す。
  - `createSession` したトークンを Cookie に付けると `loggedIn:true` になる。D1 の `sessions.token_hash` は生トークンと一致しない。
  - 期限切れのセッションでは `loggedIn:false` になる。
  - 有効なセッションでアクセスすると `expires_at` が延びる（180 日）。
  - `POST /api/logout` の後は `loggedIn:false` になる。
- [ ] **Step 2:** `npm test` を実行し、server のテストが FAIL することを確認する。
- [ ] **Step 3: 実装する**
  - `functions/api/[[route]].ts` は `import { handle } from 'hono/cloudflare-pages'` を使い、`export const onRequest = handle(createApp())` だけにする。
  - トークンは 32 バイト乱数の base64url にする。
- [ ] **Step 4: SW から `/api` を除外する**
  - `vite.config.ts` の `workbox` に `navigateFallbackDenylist: [/^\/api\//]` を追加する。
  - 確認: `npm run build && grep -o 'api' dist/sw.js` で denylist の正規表現が出力される。
- [ ] **Step 5:** `npm test` と `npm run build` が PASS することを確認する。`npx wrangler pages dev dist` を起動し、`curl -s localhost:8788/api/session` が JSON を返すことを確認する（ローカル D1 には、事前に `npx wrangler d1 migrations apply routine-app-db --local` を流しておく）。
- [ ] **Step 6: コミットする** — `feat(server): cloudflare pages functions, D1 schema, sessions`

---

### Task 3: パスキー登録・ログイン

**Files:**
- Create: `server/auth.ts`, `server/auth.test.ts`
- Modify: `server/app.ts`（`/api/auth` をマウント）, `package.json`（`@simplewebauthn/server`）

**Interfaces:**
- Consumes: Task 2 の `Env`, `createSession`, `setSessionCookie`, `requireAuth`, `sha256Hex`
- Produces（すべて JSON）:
  - `POST /api/auth/register/options`, body `{ passphrase?: string; label?: string }`
    - ユーザーが 0 人なら `passphrase === SETUP_PASSPHRASE` が必要。違えば `403 { error: 'bad_passphrase' }`。
    - ユーザーが 1 人以上いる場合は、セッション必須（パスキー追加）。無ければ `403 { error: 'registration_closed' }`。
    - 返り値は `{ options: PublicKeyCredentialCreationOptionsJSON }`。challenge は `challenges` に保存し、id は Cookie `__Host-rt_chal` で返す。
    - `rpID = RP_ID`、`residentKey: 'required'`、`userVerification: 'preferred'`。
  - `POST /api/auth/register/verify`, body `{ response: RegistrationResponseJSON; label?: string }`
    - `verifyRegistrationResponse` の `expectedOrigin` は `RP_ORIGIN`、`expectedRPID` は `RP_ID`。
    - 初回登録の場合: ユーザーを作成し、セッションを発行する。復旧コードを生成し（形式 `XXXX-XXXX-XXXX-XXXX`、英大文字と数字、紛らわしい `0O1I` は除く）、ハッシュを保存する。返り値は `{ ok: true; recoveryCode: string }`。
    - 追加の場合: 返り値は `{ ok: true }`。
    - 2 人目のユーザーは、どの経路でも作れないこと。
  - `POST /api/auth/login/options` は `{ options }` を返す（allowCredentials は空。discoverable credential を使う）。
  - `POST /api/auth/login/verify`, body `{ response: AuthenticationResponseJSON }`
    - 成功したら counter と last_used_at を更新し、セッション Cookie を設定する。返り値は `{ ok: true }`。
    - 失敗したら `401 { error: 'auth_failed' }`。
  - チャレンジは一度使ったら削除する。期限切れなら `400 { error: 'challenge_expired' }`。

- [ ] **Step 1: 失敗するテストを書く**
  - `vi.mock('@simplewebauthn/server')` で、verify 系の結果を差し替える。
  - ユーザー 0 人で合言葉が違う場合 → 403 `bad_passphrase`。
  - 合言葉が正しい場合 → options → verify（mock で verified=true）→ `recoveryCode` が `/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/` に一致する。`users` が 1 行、`recovery_codes` が 1 行。Set-Cookie に `__Host-rt_session` が含まれる。
  - ユーザーがいて未ログインの場合 → register/options は 403 `registration_closed`（合言葉が正しくても拒否する）。
  - ログイン済みで追加する場合 → `passkeys` が 2 行になり、`users` は 1 行のまま。
  - login/verify で mock が verified=false → 401。verified=true → `GET /api/session` が `loggedIn:true`。
  - 同じチャレンジを 2 回使う → 2 回目は 400。
- [ ] **Step 2:** `npm test` を実行し、FAIL することを確認する。
- [ ] **Step 3:** 上記のエンドポイントを `server/auth.ts` に実装する。
- [ ] **Step 4:** `npm test` が PASS することを確認する。
- [ ] **Step 5: コミットする** — `feat(server): passkey registration and login`

---

### Task 4: 復旧コード・パスキー管理・他端末ログアウト

**Files:**
- Modify: `server/auth.ts`, `server/auth.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/auth/recover`, body `{ code: string }`
    - 入力は大文字化し、空白を除いてから比較する。
    - 一致したら、その user の全セッションを失効させる。そのうえで新しいセッションを発行し、復旧コードを再発行する。返り値は `{ ok: true; recoveryCode: string }`。
    - 不一致なら `401 { error: 'auth_failed' }`。
    - 失敗が続く場合のレート制限は簡易で構わない。同一 IP で 10 回／10 分を超えたら 429。カウンタは D1 の `challenges` に `purpose='recover_fail'` で保存する。
  - `GET /api/auth/passkeys`（要ログイン）は `{ passkeys: { id: string; label: string | null; createdAt: number; lastUsedAt: number | null }[] }` を返す。
  - `DELETE /api/auth/passkeys/:id`（要ログイン）。最後の 1 つは削除できない（`409 { error: 'last_passkey' }`）。
  - `POST /api/auth/revoke-others`（要ログイン）。自分のセッション以外をすべて削除する。

- [ ] **Step 1: 失敗するテストを書く**
  - 正しいコードの場合 → 200。既存の 2 セッションが無効になり、新しいセッションだけ有効。新しい `recoveryCode` は旧コードと違う。旧コードはもう使えない（401）。
  - 小文字やハイフン無しで入力しても通る。
  - 11 回連続で失敗すると 429。
  - パスキーが 1 つのときの DELETE → 409。2 つあれば削除できる。
  - revoke-others の後、呼び出したセッションは有効で、他のセッションは 401。
- [ ] **Step 2:** FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** `npm test` が PASS することを確認する。
- [ ] **Step 5: コミットする** — `feat(server): recovery code, passkey management, revoke other sessions`

---

### Task 5: ルーティン API

**Files:**
- Create: `server/routines.ts`, `server/routines.test.ts`
- Modify: `server/app.ts`

**Interfaces:**
- Produces（すべて要ログイン）:
  - `type Snapshot = { revision: number; routines: Routine[]; updatedAt: number | null; clearedAt: number | null }`。`Routine` は `src/types` から import する。tsconfig.server の include に `src/types` を追加する。
  - `GET /api/routines` → `Snapshot`。行が無ければ `{ revision: 0, routines: [], updatedAt: null, clearedAt: null }`。
  - `PUT /api/routines`, body `{ baseRevision: number; routines: Routine[] }`
    - 原子的な比較更新にする（`UPDATE … WHERE user_id=? AND revision=?`。行が無く baseRevision=0 なら INSERT）。
    - 成功したら `{ revision: base+1, updatedAt }` を返す。`cleared_at` は NULL に戻す。
    - 失敗したら `409 Snapshot`（最新版）を返す。
    - body の検証: `routines` は配列で、各要素に `id`/`name`/`tasks`/`createdAt`、各 task に `id`/`name`/`duration`（0 以上の整数）があること。違反したら 400。payload が 1MB を超えたら 413。
  - `DELETE /api/routines` → `routines=[]`, `revision+1`, `cleared_at=now`。返り値は `{ revision }`。

- [ ] **Step 1: 失敗するテストを書く**
  - 未ログインなら 401。
  - 初回 GET → revision 0。PUT（base 0）→ revision 1。GET で同じ routines が返る（配列の順序も保持される）。
  - 古い base で PUT → 409。body には最新の routines と revision が入っている。
  - DELETE → revision が +1、routines は `[]`、`clearedAt` が数値。その後、古い base で PUT すると 409。
  - duration が負の値なら 400。
- [ ] **Step 2:** FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** `npm test` が PASS することを確認する。
- [ ] **Step 5: コミットする** — `feat(server): routines snapshot API with revision CAS`

---

### Task 6: 同期の判定ロジックと退避（純粋関数）

**Files:**
- Create: `src/sync/logic.ts`, `src/sync/logic.test.ts`, `src/sync/backup.ts`, `src/sync/backup.test.ts`

**Interfaces:**
- Consumes: Task 1 の `isSeedRoutines`
- Produces:
  - `type LocalState = { routines: Routine[]; localEdited: boolean; dirty: boolean; baseRevision: number | null }`。`baseRevision === null` は「この端末はまだ一度も同期していない」を表す。
  - `type FetchDecision = | { kind: 'noop' } | { kind: 'adopt'; backup: boolean } | { kind: 'upload' } | { kind: 'push' } | { kind: 'ask-initial' }`
  - `decideOnFetch(local: LocalState, remote: Snapshot): FetchDecision` は次の規則で判定する。
    - **初回（`baseRevision === null`）**
      - remote.routines が空 → `upload`
      - local.routines が空、または `!localEdited`、または `isSeedRoutines(local.routines)` → `adopt`（`backup: local.routines.length > 0`）
      - それ以外 → `ask-initial`
    - **2 回目以降**
      - `dirty` → `push`（衝突していれば push 側で 409 を受けて処理する）
      - `remote.revision > baseRevision` → `adopt`（`backup: local.routines.length > 0`）
      - それ以外 → `noop`
  - `saveBackup(routines: Routine[], now = Date.now()): string`。キーを返し、6 件目以降の古いキーは削除する。
  - `listBackups(): { key: string; at: number; count: number }[]`

- [ ] **Step 1: 失敗するテストを書く**
  - 上記の分岐ごとに 1 テストずつ書く。
    - 初回でローカルがサンプルのまま、クラウドに 3 件 → `adopt`。
    - 初回でローカルが編集済み、クラウドに 1 件 → `ask-initial`。
    - 初回でクラウドが空 → `upload`。
    - dirty → `push`。
    - remote が新しく dirty=false → `adopt`。
    - remote と base が同じ → `noop`。
    - クラウドが「消された（`routines: []`、revision が進んでいる）」状態で dirty=false → `adopt`、かつ `backup: true`。
  - backup では、localStorage のスタブ（`globalThis.localStorage` に Map ベースの実装）を使う。
    - 7 回保存すると 5 件だけ残り、残るのは最新の 5 件。
- [ ] **Step 2:** FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** PASS することを確認する。
- [ ] **Step 5: コミットする** — `feat(sync): pure decision logic and local backups`

---

### Task 7: sync-store・API クライアント・同期エンジン

**Files:**
- Create: `src/store/syncStore.ts`, `src/sync/api.ts`, `src/sync/engine.ts`, `src/sync/engine.test.ts`
- Modify: `src/App.tsx`（`useEffect` で `startSyncEngine()` を呼び、cleanup で停止する）, `package.json`（`@simplewebauthn/browser`）

**Interfaces:**
- Consumes: Task 1 の store API、Task 5 の API の形、Task 6 の `decideOnFetch`, `saveBackup`
- Produces:
  - `useSyncStore`（persist キー `sync-store`）:
    - `{ loggedIn: boolean; loginAvailable: boolean; baseRevision: number | null; dirty: boolean; lastSyncedAt: number | null; status: 'idle' | 'syncing' | 'offline' | 'error' | 'needs-login'; conflict: null | { kind: 'initial' | 'revision'; remote: Snapshot }; pendingRemote: Snapshot | null }`
    - persist するのは `baseRevision`, `dirty`, `lastSyncedAt`, `loggedIn` だけ。
  - `src/sync/api.ts`:
    - `getSession()`, `getRoutines()`, `putRoutines(base, routines)`。409 のときは `{ conflict: Snapshot }` を返す。
    - `deleteRoutines()`
    - `register(passphrase?: string, label?: string): Promise<{ recoveryCode?: string }>`
    - `login(): Promise<void>`, `recover(code: string): Promise<{ recoveryCode: string }>`, `logout()`
    - `listPasskeys()`, `deletePasskey(id)`, `revokeOthers()`
    - 401 のときは `UnauthorizedError` を投げる。ネットワーク失敗のときは `OfflineError` を投げる。
  - `src/sync/engine.ts`:
    - `startSyncEngine(deps?: { api?: typeof api; now?: () => number }): () => void`
    - `syncNow(): Promise<void>`
    - `resolveConflict(choice: 'use-remote' | 'use-local'): Promise<void>`
    - `clearLocalData(): Promise<void>`（ログイン中はクリアしてから再取得する）
    - `clearCloudData(): Promise<void>`

**エンジンの振る舞い:**
- **トリガー:** 起動時、`visibilitychange`（visible になったとき）、`online` イベント、ログイン成功の直後。
- **未ログイン時:** 何もしない。
- **取得:** `decideOnFetch` に従う。
  - `adopt` の場合:
    - `backup` が true なら、先に `saveBackup` する。
    - タイマーが `running` / `paused` のときは `pendingRemote` に保留する。`useTimerStore` を subscribe し、`idle` / `finished` になったら適用する。
    - 適用は `replaceFromSync`。その後 `baseRevision = remote.revision`、`localEdited` は true にする（同期済みのデータは「編集済み」として扱い、次回の初回判定で消されないようにするため）。
  - `upload`: baseRevision 0 で PUT する。
  - `ask-initial`: `conflict = { kind: 'initial', remote }` にする。
  - `push`: 下記の送信処理。
- **送信:**
  - `useRoutineStore` を subscribe し、`routines` の参照が変わったら `dirty = true` にして、2000ms の debounce で PUT する。ただし `replaceFromSync` による変化は除く。
  - PUT の開始時に送る配列の参照を記録しておく。成功時、ストアの現在値がまだ同じ参照なら `dirty = false`。違っていれば dirty のまま再送する。
  - 409 なら `conflict = { kind: 'revision', remote }`。
- **resolveConflict:**
  - `use-remote`: ローカルを退避してから remote を適用し、`baseRevision = remote.revision` にする。
  - `use-local`: remote を退避してから、`remote.revision` を base にしてローカルを PUT する。
  - どちらも、終わったら `conflict = null`。
- **エラー時:**
  - `UnauthorizedError`: `loggedIn = false`, `status = 'needs-login'`。dirty とローカルデータは残す。
  - `OfflineError`: `status = 'offline'`。
- **clearCloudData:** DELETE の後、ローカルも空にし（`replaceFromSync([])`）、`baseRevision` を更新する。

- [ ] **Step 1: 失敗するテストを書く**（API はフェイク、debounce は `vi.useFakeTimers()`）
  - 編集すると 2000ms 後に PUT が 1 回だけ呼ばれる。1999ms では呼ばれない。
  - **Review Focus 1:** PUT の途中（Promise 未解決）にもう一度編集する → 解決後も dirty=true のまま。2000ms 後に 2 回目の PUT が呼ばれ、その body は最新の routines。
  - **Review Focus 2:** PUT が `UnauthorizedError` → status `needs-login`、dirty=true、routines は変わらない。
  - **Review Focus 3:** 起動時に getRoutines が `OfflineError` → 例外を投げず status `offline`。その後 `online` イベントを dispatch すると再試行され、dirty のデータが PUT される。
  - 409 → `conflict.kind === 'revision'`。`resolveConflict('use-remote')` で routines が remote になり、退避が 1 件増える。
  - `resolveConflict('use-local')` → PUT の base が `remote.revision`。
  - タイマー `running` 中に adopt → routines は変わらず、`pendingRemote` がセットされる。status を `idle` にすると適用される。
  - `replaceFromSync` による変更では PUT が発生しない。
  - 未ログインなら API が一切呼ばれない。
- [ ] **Step 2:** FAIL することを確認する。
- [ ] **Step 3:** 実装する。
- [ ] **Step 4:** `npm test` と `npm run build` が PASS することを確認する。
- [ ] **Step 5: コミットする** — `feat(sync): sync store, api client, and sync engine`

---

### Task 8: UI（アカウント・同期セクション、衝突ダイアログ、Danger Zone 分割）

**Files:**
- Create: `src/components/shared/AccountSection.tsx`, `src/components/shared/SyncConflictDialog.tsx`
- Modify: `src/components/shared/SettingsScreen.tsx`（Danger Zone の `localStorage.clear()` ブロックを置き換え、AccountSection を挿入する）, `src/i18n/translations.ts`, `src/App.tsx`（`SyncConflictDialog` を常駐させる）, `src/components/routine/RoutineScreen.tsx` / `RoutineEditor.tsx` / `src/components/timer/RoutineTimer.tsx`（存在しない routineId への対応）
- Test: `src/components/routine/missingRoutine.test.ts`（純粋関数 `resolveSelectedRoutine` を対象にする）

**Interfaces:**
- Consumes: Task 7 の `useSyncStore`, `syncNow`, `resolveConflict`, `clearLocalData`, `clearCloudData`、`api.*`
- Produces: `resolveSelectedRoutine(routines: Routine[], id: string | null): Routine | null`

**UI の仕様:**
- **AccountSection（設定画面。言語・テーマの次、Export/Import の前に置く）**
  - `loginAvailable === false` の場合: 「ログインは https://rt.kazusa.org でのみ利用できます」とだけ表示する。
  - 未ログインの場合:
    - 「パスキーでログイン」ボタン。
    - 「復旧コードでログイン」リンク。押すとテキスト入力を出す。
    - `hasUser === false` のときだけ「初期設定（合言葉）」の入力欄と「パスキーを登録」ボタンを出す。
  - 登録・復旧の成功時: 復旧コードを大きく表示する。「コピー」ボタンと「メモしました」ボタンを置き、「メモしました」を押すまで閉じられないようにする。
  - ログイン済みの場合:
    - 同期状態を表示する（`lastSyncedAt` の相対時刻、「未送信の変更あり」／「同期済み」／「オフライン」／「再ログインが必要」）。
    - 「今すぐ同期」ボタン。
    - パスキーの一覧（ラベル・作成日・削除ボタン）と「パスキーを追加」ボタン。
    - 「他の端末をすべてログアウト」と「ログアウト」。
- **SyncConflictDialog**
  - `initial` のとき: 「この端末: N 件／クラウド: M 件」を表示する。ボタンは「この端末のデータで上書き」と「クラウドのデータを使う」。
  - `revision` のとき: 「別の端末で変更されています」と表示する。ボタンは同じ 2 つ。
  - キャンセルは無い。どちらかを選ぶまで閉じない。
- **Danger Zone**
  - 「この端末のデータを消す」: ログイン中で dirty の場合は「未送信の変更が失われます」を確認文に追加する。実行時は退避してから `clearLocalData()`。
  - 「クラウドのデータも消す」: ログイン中のみ表示する。`confirm` を 2 回出し、2 回目は「本当に？」の文言にする。
  - 既存の `confirm()` の使い方は踏襲してよい。
- **存在しないルーティンの扱い**
  - エディタやタイマーが参照する routineId が `resolveSelectedRoutine` で null になったら、一覧または選択画面に戻す。
  - タイマーが動いているルーティンは Task 7 の保留によって消えないので、ここで対象になるのは idle / finished 時のみ。

- [ ] **Step 1:** **Review Focus 5** の失敗するテストを書く。`resolveSelectedRoutine([], 'x') === null`。存在する id ならその routine を返す。
- [ ] **Step 2:** 実装し、`npm test` が PASS することを確認する。
- [ ] **Step 3:** i18n キーを ja / en 両方に追加し、AccountSection・SyncConflictDialog・Danger Zone を実装する。
- [ ] **Step 4: ローカルで動作確認する**
  - `npm run build && npx wrangler pages dev dist` を実行する。localhost では RP ID が一致しないので、`.dev.vars` で `RP_ID=localhost`, `RP_ORIGIN=http://localhost:8788`, `SETUP_PASSPHRASE=dev` に上書きする。
  - Chrome で次の流れを確認する:
    - 登録
    - 復旧コードの表示
    - ログアウト → パスキーでログイン
    - 編集 → 2 秒後に「同期済み」
    - 別のプロファイルでログイン → 同じデータが表示される
    - 両方で編集 → 衝突ダイアログが出る
    - 「クラウドのデータも消す」
  - あわせて `npm run lint` と `npm run build` が通ることを確認する。
- [ ] **Step 5: コミットする** — `feat(ui): account & sync settings, conflict dialog, split danger zone`

---

### Task 9: デプロイ・検証環境・ドキュメント

**Files:**
- Modify: `.github/workflows/deploy.yml`, `README.md`, `CLAUDE.md`, `package.json`（version）

**deploy.yml の変更:**
- トリガーを `branches: [main, staging]` にする。
- deploy の前に D1 マイグレーションを流す:
  - main: `npx wrangler d1 migrations apply routine-app-db --remote`
  - staging: `npx wrangler d1 migrations apply routine-app-db-staging --remote --env preview`
- deploy コマンドに `--branch="${GITHUB_REF_NAME}"` を追加する。
- `npm test` を build の前に実行する。

**手動作業（オーナーまたは実装者。Cloudflare ダッシュボードか wrangler で行う）:**
- `npx wrangler d1 create routine-app-db` と `npx wrangler d1 create routine-app-db-staging` を実行し、出力された `database_id` を `wrangler.toml` に記入する。
- Pages の secret `SETUP_PASSPHRASE` を production と preview それぞれに設定する（別の値にする）。
- `CLOUDFLARE_API_TOKEN` に D1 編集権限があることを確認する。

**ドキュメント:**
- **README.md:** 「パスキーと復旧コードを両方失った場合」の手順を書く。`wrangler d1 execute routine-app-db --remote --command "DELETE FROM passkeys; DELETE FROM recovery_codes; DELETE FROM users; DELETE FROM sessions;"` を実行した後、合言葉で再登録する。`routine_snapshots` は user_id で紐づいているので、再登録後に新しい user_id に `UPDATE` する手順も 1 行で書く。
- **CLAUDE.md:** スタック、主要ファイル、セッション記録、チェックリストを更新する。バックログの「🔔 次の大型対応」は完了にする。
- **バージョン:** spec で「オーナーと相談」となっているので、着手時にオーナーに確認する。提案は `2.0.0`。

- [ ] **Step 1:** wrangler.toml の DB ID と secret を設定する（手動作業）。
- [ ] **Step 2:** deploy.yml を変更し、`staging` ブランチに push する。Actions が成功することを確認する。
- [ ] **Step 3: staging で実機確認する（spec 6 章の項目）**
  - iPhone ホーム画面 PWA でパスキー登録・ログインができる。
  - Mac の Safari / Chrome でログインできる。
  - Windows で QR を使ったログインができる。
  - オフラインで編集し、復帰後に送信される。
  - 衝突ダイアログが出る。
  - タイマー実行中に PC で編集 → タイマー停止後に反映される。
  - `routine-app-bpz.pages.dev` 系の URL ではログインが無効になる。
- [ ] **Step 4:** README / CLAUDE.md / version を更新してコミットする — `chore: deploy D1 migrations, staging env, docs (vX.Y.Z)`
- [ ] **Step 5:** main にマージする前にオーナーの確認を取る。マージ後、本番 `https://rt.kazusa.org` で初回登録を行い、復旧コードをメモしてもらう。
