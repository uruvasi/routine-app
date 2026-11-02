export type Lang = 'ja' | 'en'

export type Translation = {
  // controls
  start: string
  pause: string
  resume: string
  reset: string
  done: string
  save: string
  cancel: string
  edit: string
  add: string
  // units
  minUnit: string
  secUnit: string
  // countdown
  enterMinutes: string
  set: string
  // routine timer
  selectRoutine: string
  noRoutinesYet: string
  editRoutines: string
  changeRoutine: string
  completeRoutine: string
  // routine list
  routinesTitle: string
  newRoutine: string
  routineNamePlaceholder: string
  create: string
  noTasks: string
  noRoutinesList: string
  // routine editor
  back: string
  run: string
  deleteThisRoutine: string
  addTasksPrompt: string
  newTaskNamePlaceholder: string
  taskNamePlaceholder: string
  // settings
  settingsTitle: string
  versionLabel: string
  dataStorageLabel: string
  dataStorageValue: string
  exportRoutines: string
  importRoutines: string
  importAdd: string
  importReplace: string
  language: string
  themeLabel: string
  themeLight: string
  themeDark: string
  // dynamic
  taskCountLabel: (n: number, totalStr: string) => string
  totalTimeStr: (m: number, s: number) => string
  importAddedMsg: (n: number) => string
  importReplacedMsg: (n: number) => string
  importEmptyMsg: string
  deleteRoutineConfirm: (name: string) => string
  // account & sync
  accountTitle: string
  loginOnlyOn: string
  loginWithPasskey: string
  loginWithRecovery: string
  recoveryCodePlaceholder: string
  submit: string
  setupTitle: string
  setupPassphrasePlaceholder: string
  registerPasskey: string
  recoveryCodeTitle: string
  recoveryCodeNote: string
  copy: string
  copied: string
  iWroteItDown: string
  syncNow: string
  syncStatusSynced: string
  syncStatusDirty: string
  syncStatusOffline: string
  syncStatusNeedsLogin: string
  syncStatusSyncing: string
  syncStatusError: string
  lastSynced: (when: string) => string
  justNow: string
  passkeysTitle: string
  addPasskey: string
  deletePasskeyConfirm: (label: string) => string
  logout: string
  revokeOthers: string
  revokeOthersConfirm: string
  done2: string
  authErrorGeneric: string
  authErrorBadPassphrase: string
  authErrorRateLimited: string
  dataStorageCloud: string
  conflictTitleInitial: string
  conflictTitleRevision: string
  conflictCounts: (local: number, remote: number) => string
  conflictBody: string
  useLocal: string
  useRemote: string
  clearLocalData: string
  clearLocalConfirm: string
  clearLocalDirtyWarn: string
  clearCloudData: string
  clearCloudConfirm1: string
  clearCloudConfirm2: string
  restoreBackup: string
  noBackups: string
  backupItem: (date: string, count: number) => string
  restoreConfirm: string
  restoreDone: string
  // speech
  speechLang: string
  speakTimerStart: (min: number) => string
  speakOneMinLeft: string
  speakDone: string
  speakTaskStart: (name: string) => string
}

