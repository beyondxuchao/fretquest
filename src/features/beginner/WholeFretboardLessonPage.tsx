import { ArrowLeft, Eye, EyeOff, Layers3, Map, Pause, Play, Volume2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { formatActiveNote } from '../../lib/noteNotation'

const NOTES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']
const OPEN_NOTES = [4,11,7,2,9,4]
const STRING_LABELS = ['1 弦 · E','2 弦 · B','3 弦 · G','4 弦 · D','5 弦 · A','6 弦 · E']
const NATURAL = new Set([0,2,4,5,7,9,11])

type Stage = 'string' | 'same-note'
type BoardConfig = { selectedString: number | null; positions: Set<string>; activePosition: {string:number;fret:number} | null }
type Props = { onBack?:()=>void; onNext?:()=>void; onPlay:(string:number,fret:number)=>void; renderFretboard:(config:BoardConfig,onSelect:(string:number,fret:number)=>void)=>ReactNode }

export function WholeFretboardLessonPage({ onBack, onNext, onPlay, renderFretboard }: Props) {
  const [stage,setStage]=useState<Stage>('string')
  const [selectedString,setSelectedString]=useState(5)
  const [activePosition,setActivePosition]=useState({string:5,fret:0})
  const [showSharps,setShowSharps]=useState(true)
  const [isAnimating,setIsAnimating]=useState(false)
  const [animationStep,setAnimationStep]=useState(0)
  const [quizAnswer,setQuizAnswer]=useState<string|null>(null)

  useEffect(()=>{
    if(!isAnimating)return
    setAnimationStep(0)
    onPlay(selectedString,0)
    const timers=Array.from({length:12},(_,index)=>window.setTimeout(()=>{
      const next=index+1
      setAnimationStep(next)
      setActivePosition({string:selectedString,fret:next})
      onPlay(selectedString,next)
    },(index+1)*420))
    const done=window.setTimeout(()=>setIsAnimating(false),13*420)
    return ()=>{timers.forEach(window.clearTimeout);window.clearTimeout(done)}
  },[isAnimating,selectedString])

  const route=useMemo(()=>Array.from({length:13},(_,fret)=>{
    const pitch=(OPEN_NOTES[selectedString]+fret)%12
    return { fret, pitch, note:NOTES[pitch], natural:NATURAL.has(pitch) }
  }),[selectedString])

  const positions=useMemo(()=>{
    const result=new Set<string>()
    if(stage==='same-note'){
      OPEN_NOTES.forEach((open,string)=>{
        for(let fret=0;fret<=12;fret++){
          if((open+fret)%12===0)result.add(`${string}-${fret}`)
        }
      })
      return result
    }
    route.forEach(({fret,pitch})=>{
      if((showSharps||NATURAL.has(pitch))&&(!isAnimating||fret<=animationStep))result.add(`${selectedString}-${fret}`)
    })
    return result
  },[animationStep,isAnimating,route,selectedString,showSharps,stage])

  const choose=(string:number,fret:number)=>{
    setIsAnimating(false)
    setSelectedString(string)
    setActivePosition({string,fret})
    onPlay(string,fret)
  }

  const selectString=(string:number)=>{
    setIsAnimating(false)
    setSelectedString(string)
    setActivePosition({string,fret:0})
    onPlay(string,0)
  }

  const toggleAnimation=()=>{
    setStage('string')
    setIsAnimating(value=>!value)
  }

  return <section className="whole-fretboard-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：认识十二音</button>
    <div className="strings-lesson-heading"><div><span>LESSON 08 · FULL FRETBOARD</span><h2>全音符地图：把 12 平均律铺到指板上</h2><p>不用背六张表。先记住空弦音，再按“每前进一品升高 1 个半音”向前生成。</p></div><div className="lesson-progress-number"><b>08</b><small>/ 12</small></div></div>

    <div className="whole-board-formula"><span>空弦音</span><i>+</i><span>品数 × 1 半音</span><i>=</i><strong>当前位置音名</strong></div>

    <div className="equal-temperament-panel">
      <div><span>12-TONE EQUAL TEMPERAMENT</span><h3>12 平均律循环</h3><p>走完 12 个半音后，音名回到起点，只是高了一个八度。</p></div>
      <div className="equal-temperament-notes">
        {NOTES.map((note,index)=><button key={note} className={`${NATURAL.has(index)?'natural':'sharp'} ${route[animationStep]?.pitch===index&&isAnimating?'active':''}`} onClick={()=>onPlay(5,8+index)}><small>{index}</small><strong>{formatActiveNote(note)}</strong></button>)}
      </div>
    </div>

    <div className="whole-board-toolbar">
      <div className="whole-board-stages">
        <button className={stage==='string'?'active':''} onClick={()=>setStage('string')}><b>01</b><span>逐弦生成</span><small>从空弦推到 12 品</small></button>
        <button className={stage==='same-note'?'active':''} onClick={()=>setStage('same-note')}><b>02</b><span>寻找同名音</span><small>查看所有 C 的位置</small></button>
      </div>
      <button className={`whole-sharp-toggle ${showSharps?'active':''}`} onClick={()=>setShowSharps(value=>!value)} disabled={stage==='same-note'}>
        {showSharps?<Eye size={15}/>:<EyeOff size={15}/>}
        <span>{showSharps?'显示全部 12 音':'隐藏升号音'}</span>
      </button>
      <button className="whole-animation-button" onClick={toggleAnimation}>
        {isAnimating?<Pause size={15}/>:<Play size={15}/>}
        <span>{isAnimating?'暂停演示':'动画生成'}</span>
      </button>
    </div>

    {stage!=='same-note'&&<div className="whole-string-selector">{STRING_LABELS.map((label,string)=><button key={label} className={selectedString===string?'active':''} onClick={()=>selectString(string)}><strong>{string+1}</strong><span>{label.split(' · ')[1]}</span></button>)}</div>}

    <div className="whole-route-strip">
      {route.map((item,index)=><button key={item.fret} className={`${item.natural?'natural':'sharp'} ${activePosition.string===selectedString&&activePosition.fret===item.fret?'active':''} ${isAnimating&&index<=animationStep?'generated':''}`} onClick={()=>choose(selectedString,item.fret)}>
        <small>{item.fret===0?'空弦':`${item.fret} 品`}</small>
        <strong>{showSharps||item.natural?item.note:'·'}</strong>
        <span>{item.natural?'自然音':'半音'}</span>
      </button>)}
    </div>

    <div className="whole-board-copy">
      {stage==='string'&&<><Map size={20}/><div><span>第 {selectedString+1} 弦从 {NOTES[OPEN_NOTES[selectedString]]} 开始</span><h3>{showSharps?'完整显示 12 个半音':'只显示 C D E F G A B'}</h3><p>{isAnimating?'动画正在把“每品升高半音”的规则一格一格写到指板上。':'点击任意位置试听；12 品会回到高八度的同名空弦音。'}</p></div></>}
      {stage==='same-note'&&<><Layers3 size={20}/><div><span>同名音 · 多个位置</span><h3>C 分布在不同琴弦和品位</h3><p>这些圆点音名相同，实际八度可能不同。点击它们比较声音高度。</p></div></>}
    </div>

    <div className={`whole-board-container stage-${stage}`}>{renderFretboard({selectedString:stage==='same-note'?null:selectedString,positions,activePosition},choose)}</div>

    <div className="whole-position-readout"><div><small>当前琴弦</small><strong>{activePosition.string+1} 弦</strong></div><div><small>当前品位</small><strong>{activePosition.fret===0?'空弦':`${activePosition.fret} 品`}</strong></div><div><small>音名</small><strong>{formatActiveNote(NOTES[(OPEN_NOTES[activePosition.string]+activePosition.fret)%12])}</strong></div><button onClick={()=>onPlay(activePosition.string,activePosition.fret)}><Volume2 size={15}/>再听一次</button></div>

    <div className="note-name-quiz whole-board-quiz"><div><span>一分钟检查</span><h3>第 2 弦空弦是 B，向前一品是什么音？</h3></div><div>{['B♯','C','C♯'].map(answer=><button key={answer} className={quizAnswer===answer?(answer==='C'?'correct':'wrong'):''} onClick={()=>setQuizAnswer(answer)}>{answer}</button>)}</div>{quizAnswer&&<p>{quizAnswer==='C'?'正确：B-C 是半音，所以第 2 弦 1 品是 C。':'记住 B-C 紧挨着：B 向前一品就是 C。'}</p>}<button className="strings-next-lesson" disabled={quizAnswer!=='C'} onClick={onNext}>完成本课，演奏第一个旋律</button></div>
  </section>
}
