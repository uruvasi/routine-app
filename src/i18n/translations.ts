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
  resetData: string
  language: string
  // dynamic
  taskCountLabel: (n: number, totalStr: string) => string
  totalTimeStr: (m: number, s: number) => string
  importAddedMsg: (n: number) => string
  importReplacedMsg: (n: number) => string
  importEmptyMsg: string
  deleteRoutineConfirm: (name: string) => string
  resetConfirm: string
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
    resetData: 'データをリセット',
    language: '言語',
    taskCountLabel: (n, total) => `${n}タスク · ${total}`,
    totalTimeStr: (m, s) =>
      m > 0 && s > 0 ? `合計 ${m}分${s}秒` : m > 0 ? `合計 ${m}分` : `合計 ${s}秒`,
    importAddedMsg: (n) => `${n}件のルーティンを追加しました`,
    importReplacedMsg: (n) => `${n}件のルーティンで置き換えました`,
    importEmptyMsg: '読み込めるルーティンがありませんでした',
    deleteRoutineConfirm: (name) => `「${name}」を削除しますか？`,
    resetConfirm: '全データを削除しますか？',
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
    resetData: 'Reset data',
    language: 'Language',
    taskCountLabel: (n, total) => `${n} task${n !== 1 ? 's' : ''} · ${total}`,
    totalTimeStr: (m, s) =>
      m > 0 && s > 0 ? `Total ${m}m ${s}s` : m > 0 ? `Total ${m}m` : `Total ${s}s`,
    importAddedMsg: (n) => `Added ${n} routine${n !== 1 ? 's' : ''}`,
    importReplacedMsg: (n) => `Replaced with ${n} routine${n !== 1 ? 's' : ''}`,
    importEmptyMsg: 'No routines found in file',
    deleteRoutineConfirm: (name) => `Delete "${name}"?`,
    resetConfirm: 'Delete all data?',
    speechLang: 'en-US',
    speakTimerStart: (min) => `Starting ${min} minute timer`,
    speakOneMinLeft: 'One minute remaining',
    speakDone: 'Complete',
    speakTaskStart: (name) => `Starting ${name}`,
  },
}
