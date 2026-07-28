import { Brain, Clock3, Headphones, MapPin, Play, Route } from 'lucide-react'
import type { TrainingType } from '../../types'

export type DailyStage={type:TrainingType;title:string;description:string;minutes:number}

const ICONS=[Brain,MapPin,Route,Play,Headphones]

type PageProps={stages:DailyStage[];onStart:()=>void}

export function DailyPracticePage({stages,onStart}:PageProps){
  return <section className="daily-practice-page">
    <div className="daily-overview"><div><span>DAILY MIXED PRACTICE</span><h2>每天 10 分钟，建立完整的指板记忆</h2><p>一次完成定位、关系、应用与听觉训练。每个阶段保持同一种规则，两分钟后自动切换。</p></div><div className="daily-duration"><Clock3 size={22}/><strong>10</strong><span>分钟</span></div></div>
    <div className="daily-timeline">{stages.map((stage,index)=>{const Icon=ICONS[index];return <article key={stage.type}><i>{index+1}</i><div className="daily-stage-icon"><Icon size={18}/></div><div><strong>{stage.title}</strong><span>{stage.description}</span></div><small>{Number.isInteger(stage.minutes)?`${stage.minutes}:00`:`${Math.floor(stage.minutes)}:${String(Math.round(stage.minutes%1*60)).padStart(2,'0')}`}</small></article>})}</div>
    <div className="daily-guidance"><div><strong>今天怎么练</strong><span>系统会根据长期记录安排薄弱位置；正确但反应较慢的位置也会再次出现。</span></div><div><strong>中途无需选择</strong><span>每段开始前会显示新规则，成绩和连击贯穿整个练习。</span></div><button onClick={onStart}><Play size={17}/> 开始今日 10 分钟</button></div>
  </section>
}

type SessionProps={stages:DailyStage[];step:number;timeLeft:number;label?:string;onExit:()=>void}

export function DailySessionBar({stages,step,timeLeft,label='今日 10 分钟',onExit}:SessionProps){
  const total=stages.reduce((sum,item)=>sum+item.minutes*60,0),elapsed=stages.slice(0,step).reduce((sum,item)=>sum+item.minutes*60,0)+(stages[step].minutes*60-timeLeft),remaining=Math.max(0,total-elapsed)
  const progress=Math.max(0,Math.min(100,elapsed/total*100))
  return <div className="daily-session-bar"><div><span>{label} · {step+1}/{stages.length}</span><strong>{stages[step].title}</strong><small>下一阶段：{step<stages.length-1?stages[step+1].title:'完成练习'}</small></div><div className="daily-session-progress"><i style={{width:`${progress}%`}}/></div><b>{Math.floor(remaining/60)}:{String(Math.round(remaining%60)).padStart(2,'0')}</b><button onClick={onExit}>退出计划</button></div>
}
