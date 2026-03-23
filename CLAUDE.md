# Routine App — CLAUDE.md

## プロジェクト概要

iPhoneをメインターゲットにした PWA（Progressive Web App）。
ルーティン管理とタイマーを組み合わせて、日常の習慣を時間管理しながら実行できるアプリ。

## スタック

- **Vite 7 + React 19 + TypeScript**
- **Tailwind CSS v4** — `@tailwindcss/vite` プラグイン使用。`tailwind.config.ts` は不要、CSS で `@import "tailwindcss"` のみ
- **Zustand v5** — `persist` ミドルウェアで localStorage に永続化
- **vite-plugin-pwa v1** — Service Worker 自動生成
- **Cloudflare Pages** — GitHub Actions 経由で `main` push 時に自動デプロイ
- **@dnd-kit/core + @dnd-kit/sortable** — タッチ対応ドラッグ並び替え
- **Google Fonts** — Plus Jakarta Sans（見出し・タイマー数字）+ Inter（本文）

## 主要ファイル

| ファイル | 役割 |
|---|---|
| `src/types/index.ts` | 共有型定義（TimerMode: countdown/routine のみ） |
| `src/store/routineStore.ts` | ルーティン CRUD + reorderTasks / reorderRoutines / importRoutines |
| `src/store/timerStore.ts` | タイマー状態機械（mode / status / remaining / total / jumpToTask） |
| `src/store/settingsStore.ts` | 言語設定（lang: 'ja' \| 'en'）を localStorage に永続化 |
| `src/hooks/useTimer.ts` | rAF ベースのティックループ、Page Visibility API 対応 |
| `src/hooks/useWakeLock.ts` | Wake Lock API ラッパー |
| `src/hooks/useAudioAlert.ts` | Web Audio API ビープ音 + SpeechSynthesis 読み上げ |
| `src/hooks/useTranslation.ts` | `useTranslation()` フック（`{ t, lang }` を返す） |
| `src/i18n/translations.ts` | ja / en 翻訳定義（`Translation` 型 + `translations` レコード） |
| `src/utils/routineMarkdown.ts` | Markdown Export/Import 純粋関数 |

## 画面構成

```
AppHeader（全画面共通: プログレスバー + アプリ名 + バージョン）
BottomNav: タイマー / ルーティン / 設定（SVGアイコン + ピル型アクティブ）
  タイマー（CountdownTimer）
    CircularTimer — リング + ヒーロータイマー数字
    プリセットカード + 手動入力カード（idle/finished 時のみ表示）
  ルーティン（RoutineScreen）
    RoutineTimer — 実行画面（ルーティン選択 or タイマー動作）
    RoutineList  — 一覧（≡ドラッグで並び替え、ダッシュボーダー新規作成）
      RoutineEditor — タスク編集（≡ドラッグで並び替え）
  設定（SettingsScreen: 言語 / Export/Import / リセット）
```

## デザインシステム（Stitch "Rhythmic Curator"）

### カラートークン（`src/index.css` の `@theme` で定義）

| トークン | 値 | 用途 |
|---|---|---|
| `--color-primary` | `#4441cc` | ブランドカラー |
| `--color-primary-container` | `#5e5ce6` | ボタン・プログレスバー |
| `--color-primary-fixed` | `#e2dfff` | アクティブタスク背景 |
| `--color-surface` | `#f9f9fe` | アプリ背景 |
| `--color-surface-container-low` | `#f3f3f8` | カード背景 |
| `--color-surface-container-highest` | `#e2e2e7` | 強調要素・プリセット選択 |
| `--color-on-surface` | `#1a1c1f` | 本文テキスト |
| `--color-outline` | `#777586` | サブテキスト・ラベル |

### デザインルール

- **No-Line ルール**: 1px ボーダーは禁止。背景色のトーナルシフトで境界を表現
- **角丸**: 最小 `rounded-xl`、カード `rounded-2xl`、ボタン `rounded-full`
- **フォント**: 見出し・数字 `font-headline`（Plus Jakarta Sans）、本文 Inter
- **プライマリボタン**: `bg-gradient-to-b from-primary-container to-primary` + `rounded-full` + primary shadow

## タイマーモード

- **countdown** — シンプルなカウントダウン（プリセット: 3/5/10/15/25/50分）
- **routine** — ルーティンのタスクを順番にタイマーとして実行
- pomodoro / interval はコード・型ともに完全削除済み
- localStorage に古いモード値が残った場合は `onRehydrateStorage` で countdown にフォールバック

## 音声・アラート仕様

### カウントダウン
- 開始時: 開始音 + 「X分のタイマーを始めます」
- 残り1分: 「残り1分です」（二重発火防止 ref あり）
- 完了時: 終了音 + 「完了しました」

