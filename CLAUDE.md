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

## 主要ファイル

| ファイル | 役割 |
|---|---|
| `src/types/index.ts` | 共有型定義（TimerMode: countdown/routine のみ） |
| `src/store/routineStore.ts` | ルーティン CRUD + reorderTasks / reorderRoutines / importRoutines |
| `src/store/timerStore.ts` | タイマー状態機械（mode / status / remaining / total / jumpToTask） |
| `src/hooks/useTimer.ts` | rAF ベースのティックループ、Page Visibility API 対応 |
| `src/hooks/useWakeLock.ts` | Wake Lock API ラッパー |
| `src/hooks/useAudioAlert.ts` | Web Audio API ビープ音 + SpeechSynthesis 読み上げ |
| `src/utils/routineMarkdown.ts` | Markdown Export/Import 純粋関数 |

## 画面構成

```
AppHeader（全画面共通: アプリ名 + バージョン）
BottomNav: タイマー / ルーティン / 設定
  タイマー（CountdownTimer）
  ルーティン（RoutineScreen）
    RoutineTimer — 実行画面（ルーティン選択 or タイマー動作）
    RoutineList  — 一覧・編集（≡ドラッグで並び替え）
      RoutineEditor — タスク編集（≡ドラッグで並び替え）
  設定（SettingsScreen: Export/Import/リセット）
```

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
- 現在: **v0.7.0**

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
   - 上部タブ（TimerScreen）を完全廃止
   - `RoutineScreen` を新設（RoutineTimer + RoutineList/Editor を統合管理）
   - RoutineTimer に `onEdit` prop 追加、実行・選択画面から編集へ遷移可能に

2. **デッドコード完全削除** (v0.5.0)
   - `PomodoroTimer.tsx` / `IntervalTimer.tsx` / `TimerScreen.tsx` を削除
   - `types/index.ts` から pomodoro / interval 関連の型をすべて削除
   - `timerStore` から pomodoro / interval の state・action をすべて削除
   - `useTimer.ts` の handlePhaseEnd から pomodoro / interval 分岐を削除

3. **共通ヘッダー追加** (v0.6.0)
   - `App.tsx` に全画面共通ヘッダー（アプリ名 + バージョン）を追加

4. **ドラッグ並び替え実装** (v0.6.0〜v0.6.2)
   - `@dnd-kit/core` + `@dnd-kit/sortable` を導入
   - RoutineEditor: タスクを `≡` ハンドル長押しドラッグで並び替え
   - RoutineList: ルーティンを `≡` ハンドル長押しドラッグで並び替え
   - `reorderRoutines` アクションを routineStore に追加

**現在の状態:** v0.6.2、main にマージ済み、Cloudflare Pages にデプロイ済み。

---

### 2026-03-09 — セッション4: 多言語対応（i18n）

1. **翻訳システム実装** (v0.7.0)
   - `src/i18n/translations.ts` — 全文字列の `ja` / `en` 翻訳定義（`Translation` 型 + `translations` レコード）
   - `src/store/settingsStore.ts` — 言語設定を localStorage に永続化（`settings-store` キー）
   - `src/hooks/useTranslation.ts` — `useTranslation()` フック（`{ t, lang }` を返す）

2. **全コンポーネントの i18n 適用**
   - `CountdownTimer` / `RoutineTimer` / `RoutineList` / `RoutineEditor` / `TaskItem` / `SettingsScreen` の全ハードコード文字列を `t.*` に置換
   - `formatDuration` 関数の単位（分/秒 → `t.minUnit`/`t.secUnit`）も言語対応
   - ルーティン一覧の「合計時間」表示も `t.totalTimeStr` / `t.taskCountLabel` に統合

3. **音声読み上げの言語追従**
   - `useAudioAlert.ts` の `speak()` が呼び出し時点の言語設定を参照
   - `useTimer.ts` の全 speak 呼び出しを `getT().speakXxx(...)` に変更

4. **設定画面に言語切替 UI 追加**
   - 「日本語 / English」トグルボタン、選択中はインディゴ色でハイライト

**現在の状態:** v0.7.0、main にマージ済み、Cloudflare Pages にデプロイ済み。

---

## 今後やりたいこと（バックログ）

### 優先度低（しばらくテストしながら判断）
- **認証・デバイス間連携** — localStorage 構成でしばらく運用。必要になったら検討

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

## 未解決・要確認

- バックグラウンド時のタイマー精度（Page Visibility API で一定対応済みだが完全ではない）
- ネイティブ化するなら Swift か React Native か（スキルセット・保守性の観点で要検討）
