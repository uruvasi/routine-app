# クラウド同期（パスキー認証 + Cloudflare）設計

日付: 2026-11-03
対象: routine-app（PWA, v1.1.0 時点）

## 1. 意図と背景

- 利用者は基本的にオーナー本人だけ。
- ルーティンの**実行**は iPhone（ホーム画面に追加した PWA）で行う。**編集**（朝のルーティンのタスク並び替え、時間調整など）は PC の大きな画面で行いたいことが多い。
- 現状は、iPhone 上で直接編集するか、Markdown の Export/Import でファイルを受け渡している。どちらも面倒。
- **成功の姿:** PC で編集したら、iPhone でアプリを開いたときにはもう反映されている。ファイルの手渡しは不要。
- 方針として PWA のまま実装する（2026-11-02 決定）。別リポジトリのネイティブ版（Swift / watchOS）は独立しているが、将来同じデータを使える形が望ましい。

## 2. ゴール / ノンゴール / アンチゴール

**ゴール**
- パスキーでログインする。同じアカウントなら iPhone・Mac・Windows で同じルーティン／タスクが見られ、編集できる。
- 未ログインでも、オフラインでも、今までどおりアプリが使える。
- 運用費 0 円（Cloudflare 無料枠内）。

**ノンゴール**
- リアルタイム同期（開いたとき・復帰したときに最新になれば十分）。
- 複数ユーザー対応、共有、サインアップ。
- 言語・テーマ・タイマー状態の同期（端末ごとのままでよい）。
- Google ログイン、メールのログイン用リンク／確認コード。
- ネイティブ版の実装（API は流用できる形にしておくだけ）。

**アンチゴール（技術的に動いても失敗とみなすもの）**
- **データが消える／黙って上書きされる。** 衝突・初回移行の両方で、ユーザーに見えないままどちらかのデータを捨ててはいけない。
- 同期のせいで、オフラインや未ログイン時にアプリが使えなくなる、またはタイマー実行が遅くなる。
- 他人がアカウントを作ったり、データを読めたりする。

## 3. 制約

- 既存スタック: Vite 7 + React 19 + TS、Zustand v5 `persist`（localStorage）、vite-plugin-pwa（Workbox、`registerType: 'autoUpdate'`）、Cloudflare Pages。
- デプロイは GitHub Actions の `npx wrangler pages deploy dist --project-name=routine-app`（`.github/workflows/deploy.yml`）。
- iOS ホーム画面 PWA は Safari 本体と Cookie・ストレージが分離されている。Apple はホーム画面 Web アプリのログインにパスキー／ワンタイムコードを推奨している（WWDC23）。
- データ構造（`src/types/index.ts`）: `Routine { id, name, tasks: Task[], createdAt }`、`Task { id, name, duration }`。順序は配列の位置で表す。更新日時はない。
- `src/store/routineStore.ts` は `routines: Routine[]` を丸ごと persist している（キー `routine-store`）。ID は `Math.random().toString(36)`。
- 初回起動時、ストアには既定のサンプル「朝ルーティン」が入る。

## 4. オーナーが決めたこと

- **バックエンド:** Cloudflare。既存の Pages プロジェクトに API（Pages Functions）と D1 を追加する。Supabase / Firebase は採用しない。
- **認証:** パスキー（WebAuthn）。Google ログインにはこだわらない。
  - iPhone・Mac は Face ID / Touch ID（iCloud キーチェーン同期）。Windows は iPhone で QR を読むクロスデバイス認証。
- **同期対象:** ルーティンとタスクのみ。
- **同期タイミング:** 起動時・画面復帰時にクラウドから取得。編集はまずローカルに保存し、少し遅らせてクラウドへ送る。
- **オフライン:** 今までどおり使え、編集も可能。つながったら送る。
- **未ログイン:** 今までどおり完全にローカルで動く。
- **衝突時:** 自動マージしない。「クラウドの方を使う／この端末の方で上書き」をユーザーが選ぶ。
- **初回ログイン:** クラウドが空なら、今の端末のデータをアップロードする。
- **設定画面のリセット:** 「この端末のデータだけ消す」「ログアウト」「クラウドのデータも消す」の3つに分ける。
- **復旧用コード:** パスキーを全て失ったとき用に、最初の登録時に一度だけ表示してメモしてもらう。
- **登録の制限:** オーナー本人の 1 アカウントだけ。他人は新規登録できない。

## 5. 設計（Claude の判断を含む。★ = Claude の判断）

### 5.1 全体構成
- `functions/api/*`（Cloudflare Pages Functions）+ D1 データベース 1 つ。フロントと同一オリジンなので CORS は不要。
- 認証状態は `HttpOnly; Secure; SameSite=Lax` の `__Host-` Cookie によるセッション（★）。PWA と Safari はストレージが別なので、各端末・各コンテキストで一度ずつログインする前提。
- 将来のネイティブ版は同じ REST API を使う（Bearer トークン方式の追加は将来対応。今回は作らない）。

