import { ArrowLeft, Layers3, Map, Volume2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'

const NOTES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']
const OPEN_NOTES = [4,11,7,2,9,4]
const STRING_LABELS = ['1 弦 · E','2 弦 · B','3 弦 · G','4 弦 · D','5 弦 · A','6 弦 · E']
const NATURAL = new Set([0,2,4,5,7,9,11])

type Stage = 'string' | 'natural' | 'same-note'
type BoardConfig = { selectedString: number | null; positions: Set<string>; activePosition: {string:number;fret:number} | null }
type Props = { onBack?:()=>void; onNext?:()=>void; onPlay:(string:number,fret:number)=>void; renderFretboard:(config:BoardConfig,onSelect:(string:number,fret:number)=>void)=>ReactNode }

export function WholeFretboardLessonPage({ onBack, onNext, onPlay, renderFretboard }: Props) {
  const [stage,setStage]=useState<Stage>('string')
  const [selectedString,setSelectedString]=useState(5)
  const [activePosition,setActivePosition]=useState({string:5,fret:0})
  const [quizAnswer,setQuizAnswer]=useState<string|null>(null)

  const positions=useMemo(()=>{
    const result=new Set<string>()
    if(stage==='same-note'){
      OPEN_NOTES.forEach((open,string)=>{for(let fret=0;fret<=12;fret++)if((open+fret)%12===0)result.add(`${string}-${fret}`)})
      return result
    }
    for(let fret=0;fret<=12;fret++){
      const pitch=(OPEN_NOTES[selectedString]+fret)%12
      if(stage==='string'||NATURAL.has(pitch))result.add(`${selectedString}-${fret}`)
    }
    return result
  },[selectedString,stage])

  const choose=(string:number,fret:number)=>{
    setSelectedString(string);setActivePosition({string,fret});onPlay(string,fret)
  }

  return <section className="whole-fretboard-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：认识十二音</button>
    <div className="strings-lesson-heading"><div><span>LESSON 08 · FULL FRETBOARD</span><h2>把规律复制到六根弦</h2><p>不需要背六张表。只要知道空弦音，再按“每品升高半音”向前推。</p></div><div className="lesson-progress-number"><b>08</b><small>/ 12</small></div></div>

    <div className="whole-board-formula"><span>空弦音</span><i>+</i><span>品数 × 半音</span><i>=</i><strong>当前位置的音</strong></div>
    <div className="whole-board-stages">
      <button className={stage==='string'?'active':''} onClick={()=>setStage('string')}><b>01</b><span>逐根展开</span><small>查看一根弦的十二音</small></button>
      <button className={stage==='natural'?'active':''} onClick={()=>setStage('natural')}><b>02</b><span>只看自然音</span><small>迁移上一课的路线</small></button>
      <button className={stage==='same-note'?'active':''} onClick={()=>setStage('same-note')}><b>03</b><span>寻找同一个音</span><small>查看所有 C 的位置</small></button>
    </div>

    {stage!=='same-note'&&<div className="whole-string-selector">{STRING_LABELS.map((label,string)=><button key={label} className={selectedString===string?'active':''} onClick={()=>{setSelectedString(string);setActivePosition({string,fret:0});onPlay(string,0)}}><strong>{string+1}</strong><span>{label.split('·')[1]}</span></button>)}</div>}

    <div className="whole-board-copy">
      {stage==='string'&&<><Map size={20}/><div><span>第 {selectedString+1} 弦从 {NOTES[OPEN_NOTES[selectedString]]} 开始</span><h3>沿着品位一格一格升高</h3><p>绿色圆点显示 0–12 品全部音。12 品会回到高八度的同名空弦音。</p></div></>}
      {stage==='natural'&&<><Layers3 size={20}/><div><span>第 {selectedString+1} 弦自然音路线</span><h3>隐藏升号音，只观察 C D E F G A B</h3><p>留意 E–F、B–C 仍然紧挨着，规律在每根弦上完全相同。</p></div></>}
      {stage==='same-note'&&<><Layers3 size={20}/><div><span>同一个音 · 多个位置</span><h3>C 分布在不同琴弦和品位</h3><p>这些圆点音名相同，实际八度可能不同。点击它们比较声音。</p></div></>}
    </div>

    <div className={`whole-board-container stage-${stage}`}>{renderFretboard({selectedString:stage==='same-note'?null:selectedString,positions,activePosition},choose)}</div>

    <div className="whole-position-readout"><div><small>当前琴弦</small><strong>{activePosition.string+1} 弦</strong></div><div><small>当前品位</small><strong>{activePosition.fret===0?'空弦':`${activePosition.fret} 品`}</strong></div><div><small>音名</small><strong>{NOTES[(OPEN_NOTES[activePosition.string]+activePosition.fret)%12]}</strong></div><button onClick={()=>onPlay(activePosition.string,activePosition.fret)}><Volume2 size={15}/>再听一次</button></div>

    <div className="note-name-quiz whole-board-quiz"><div><span>一分钟检查</span><h3>第 2 弦空弦是 B，向前一品是什么音？</h3></div><div>{['B♯','C','C♯'].map(answer=><button key={answer} className={quizAnswer===answer?(answer==='C'?'correct':'wrong'):''} onClick={()=>setQuizAnswer(answer)}>{answer}</button>)}</div>{quizAnswer&&<p>{quizAnswer==='C'?'正确：B–C 是半音，所以第 2 弦 1 品是 C。':'记住 B–C 紧挨着：B 向前一品就是 C。'}</p>}<button className="strings-next-lesson" disabled={quizAnswer!=='C'} onClick={onNext}>完成本课，演奏第一个旋律</button></div>
  </section>
}
