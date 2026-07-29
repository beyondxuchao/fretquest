import { ArrowLeft, Check, Play, RotateCcw, Volume2 } from 'lucide-react'
import { useState } from 'react'

const SHAPES: Record<'C'|'G', Array<number|null>> = {
  C: [0,1,0,2,3,null],
  G: [3,0,0,0,2,3],
}
const STEPS: Array<'C'|'G'|'C'> = ['C','G','C']

type Props = { onBack?:()=>void; onNext?:()=>void; onPlay:(string:number,fret:number)=>void }

export function FirstChordProgressionLessonPage({ onBack, onNext, onPlay }: Props) {
  const [activeChord,setActiveChord] = useState<'C'|'G'>('C')
  const [step,setStep] = useState(0)
  const [mistake,setMistake] = useState(false)
  const completed = step === STEPS.length

  const playChord = (name:'C'|'G') => {
    setActiveChord(name)
    ;[5,4,3,2,1,0].forEach((string,index)=>{
      const fret=SHAPES[name][string]
      if(fret!==null) window.setTimeout(()=>onPlay(string,fret),index*60)
    })
  }
  const playProgression = () => STEPS.forEach((name,index)=>window.setTimeout(()=>playChord(name),index*850))
  const practice = (name:'C'|'G') => {
    playChord(name)
    if(completed) return
    if(name===STEPS[step]) { setMistake(false); setStep(value=>value+1) }
    else setMistake(true)
  }
  const reset = () => { setStep(0); setMistake(false); setActiveChord('C') }

  return <section className="chord-progression-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：什么是和弦</button>
    <div className="strings-lesson-heading"><div><span>LESSON 11 · FIRST PROGRESSION</span><h2>让和弦开始向前走</h2><p>一个和弦是一种声音；多个和弦按顺序出现，就会产生方向和起伏。</p></div><div className="lesson-progress-number"><b>11</b><small>/ 14</small></div></div>

    <div className="progression-definition">
      <div><span>先看到动作</span><strong>C</strong><i>→</i><strong>G</strong><i>→</i><strong>C</strong></div>
      <div><h3>先稳定，走出去，再回家</h3><p>先弹 C，然后换成 G，最后回到 C。这种和弦按顺序发生变化的安排，叫作<strong>和弦进行</strong>。</p><button onClick={playProgression}><Volume2 size={15}/>听完整顺序</button></div>
    </div>

    <div className="progression-feeling">
      <article><small>第 1 步</small><strong>C</strong><span>C · E · G</span><p>听起来稳定，先把“家”建立起来。</p></article>
      <i>→</i>
      <article><small>第 2 步</small><strong>G</strong><span>G · B · D</span><p>声音产生向前的力量，让人期待下一步。</p></article>
      <i>→</i>
      <article><small>第 3 步</small><strong>C</strong><span>C · E · G</span><p>回到开始的稳定感，像一句话落下句号。</p></article>
    </div>

    <div className="chord-switch-workbench">
      <div className="switch-copy"><span>先分开熟悉两个形状</span><h3>点击 C 或 G，观察六根弦怎样变化</h3><p>数字表示要按的品位，○ 是空弦，× 表示这根弦暂时不弹。先看清变化，再练习切换。</p></div>
      <div className="switch-tabs">{(['C','G'] as const).map(name=><button key={name} className={activeChord===name?'active':''} onClick={()=>playChord(name)}><strong>{name}</strong><span>{name==='C'?'稳定 · 回家':'推动 · 离开'}</span><Play size={14}/></button>)}</div>
      <div className="switch-string-grid">{SHAPES[activeChord].map((fret,string)=><button key={string} disabled={fret===null} onClick={()=>fret!==null&&onPlay(string,fret)} className={fret===null?'muted':fret===0?'open':'pressed'}><small>{string+1} 弦</small><strong>{fret===null?'×':fret===0?'○':fret}</strong><span>{fret===null?'不弹':fret===0?'空弦':`${fret} 品`}</span></button>)}</div>
      <div className="switch-tip"><b>切换提示</b><span>{activeChord==='C'?'C 和弦不弹第 6 弦；先找到第 5 弦 3 品的根音 C。':'换到 G 时，手指要同时照顾低音侧与第 1 弦；动作慢一点也没关系。'}</span></div>
    </div>

    <div className={`progression-practice ${mistake?'mistake':''}`}>
      <div className="progression-practice-head"><div><span>轮到你</span><h3>{completed?'你完成了第一个和弦进行':`现在弹：${STEPS[step]}`}</h3><p>{completed?'你已经听见并亲手完成“稳定 → 推动 → 回归”。':'不要求速度，只要按照 C、G、C 的顺序点击并听清变化。'}</p></div><button onClick={reset}><RotateCcw size={14}/>重来</button></div>
      <div className="progression-track">{STEPS.map((name,index)=><div key={`${name}-${index}`} className={index<step?'done':index===step?'current':''}><b>{index<step?<Check size={16}/>:index+1}</b><strong>{name}</strong><small>{index===0?'建立稳定':index===1?'产生推动':'回到稳定'}</small></div>)}</div>
      <div className="progression-actions"><button onClick={()=>practice('C')}><Play size={15}/>弹 C</button><button onClick={()=>practice('G')}><Play size={15}/>弹 G</button></div>
      {mistake&&<p className="progression-feedback">顺序还没到 G，先看发光的一步。</p>}
    </div>

    <div className="melody-complete"><strong>{completed?'本课完成':'完成条件'}</strong><span>{completed?'你已经完成 C → G → C。下一课将加入 Am 和 Em，比较大和弦与小和弦。':'按照提示完成 C、G、C 三次和弦演奏。'}</span><button className="strings-next-lesson" disabled={!completed} onClick={onNext}>下一课：大和弦与小和弦</button></div>
  </section>
}