### 5.2 登録の制限（★）
- 「アカウントがまだ 1 つもないときだけ登録できる」方式にする。最初の 1 人（オーナー）が登録したら、それ以降の新規登録 API は拒否する。
  - 公開直後に他人が先に登録してしまう事態を防ぐため、初回登録には環境変数（Pages の secret）の**セットアップ用合言葉**を要求する。
- **端末の追加:**
  - Mac は iCloud キーチェーン同期で同じパスキーが使える。
  - Windows ではクロスデバイス認証（iPhone で QR）を使う。
  - 別のパスキーを追加したい場合は、ログイン済みの状態で設定画面から「パスキーを追加」できるようにする。
- **復旧用コード:** 登録時に 1 つ生成して表示する。サーバーにはハッシュだけを保存する。コードを使うとログインでき、新しいパスキーを登録できる。使ったら新しいコードを再発行する。

### 5.3 データモデル（D1）（★）
- `users`（id, created_at）。行は実質 1 つ。
- `passkeys`（credential_id, user_id, public_key, counter, transports, created_at, label）。
- `sessions`（token_hash, user_id, expires_at）。有効期限は長め（例: 180 日）。アクセス時に延長する。
- `recovery_codes`（user_id, code_hash）。
- `routine_snapshots`（user_id PK, revision INTEGER, schema_version INTEGER, payload_json TEXT, updated_at）。
  - `payload_json` は `Routine[]` をそのまま入れる。並び順は配列の順序で表すので、既存の reorder 処理はそのまま使える。
  - 将来サイズが大きくなったら正規化を検討する（個人利用なら当面不要）。

### 5.4 API（★）
- `POST /api/auth/register/options`, `POST /api/auth/register/verify` — 初回登録とパスキー追加。
- `POST /api/auth/login/options`, `POST /api/auth/login/verify` — パスキーでログイン。
- `POST /api/auth/recover` — 復旧用コードでログイン。
- `GET /api/session`, `POST /api/logout`。
- `GET /api/routines` — `{ revision, routines, updatedAt }` を返す。
- `PUT /api/routines` — `{ baseRevision, routines }` を受け取る。`baseRevision` が現在値と一致したときだけ更新し、`revision + 1` にする。不一致なら `409` と最新版を返す。
- `DELETE /api/routines` — 「クラウドのデータも消す」用。

### 5.5 クライアント同期（★）
- `routine-store` はそのまま localStorage に保存し、UI とオフライン用のキャッシュとして使う。
- 同期用のメタデータは別の persist ストア（例: `sync-store`）に持つ。中身は `baseRevision`、`dirty`、`lastSyncedAt`、`loggedIn`、`localEdited`（後述）。
- **取得:** 起動時、`visibilitychange` で表示に戻ったとき、`online` イベントのときにクラウドから取得する。
  - `dirty=false` で、クラウドの revision が新しければ、ローカルをクラウド版で置き換える。
  - `dirty=true` なら、送信を先に試みる。
- **送信:** `routines` が変わったら `dirty=true` にし、約 2 秒の debounce で PUT する。成功したら `baseRevision` を更新して `dirty=false` にする。失敗（オフラインなど）したら `dirty` のまま、次のきっかけで再送する。
- **409（衝突）:** 選択ダイアログを出す。どちらを選んでも、捨てる側のデータは選ぶ前に localStorage の別キー（例: `routine-store-backup-<timestamp>`）に退避する。
- **タイマー実行中の扱い:** 実行中のルーティンがクラウド版の取り込みで置き換わると表示が崩れる。そのため、`running` / `paused` の間は取り込みを保留し、タイマーが止まってから適用する。
- Service Worker（Workbox）は `/api/*` をキャッシュしない（navigateFallback の除外も含む）。

### 5.6 初回ログイン時の移行（★）
- **クラウドが空:** ローカルの `routines` をアップロードする。
- **クラウドにデータがあり、ローカルが「まだ一度も編集されていない」場合**（初期のサンプルのまま、またはデータなし）: 何も聞かずにクラウド版を採用する。
  - 判定のため、`localEdited` フラグを導入する。いずれかの編集・インポートで `true` になる。
  - 既存ユーザーのアップデート時は、persist 済みデータが既定のサンプルと同じかどうかで初期値を決める。
- **両方にデータがある場合:** 件数を見せて「この端末のデータで上書き／クラウドのデータを使う」を選ばせる（捨てる側は退避する）。
- 新規 ID の生成を `crypto.randomUUID()` に変更する。既存の ID はそのまま維持する。

### 5.7 UI（★）
- **設定画面に「アカウント／同期」セクションを追加する。**
  - 未ログイン時は「パスキーでログイン」ボタン。初回登録はセットアップ用合言葉の入力欄付き。
  - ログイン時は同期状態（最終同期時刻、未送信あり／同期済み）、「今すぐ同期」「パスキーを追加」「ログアウト」。