### ルーティン
- タスク開始時（スタート・自動進行）: 開始音 + 「タスク名をはじめます」
- ◀▶ジャンプ時: running 中のみ開始音 + 読み上げ（停止中はサイレント）
- タスク完了（自動進行）: 終了音

## Export/Import 仕様（Markdown形式）

```markdown
# ルーティン名
- タスク名: X分
- タスク名: X分Y秒
```

- エクスポート: `routines-YYYY-MM-DD.md` としてダウンロード
- インポート: 「既存に追加」か「すべて置き換え」を選択してからファイル選択

## ビルド・バージョン

```bash
npm run dev    # 開発サーバー
npm run build  # 本番ビルド（dist/ に PWA ファイル生成）
```

- バージョンは `package.json` の `version` を管理。デプロイごとに手動で上げる
- `vite.config.ts` で `__APP_VERSION__` としてビルド時に埋め込み、AppHeader に表示
- 現在: **v0.8.0**

---

## セッション記録

### 2026-03-08 — セッション1: UI簡略化・ルーティンナビゲーション・音声読み上げ

1. ポモドーロ・インターバルタブを削除（カウントダウンとルーティンのみ）、古いモード値フォールバック追加
2. カウントダウンプリセット変更（1/5/10/15/20/30分 → 3/5/10/15/25/50分）
3. `jumpToTask(index, duration)` アクション追加、◀▶ボタンをルーティン実行画面に追加
4. カウントダウン音声読み上げ追加（開始・残り1分・完了）
5. ◀▶ジャンプ時の音声対応（running 中のみ）

### 2026-03-08 — セッション2: Export/Import・バージョン管理・各種バグ修正

1. **Markdown Export/Import 実装** (`src/utils/routineMarkdown.ts`)
2. **バージョン管理導入** — `package.json` → `__APP_VERSION__` → 設定画面表示
3. **ルーティン削除ボタン** を RoutineEditor に追加
4. **バグ修正**: 実行ボタンでタイマータブ自動遷移・即スタート、停止中音声誤発火修正

### 2026-03-09 — セッション3: 画面構成刷新・デッドコード削除・ドラッグ並び替え

1. **画面構成刷新** (v0.5.0)
   - BottomNav をカウントダウン / ルーティン / 設定の3タブに統合
   - `RoutineScreen` を新設（RoutineTimer + RoutineList/Editor を統合管理）

2. **デッドコード完全削除** (v0.5.0)
   - `PomodoroTimer.tsx` / `IntervalTimer.tsx` / `TimerScreen.tsx` を削除

3. **共通ヘッダー追加** (v0.6.0)

4. **ドラッグ並び替え実装** (v0.6.0〜v0.6.2)
   - `@dnd-kit/core` + `@dnd-kit/sortable` を導入
   - RoutineEditor: タスクを `≡` ハンドル長押しドラッグで並び替え
   - RoutineList: ルーティンを `≡` ハンドル長押しドラッグで並び替え

### 2026-03-09 — セッション4: 多言語対応（i18n）

1. **翻訳システム実装** (v0.7.0)
   - `src/i18n/translations.ts` — 全文字列の `ja` / `en` 翻訳定義
   - `src/store/settingsStore.ts` — 言語設定を localStorage に永続化
   - `src/hooks/useTranslation.ts` — `useTranslation()` フック

2. **全コンポーネントの i18n 適用**
3. **音声読み上げの言語追従**
4. **設定画面に言語切替 UI 追加**

### 2026-03-23 — セッション5: Stitch デザインシステム適用

1. **デザインシステム刷新** (v0.8.0) — Stitch "Rhythmic Curator" デザインを適用
   - `src/index.css` の `@theme` に Material 風カラートークンを定義
   - `index.html` に Google Fonts（Plus Jakarta Sans + Inter）追加

2. **全コンポーネントのビジュアル刷新**
   - `App.tsx`: タイマー進捗を反映するトップ進捗バー（primary glow付き）、グラスモーフィズムヘッダー
   - `BottomNav`: ピル型アクティブインジケーター、SVGアイコン、rounded-top + backdrop-blur
   - `Button`: グラデーション primary ボタン（`rounded-full`）、セカンダリはトーナル背景
   - `CircularTimer`: 細いリング（3px）、Plus Jakarta Sans ヒーロー数字、`.00` 装飾
   - `CountdownTimer`: プリセットカード + 手動入力カード（MM:SS入力）
   - `RoutineTimer`: ルーティン選択をカードリスト表示、タスクリストを `primary-fixed` ハイライト
   - `RoutineList`: "YOUR LIBRARY" セクションヘッダー、ダッシュボーダー新規作成ボタン
   - `RoutineEditor`: ステップカード（`surface-container-lowest`）、アクティブ編集時 `primary-fixed` 背景
   - `TaskItem`: 削除ボタンをごみ箱SVGアイコンに変更
   - `SettingsScreen`: セクション分け（General / Data / Danger Zone）、言語トグルがピル型セグメント

