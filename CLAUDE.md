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

## 主要ファイル

| ファイル | 役割 |
|---|---|
| `src/types/index.ts` | 共有型定義 |
| `src/store/routineStore.ts` | ルーティン CRUD（localStorage 永続）+ `importRoutines` |
| `src/store/timerStore.ts` | タイマー状態機械（mode / status / remaining / total）+ `jumpToTask` |
| `src/hooks/useTimer.ts` | rAF ベースのティックループ、Page Visibility API 対応 |
| `src/hooks/useWakeLock.ts` | Wake Lock API ラッパー |
| `src/hooks/useAudioAlert.ts` | Web Audio API ビープ音 + SpeechSynthesis 読み上げ |
| `src/utils/routineMarkdown.ts` | Markdown Export/Import 純粋関数 |

## 現在の画面構成

```
BottomNav: タイマー / ルーティン / 設定
  タイマー画面
    上部タブ: カウントダウン / ルーティン  ← 将来的に廃止予定（下部統合を検討）
  ルーティン画面（一覧 → 編集）
  設定画面（Export/Import/リセット）
```

> **次の構成変更案**: 上部タブ（カウントダウン/ルーティン）を廃止し、BottomNav に統合して3→4タブ or 別構成に変更することを検討中。

## タイマーモード（現在有効）

- **countdown** — シンプルなカウントダウン（プリセット: 3/5/10/15/25/50分）
- **routine** — ルーティンのタスクを順番にタイマーとして実行

> `pomodoro` / `interval` モードはコードに残っているが UI から削除済み。localStorage に古い値が残った場合は `countdown` に自動フォールバック。

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
- `vite.config.ts` で `__APP_VERSION__` としてビルド時に埋め込み、設定画面に表示
- 現在: **v0.4.2**

---

## セッション記録

### 2026-03-08 — セッション1: UI簡略化・ルーティンナビゲーション・音声読み上げ

1. ポモドーロ・インターバルタブを削除（カウントダウンとルーティンのみ）、古いモード値フォールバック追加
2. カウントダウンプリセット変更（1/5/10/15/20/30分 → 3/5/10/15/25/50分）
3. `jumpToTask(index, duration)` アクション追加、◀▶ボタンをルーティン実行画面に追加
4. カウントダウン音声読み上げ追加（開始・残り1分・完了）
5. ◀▶ジャンプ時の音声対応

### 2026-03-08 — セッション2: Export/Import・バージョン管理・各種バグ修正

1. **Markdown Export/Import 実装** (`src/utils/routineMarkdown.ts`)
   - エクスポート: `.md` ファイルダウンロード
   - インポート: 「既存に追加」「すべて置き換え」選択式
2. **バージョン管理導入** — `package.json` → `__APP_VERSION__` → 設定画面表示
3. **ルーティン削除ボタン** を RoutineEditor に追加（タスク削除はあったがルーティン自体の削除が未実装だった）
4. **バグ修正**:
   - RoutineEditor の「実行」ボタンでタイマータブに自動遷移するように
   - 実行ボタンで即スタート（スタートボタン不要に）
   - 停止中の◀▶ジャンプで音声が鳴っていた問題を修正（running 中のみ発火）

**現在の状態:** v0.4.2、main にマージ済み、Cloudflare Pages にデプロイ済み。

---

## 今後やりたいこと（バックログ）

### 優先度高
- **画面構成の変更** — 上部タブ（カウントダウン/ルーティン）を廃止し、BottomNav に統合。現状の「タイマー/ルーティン/設定」3タブ構成を見直す
- **ルーティンの改善全般** — タスク並び替え（ドラッグ）、タスクごとの細かい設定など
- **多言語対応（日本語 / 英語）** — i18n 対応

### 優先度低（シンプルな現状でテスト後に判断）
- **認証・デバイス間連携** — 面倒になる可能性があるため、現状のシンプルな localStorage 構成でしばらくテスト予定
- **Apple Watch 通知** — タスク完了・切り替え時に通知を飛ばしたい

### 難しいが検討中
- **バックグラウンド動作** — PWA はバックグラウンドでのタイマー継続が難しい（Service Worker + Background Sync の調査が必要）

---

## 未解決・要確認

- バックグラウンド時のタイマー精度（Page Visibility API で一定対応済みだが完全ではない）
- `types/index.ts` の `TimerMode` 型に `pomodoro` / `interval` が残存（デッドコード）
