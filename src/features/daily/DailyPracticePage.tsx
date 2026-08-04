import { Brain, Clock3, Headphones, MapPin, Music2, Play, Route } from 'lucide-react'
import type { DailyStage } from './DailySessionBar'

const ICONS = [Brain, MapPin, Route, Music2, Play, Headphones]

type PageProps = { stages: DailyStage[]; onStart: () => void }

function formatMinutes(minutes: number) {
  return Number.isInteger(minutes) ? `${minutes}:00` : `${Math.floor(minutes)}:${String(Math.round(minutes % 1 * 60)).padStart(2, '0')}`
}

export function DailyPracticePage({ stages, onStart }: PageProps) {
  return <section className="daily-practice-page">
    <div className="daily-overview"><div><span>DAILY MIXED PRACTICE</span><h2>每天 10 分钟，建立完整的指板记忆</h2><p>一次完成定位、关系、应用与听觉训练。每个阶段保持同一种规则，并按你的薄弱项自动分配时间。</p></div><div className="daily-duration"><Clock3 size={22} /><strong>10</strong><span>分钟</span></div></div>
    <div className="daily-timeline">{stages.map((stage, index) => { const Icon = ICONS[index] || Brain; return <article key={`${stage.type}-${index}`}><i>{index + 1}</i><div className="daily-stage-icon"><Icon size={18} /></div><div><strong>{stage.title}</strong><span>{stage.description}</span></div><small>{formatMinutes(stage.minutes)}</small></article> })}</div>
    <div className="daily-guidance"><div><strong>今天怎么练？</strong><span>系统会根据长期记录安排薄弱位置；正确但反应较慢的位置也会再次出现。</span></div><div><strong>中途无需选择</strong><span>每段开始前会显示新规则，成绩和连击贯穿整个练习。</span></div><button onClick={onStart}><Play size={17} /> 开始今日 10 分钟</button></div>
  </section>
}