**現在の状態:** v0.8.0、main にマージ済み、Cloudflare Pages にデプロイ済み。

---

## 実装済み機能チェックリスト

### コア機能
- [x] カウントダウンタイマー（プリセット6種 + MM:SS手動入力）
- [x] ルーティンタイマー（タスクを順番に自動進行）
- [x] ◀▶ タスクジャンプ（running中のみ音声あり）
- [x] Wake Lock（画面スリープ防止、タイマー実行中）
- [x] Page Visibility API（バックグラウンドから戻ったとき残り時間を再計算）
- [x] タイマー進捗バー（画面上部）

### ルーティン管理
- [x] ルーティン CRUD（作成・名前変更・削除）
- [x] タスク CRUD（作成・編集・削除）
- [x] ルーティン一覧のドラッグ並び替え
- [x] タスクのドラッグ並び替え
- [x] Markdown Export（`routines-YYYY-MM-DD.md`）
- [x] Markdown Import（既存に追加 / すべて置き換え）

### UI / UX
- [x] 日本語 / 英語 切り替え（i18n）
- [x] 音声読み上げ（カウントダウン: 開始・残り1分・完了 / ルーティン: タスク開始・終了）
- [x] Stitch デザインシステム（カラートークン・Plus Jakarta Sans・ノーボーダー）
- [x] PWA（ホーム画面追加、Service Worker、オフライン対応）

### インフラ
- [x] Cloudflare Pages 自動デプロイ（GitHub Actions, main push）
- [x] バージョン管理（`package.json` → `__APP_VERSION__`）

---

## 未実装・既知の問題

### 機能不足
- [ ] **BottomNav ラベルが常に英語** — `labelJa` を定義したが `useTranslation` を呼んでいないため、言語切替に未対応
- [ ] **バックグラウンドでのタイマー継続** — iOS PWA の制約でバックグラウンド停止。Page Visibility API で復帰時に補正はしているが完全ではない
- [ ] **バックグラウンド完了通知** — バックグラウンド中はアラート音・読み上げが鳴らない
- [ ] **認証・デバイス間データ同期** — localStorage のみ。端末をまたいだ同期なし

---

## アーキテクチャ上の重要課題

### バックグラウンド動作 + Apple Watch 通知

**目標:** 画面オフ中もタイマーを継続し、タスク完了時に iPhone & Watch へ通知する

#### iOS PWA の制約（確認済み）

| 技術 | iOS PWA |
|---|---|
| `setInterval` / `rAF` | バックグラウンドで停止 |
| Web Workers | 同様に停止 |
| Service Worker | キャッシュは動くがタイマーループは不可 |
| Background Sync API | iOS **未サポート** |
| Push Notifications | iOS 16.4以降・ホーム画面追加PWAのみ。**サーバー必須** |
| AudioContext | フォアグラウンドのみ動作 |

**現在の対応:** 開始時刻ベースで戻ったとき残り時間を再計算（Page Visibility API）。
完了通知・完了音はバックグラウンドでは鳴らない。

#### 選択肢

**第1案: ネイティブアプリ化（本命）**
- Swift (SwiftUI) または React Native で実装
- バックグラウンドタイマー（`BGTaskScheduler` / `UserNotifications`）が使える
- watchOS コンパニオンアプリで Watch 通知・表示も実現可能
- App Store 審査が必要
- **Watch 連携まで視野に入れるなら、最終的にはここに行き着く**

**第2案: サーバー側タイマー + Push 通知（次点）**
- タイマー開始をサーバーに登録 → 時間になったらサーバーが Web Push 送信
- iOS 16.4以降のPWA（ホーム画面追加）はPush Notifications対応
- Watch への通知はiPhone経由のミラーリング通知として届く可能性あり
- サーバー構築・運用コストが発生
- Watch 専用 UI は作れない（通知のみ）
- **PWA のまま最小コストで通知だけ実現したい場合の選択肢**

#### 判断メモ
- Watch 連携まで本気でやるならネイティブ化一択
- ただし実装コストが大きく跳ね上がる（Swift 学習 or RN 移行）
- まずは現行 PWA でユーザビリティを磨き、必要性が確定したらネイティブ化を検討

---

## バックログ

### 優先度中
- **BottomNav i18n 対応** — `useTranslation` を使ってラベルを言語に合わせる
- **ダークモード** — デザインシステムのダークトークンを定義して対応

### 優先度低（しばらくテストしながら判断）
- **認証・デバイス間連携** — localStorage 構成でしばらく運用。必要になったら検討
- **バックグラウンド通知** — サーバー Push か ネイティブ化で対応
