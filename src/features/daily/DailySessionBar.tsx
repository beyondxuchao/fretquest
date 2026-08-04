import type { TrainingType } from '../../types'

export type DailyStage = { type: TrainingType; title: string; description: string; minutes: number }

type SessionProps = {
  stages: DailyStage[]
  step: number
  timeLeft: number
  label?: string
  questionIndex?: number
  questionTotal?: number
  onExit: () => void
}

export function DailySessionBar({ stages, step, timeLeft, label = '今日 10 分钟', questionIndex, questionTotal, onExit }: SessionProps) {
  if (!stages.length) return null
  const safeStep = Math.max(0, Math.min(step, stages.length - 1))
  const total = stages.reduce((sum, item) => sum + item.minutes * 60, 0)
  const questionMode = questionIndex !== undefined && questionTotal !== undefined
  const stageElapsed = questionMode ? stages[safeStep].minutes * 60 * Math.max(0, questionIndex - 1) / questionTotal : stages[safeStep].minutes * 60 - timeLeft
  const elapsed = stages.slice(0, safeStep).reduce((sum, item) => sum + item.minutes * 60, 0) + stageElapsed
  const remaining = Math.max(0, total - elapsed)
  const progress = Math.max(0, Math.min(100, elapsed / total * 100))
  return <div className="daily-session-bar"><div><span>{label} · {safeStep + 1}/{stages.length}{questionMode ? ` · 第 ${questionIndex}/${questionTotal} 题` : ''}</span><strong>{stages[safeStep].title}</strong><small>下一阶段：{safeStep < stages.length - 1 ? stages[safeStep + 1].title : '完成练习'}</small></div><div className="daily-session-progress"><i style={{ width: `${progress}%` }} /></div><b>{questionMode ? `${questionIndex}/${questionTotal}` : `${Math.floor(remaining / 60)}:${String(Math.round(remaining % 60)).padStart(2, '0')}`}</b><button onClick={onExit}>退出计划</button></div>
}