- **Danger Zone を 3 つに分ける。**
  - 「この端末のデータを消す」: localStorage の該当キーだけを消す。ログアウトはしない。
  - 「ログアウト」
  - 「クラウドのデータも消す」: 二段階の確認をする。
  - 既存の `localStorage.clear()`（`src/components/shared/SettingsScreen.tsx` の Danger Zone）は置き換える。
- 文言はすべて `src/i18n/translations.ts` に ja / en で追加する。
- デザインは既存の Stitch ルールに従う（No-Line、rounded、pill ボタン）。

### 5.8 削除・紛失時の扱い（★）
- **「クラウドのデータも消す」:**
  - 消すのはルーティンのデータだけ。アカウント、パスキー、復旧用コードは残す。
  - 行は削除しない。`routines = []` にして `revision + 1` で上書きし、`cleared_at` を記録する。
  - これにより、他の端末は次の取得時に「空の新しい版」として受け取る。他の端末が持っていた古いデータでクラウドが復活することはない。
  - 他の端末で空の版に置き換えるときも、置き換え前のローカルデータは退避キーに保存する（5.5 と同じ規則）。
  - 実行した端末自身は、ローカルのルーティンも空にする。ログイン状態は維持する。
- **ログイン中の「この端末のデータを消す」:**
  - ローカルのルーティンと sync-store を消してから、クラウドを取り直す。実質「クラウド版に戻す」動作。
  - 未送信の変更（`dirty=true`）があれば、確認ダイアログで「未送信の変更が失われます」と警告する。消す前のデータは退避キーに保存する。
  - 未ログイン時は単純にローカルを消す（既存と同じ）。
- **紛失・漏えい対策（最小限）:**
  - 設定画面でパスキーの一覧を表示し、削除できるようにする。
  - 「他の端末をすべてログアウト」（自分以外の全セッションを失効）を用意する。
  - 復旧用コードを使ってログインした場合は、既存の全セッションを失効させる。パスキーは残し、一覧から手動で削除できるようにする。
  - パスキーと復旧用コードをすべて失った場合は、D1 を手作業で直す（オーナー本人のアプリなので許容）。手順は README に一行で書いておく。

### 5.9 環境と RP ID
- **本番（オーナー決定）:** 本番 URL は `https://rt.kazusa.org`。WebAuthn の RP ID は `rt.kazusa.org` に固定し、expected origin は `https://rt.kazusa.org` だけにする。
  - `routine-app-bpz.pages.dev` からはログインさせない（★）。同期 UI に「rt.kazusa.org で開いてください」と表示する。
  - 後で RP ID を変えると登録済みのパスキーが使えなくなるので、変更しない。
- **検証環境:**
  - 固定のブランチ別名（例: `staging` ブランチ → `staging.<project>.pages.dev`）と、別の D1 データベース、別のセットアップ用合言葉を用意する。
  - この環境のパスキーは本番とは別物として扱う。
  - GitHub Actions では、`staging` ブランチの push で `--branch=staging` としてデプロイし、検証用 D1 にマイグレーションを当てる。
- その他のプレビュー URL ではログインを無効にする。同期 UI は「この環境ではログインできません」と表示する。

## 6. ビルダーに任せること

- WebAuthn のライブラリ選定（例: `@simplewebauthn/server` + `@simplewebauthn/browser`。Workers ランタイムで動くことを確認する）。
- D1 マイグレーションと `wrangler.toml` の構成、ローカル開発の方法（`wrangler pages dev` と Vite の併用など）、GitHub Actions への D1 マイグレーションの組み込み。
- debounce 間隔、セッション期限、レート制限の具体値。
- 同期ストアの実装方法（Zustand の subscribe、専用フックなど）。
- テストの範囲と方法。同期ロジック（取得・送信・409・移行の判定）は純粋関数に切り出し、ユニットテストを推奨する。
- 実機検証の手順。最低限確認すること:
  - iPhone ホーム画面 PWA でのパスキー登録・ログイン
  - Mac Safari / Chrome でのログイン
  - Windows でのクロスデバイスログイン
  - オフライン編集→復帰後の送信
  - 衝突ダイアログ

## 7. 変更が見込まれる主なファイル

- 新規: `functions/api/**`, `wrangler.toml`, `migrations/*.sql`, `src/store/syncStore.ts`, `src/sync/*`（同期ロジック・API クライアント）
- 変更: `src/store/routineStore.ts`（ID 生成、`localEdited`）, `src/components/shared/SettingsScreen.tsx`, `src/i18n/translations.ts`, `vite.config.ts`（Workbox の `/api` 除外）, `.github/workflows/deploy.yml`（必要なら）, `package.json`（バージョン 1.2.0 → 2.0.0 などはオーナーと相談）