export const translations: Record<Lang, Translation> = {
  ja: {
    start: 'スタート',
    pause: '一時停止',
    resume: '再開',
    reset: 'リセット',
    done: '完了!',
    save: '保存',
    cancel: 'キャンセル',
    edit: '編集',
    add: '追加',
    minUnit: '分',
    secUnit: '秒',
    enterMinutes: '分数を入力',
    set: 'セット',
    selectRoutine: 'ルーティンを選択してください',
    noRoutinesYet: 'ルーティンがまだありません',
    editRoutines: 'ルーティンを編集',
    changeRoutine: 'ルーティン変更',
    completeRoutine: 'ルーティン完了',
    routinesTitle: 'ルーティン',
    newRoutine: '+ 新規',
    routineNamePlaceholder: 'ルーティン名',
    create: '作成',
    noTasks: 'タスクなし',
    noRoutinesList: 'ルーティンがありません',
    back: '← 戻る',
    run: '実行',
    deleteThisRoutine: 'このルーティンを削除',
    addTasksPrompt: 'タスクを追加してください',
    newTaskNamePlaceholder: '新しいタスク名',
    taskNamePlaceholder: 'タスク名',
    settingsTitle: '設定',
    versionLabel: 'バージョン',
    dataStorageLabel: 'データ保存先',
    dataStorageValue: 'ローカル',
    exportRoutines: 'ルーティンをエクスポート',
    importRoutines: 'ルーティンをインポート',
    importAdd: '既存に追加',
    importReplace: 'すべて置き換え',
    language: '言語',
    themeLabel: 'テーマ',
    themeLight: 'ライト',
    themeDark: 'ダーク',
    taskCountLabel: (n, total) => `${n}タスク · ${total}`,
    totalTimeStr: (m, s) => {
      const total = m * 60 + s
      const h = Math.floor(total / 3600)
      const mm = Math.floor((total % 3600) / 60)
      const ss = total % 60
      if (h > 0) return `${h}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    },
    importAddedMsg: (n) => `${n}件のルーティンを追加しました`,
    importReplacedMsg: (n) => `${n}件のルーティンで置き換えました`,
    importEmptyMsg: '読み込めるルーティンがありませんでした',
    deleteRoutineConfirm: (name) => `「${name}」を削除しますか？`,
    accountTitle: 'アカウント・同期',
    loginOnlyOn: 'ログインは https://rt.kazusa.org でのみ利用できます',
    loginWithPasskey: 'パスキーでログイン',
    loginWithRecovery: '復旧コードでログイン',
    recoveryCodePlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    submit: '送信',
    setupTitle: '初期設定',
    setupPassphrasePlaceholder: 'セットアップ用の合言葉',
    registerPasskey: 'パスキーを登録',
    recoveryCodeTitle: '復旧コード',
    recoveryCodeNote: 'パスキーをすべて失ったときに使います。この画面でしか表示されないので、必ずメモしてください。',
    copy: 'コピー',
    copied: 'コピーしました',
    iWroteItDown: 'メモしました',
    syncNow: '今すぐ同期',
    syncStatusSynced: '同期済み',
    syncStatusDirty: '未送信の変更あり',
    syncStatusOffline: 'オフライン',
    syncStatusNeedsLogin: '再ログインが必要です',
    syncStatusSyncing: '同期中…',
    syncStatusError: '同期エラー',
    lastSynced: (when) => `最終同期: ${when}`,
    justNow: 'たった今',
    passkeysTitle: 'パスキー',
    addPasskey: 'パスキーを追加',
    deletePasskeyConfirm: (label) => `パスキー「${label}」を削除しますか？`,
    logout: 'ログアウト',
    revokeOthers: '他の端末をすべてログアウト',
    revokeOthersConfirm: 'この端末以外をすべてログアウトしますか？',
    done2: '完了しました',
    authErrorGeneric: 'ログインできませんでした',
    authErrorBadPassphrase: '合言葉が違います',
    authErrorRateLimited: '試行回数が多すぎます。しばらく待ってください',
    dataStorageCloud: 'クラウド同期',
    conflictTitleInitial: 'どちらのデータを使いますか？',
    conflictTitleRevision: '別の端末で変更されています',
    conflictCounts: (local, remote) => `この端末: ${local} 件 / クラウド: ${remote} 件`,
    conflictBody: '選ばなかった方のデータはこの端末にバックアップとして保存されます。',
    useLocal: 'この端末のデータで上書き',
    useRemote: 'クラウドのデータを使う',
    clearLocalData: 'この端末のデータを消す',
    clearLocalConfirm: 'この端末のルーティンを消しますか？（ログイン中はクラウドから取り直します）',
    clearLocalDirtyWarn: '未送信の変更が失われます。',
    clearCloudData: 'クラウドのデータも消す',
    clearCloudConfirm1: 'クラウド上のルーティンを消します。すべての端末から消えます。よろしいですか？',
    clearCloudConfirm2: '本当に消しますか？この操作は元に戻せません。',
    restoreBackup: 'バックアップから復元',
    noBackups: 'バックアップはありません',
    backupItem: (date, count) => `${date}（${count} 件）`,
    restoreConfirm: 'このバックアップで今のルーティンを置き換えますか？（今のデータもバックアップされます）',
    restoreDone: '復元しました',
    speechLang: 'ja-JP',
    speakTimerStart: (min) => `${min}分のタイマーを始めます`,
    speakOneMinLeft: '残り1分です',
    speakDone: '完了しました',
    speakTaskStart: (name) => `${name}をはじめます`,
  },

  en: {
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset',
    done: 'Done!',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    add: 'Add',
    minUnit: 'min',
    secUnit: 'sec',
    enterMinutes: 'Enter minutes',
    set: 'Set',
    selectRoutine: 'Select a routine',
    noRoutinesYet: 'No routines yet',
    editRoutines: 'Edit routines',
    changeRoutine: 'Change routine',
    completeRoutine: 'Complete routine',
    routinesTitle: 'Routines',
    newRoutine: '+ New',
    routineNamePlaceholder: 'Routine name',
    create: 'Create',
    noTasks: 'No tasks',
    noRoutinesList: 'No routines',
    back: '← Back',
    run: 'Run',
    deleteThisRoutine: 'Delete this routine',
    addTasksPrompt: 'Add tasks to get started',
    newTaskNamePlaceholder: 'New task name',
    taskNamePlaceholder: 'Task name',
    settingsTitle: 'Settings',
    versionLabel: 'Version',
    dataStorageLabel: 'Data storage',
    dataStorageValue: 'Local',
    exportRoutines: 'Export routines',
    importRoutines: 'Import routines',
    importAdd: 'Add to existing',
    importReplace: 'Replace all',
    language: 'Language',
    themeLabel: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    taskCountLabel: (n, total) => `${n} task${n !== 1 ? 's' : ''} · ${total}`,
    totalTimeStr: (m, s) => {
      const total = m * 60 + s
      const h = Math.floor(total / 3600)
      const mm = Math.floor((total % 3600) / 60)
      const ss = total % 60
      if (h > 0) return `${h}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    },
    importAddedMsg: (n) => `Added ${n} routine${n !== 1 ? 's' : ''}`,
    importReplacedMsg: (n) => `Replaced with ${n} routine${n !== 1 ? 's' : ''}`,
    importEmptyMsg: 'No routines found in file',
    deleteRoutineConfirm: (name) => `Delete "${name}"?`,
    accountTitle: 'Account & Sync',
    loginOnlyOn: 'Sign-in is only available at https://rt.kazusa.org',
    loginWithPasskey: 'Sign in with passkey',
    loginWithRecovery: 'Sign in with recovery code',
    recoveryCodePlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    submit: 'Submit',
    setupTitle: 'Initial setup',
    setupPassphrasePlaceholder: 'Setup passphrase',
    registerPasskey: 'Register passkey',
    recoveryCodeTitle: 'Recovery code',
    recoveryCodeNote: 'Use this if you lose all your passkeys. It is shown only once, so write it down.',
    copy: 'Copy',
    copied: 'Copied',
    iWroteItDown: 'I wrote it down',
    syncNow: 'Sync now',
    syncStatusSynced: 'Synced',
    syncStatusDirty: 'Unsent changes',
    syncStatusOffline: 'Offline',
    syncStatusNeedsLogin: 'Please sign in again',
    syncStatusSyncing: 'Syncing…',
    syncStatusError: 'Sync error',
    lastSynced: (when) => `Last synced: ${when}`,
    justNow: 'just now',
    passkeysTitle: 'Passkeys',
    addPasskey: 'Add passkey',
    deletePasskeyConfirm: (label) => `Delete passkey "${label}"?`,
    logout: 'Sign out',
    revokeOthers: 'Sign out all other devices',
    revokeOthersConfirm: 'Sign out every device except this one?',
    done2: 'Done',
    authErrorGeneric: 'Could not sign in',
    authErrorBadPassphrase: 'Wrong passphrase',
    authErrorRateLimited: 'Too many attempts. Please wait.',
    dataStorageCloud: 'Cloud sync',
    conflictTitleInitial: 'Which data do you want to keep?',
    conflictTitleRevision: 'Changed on another device',
    conflictCounts: (local, remote) => `This device: ${local} / Cloud: ${remote}`,
    conflictBody: 'The data you do not choose is kept as a backup on this device.',
    useLocal: "Overwrite with this device's data",
    useRemote: 'Use cloud data',
    clearLocalData: 'Clear data on this device',
    clearLocalConfirm: "Clear this device's routines? (When signed in, they are re-downloaded from the cloud.)",
    clearLocalDirtyWarn: 'Unsent changes will be lost.',
    clearCloudData: 'Also delete cloud data',
    clearCloudConfirm1: 'Delete routines in the cloud? They will disappear from all devices.',
    clearCloudConfirm2: 'Really delete? This cannot be undone.',
    restoreBackup: 'Restore from backup',
    noBackups: 'No backups',
    backupItem: (date, count) => `${date} (${count})`,
    restoreConfirm: 'Replace current routines with this backup? (Current data is backed up too.)',
    restoreDone: 'Restored',
    speechLang: 'en-US',
    speakTimerStart: (min) => `Starting ${min} minute timer`,
    speakOneMinLeft: 'One minute remaining',
    speakDone: 'Complete',
    speakTaskStart: (name) => `Starting ${name}`,
  },
}
