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
| `src/store/routineStore.ts` | ルーティン CRUD（localStorage 永続） |
| `src/store/timerStore.ts` | タイマー状態機械（mode / status / remaining / total） |
| `src/hooks/useTimer.ts` | rAF ベースのティックループ、Page Visibility API 対応 |
| `src/hooks/useWakeLock.ts` | Wake Lock API ラッパー |
| `src/hooks/useAudioAlert.ts` | Web Audio API ビープ音 + SpeechSynthesis 読み上げ |

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
- タスク開始時（スタート・自動進行・◀▶ジャンプ）: 開始音 + 「タスク名をはじめます」
- タスク完了（自動進行）: 終了音

## ビルド

```bash
npm run dev    # 開発サーバー
npm run build  # 本番ビルド（dist/ に PWA ファイル生成）
```

PWA アイコン: `public/icons/icon-192.png`, `icon-512.png`

---

## セッション記録

### 2026-03-08 — UI簡略化・ルーティンナビゲーション・音声読み上げ

**やったこと:**

1. **タブ削減** (`TimerScreen.tsx`)
   - ポモドーロ・インターバルタブを削除、カウントダウンとルーティンのみに
   - 古いモード値のフォールバック `useEffect` を追加

2. **カウントダウンプリセット変更** (`CountdownTimer.tsx`)
   - 1/5/10/15/20/30分 → 3/5/10/15/25/50分

3. **ルーティンタスクナビゲーション** (`timerStore.ts`, `RoutineTimer.tsx`)
   - `jumpToTask(index, duration)` アクションを追加
   - ルーティン実行画面に◀▶ボタンを追加
   - 先頭・末尾でそれぞれ disabled

4. **ジャンプ時の音声対応** (`RoutineTimer.tsx`)
   - ◀▶でジャンプした際に `playStartAlert()` + `speak()` を発火

5. **カウントダウン音声読み上げ** (`useTimer.ts`)
   - 開始・残り1分・完了の読み上げを追加

**現在の状態:** すべて main にマージ済み、Cloudflare Pages にデプロイ済み。

---

## 今後やりたいこと（バックログ）

### 優先度高
- **ルーティンの改善全般** — タスク並び替え（ドラッグ）、タスクごとの細かい設定など
- **ルーティン Export / Import** — JSON でのバックアップ・共有機能
- **多言語対応（日本語 / 英語）** — i18n 対応

### 優先度中
- **認証** — ログイン機能（ルーティンのクラウド同期への布石）
- **Apple Watch 通知** — タスク完了・切り替え時に通知を飛ばしたい

### 難しいが検討中
- **バックグラウンド動作** — PWA はバックグラウンドでのタイマー継続が難しい（Service Worker + Background Sync の調査が必要）

---

## 未解決・要確認

- ルーティンの動作全般（特に多タスク時の挙動）を実機でテスト中
- バックグラウンド時のタイマー精度（Page Visibility API で一定対応済みだが完全ではない）
