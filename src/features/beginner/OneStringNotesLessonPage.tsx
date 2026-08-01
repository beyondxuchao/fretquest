import { ArrowLeft, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { cloneElement, isValidElement, useEffect, useMemo, useState } from 'react'
import { formatActiveNote } from '../../lib/noteNotation'

const NOTES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']
const SOLFEGE:Record<string,string>={C:'Do',D:'Re',E:'Mi',F:'Fa',G:'Sol',A:'La',B:'Si'}
const OPEN_NOTES=[4,11,7,2,9,4]
const STRING_LABELS=['第 1 弦 · E','第 2 弦 · B','第 3 弦 · G','第 4 弦 · D','第 5 弦 · A','第 6 弦 · E']

type Props = {
  onBack?: () => void
  onNext?: () => void
  onPlay: (string: number, fret: number) => void
  renderFretboard: (activeFret: number, naturalFrets: number[], onSelect: (string: number, fret: number) => void) => ReactNode
}

export function OneStringNotesLessonPage({ onBack, onNext, onPlay, renderFretboard }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeString,setActiveString]=useState(5)
  const [playing, setPlaying] = useState(false)
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const naturalNotes=useMemo(()=>Array.from({length:13},(_,fret)=>({fret,note:NOTES[(OPEN_NOTES[activeString]+fret)%12]})).filter(item=>!item.note.includes('♯')).map(item=>({...item,solfege:SOLFEGE[item.note]})),[activeString])
  const active = naturalNotes[activeIndex]??naturalNotes[0]
  const cFret=(12-OPEN_NOTES[activeString])%12||12
  const quizOptions=[cFret,cFret===1?2:cFret-1,cFret>=10?cFret-2:cFret+2]

  const selectIndex = (index: number, sound = true) => {
    const next = Math.max(0, Math.min(naturalNotes.length - 1, index))
    setActiveIndex(next)
    if (sound) onPlay(activeString, naturalNotes[next].fret)
  }

  useEffect(() => {
    if (!playing) return
    onPlay(activeString, active.fret)
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => {
        if (index === naturalNotes.length - 1) {
          setPlaying(false)
          return index
        }
        return index + 1
      })
    }, 900)
    return () => window.clearTimeout(timer)
  }, [active.fret, activeString, naturalNotes.length, onPlay, playing])

  const selectPosition = (string: number, fret: number) => {
    onPlay(string, fret)
    if(string!==activeString){setActiveString(string);setActiveIndex(0);setQuizAnswer(null);return}
    const index = naturalNotes.findIndex((item) => item.fret === fret)
    if (index >= 0) setActiveIndex(index)
  }
  const chooseString=(string:number)=>{setActiveString(string);setActiveIndex(0);setQuizAnswer(null);setPlaying(false);onPlay(string,0)}
  const board=renderFretboard(active.fret,naturalNotes.map(item=>item.fret),selectPosition)
  const dynamicBoard=isValidElement(board)?cloneElement(board as ReactElement<Record<string,unknown>>,{highlightString:activeString,lessonActivePosition:{string:activeString,fret:active.fret},lessonNaturalPositions:new Set(naturalNotes.map(item=>`${activeString}-${item.fret}`))}):board

  return <section className="one-string-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：认识品丝与品位</button>
    <div className="strings-lesson-heading">
      <div><span>LESSON 06 · ONE STRING MAP</span><h2>在任意一根弦找到所有自然音</h2><p>选择一根弦，观察自然音路线怎样随着空弦音改变。</p></div>
      <div className="lesson-progress-number"><b>06</b><small>/ 12</small></div>
    </div>

    <div className="one-string-rule">
      <div><span>起点</span><strong>{STRING_LABELS[activeString]} 空弦</strong></div>
      <i>+</i>
      <div><span>移动规则</span><strong>每前进一品升高半音</strong></div>
      <i>=</i>
      <div><span>终点</span><strong>12 品回到高八度 {formatActiveNote(NOTES[OPEN_NOTES[activeString]])}</strong></div>
    </div>

    <div className="chromatic-string-selector"><div><span>选择一根弦观察</span><strong>{STRING_LABELS[activeString]}</strong></div><div>{STRING_LABELS.map((label,string)=><button key={label} className={activeString===string?'active':''} onClick={()=>chooseString(string)}><b>{string+1}</b><span>{formatActiveNote(NOTES[OPEN_NOTES[string]])}</span></button>)}</div></div>

    <div className="one-string-route">
      {naturalNotes.map((item, index) => <button key={`${item.note}-${item.fret}`} className={index === activeIndex ? 'active' : ''} onClick={() => selectIndex(index)}>
        <small>{item.fret === 0 ? '空弦' : `${item.fret} 品`}</small><strong>{formatActiveNote(item.note)}</strong><span>{item.solfege}</span>
        {index < naturalNotes.length - 1 && <i>{naturalNotes[index + 1].fret - item.fret === 1 ? '半音' : '全音'}</i>}
      </button>)}
    </div>

    <div className="one-string-focus">
      <div><span>当前音</span><b>{formatActiveNote(active.note)}</b><small>{active.solfege}</small></div>
      <div><h3>{STRING_LABELS[activeString].split(' · ')[0]} · {active.fret === 0 ? '空弦' : `${active.fret} 品`}</h3><p>{active.fret === 0 ? `这条自然音路线从 ${active.note} 开始。` : `从空弦 ${NOTES[OPEN_NOTES[activeString]]} 向琴身移动 ${active.fret} 品，到达 ${active.note}。`}</p><button onClick={() => onPlay(activeString, active.fret)}><Volume2 size={15}/>试听 {active.note}</button></div>
      <div className="one-string-controls"><button onClick={() => selectIndex(activeIndex - 1)} disabled={activeIndex === 0}><SkipBack size={16}/></button><button onClick={() => { if (!playing) setActiveIndex(0); setPlaying((value) => !value) }}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button><button onClick={() => selectIndex(activeIndex + 1)} disabled={activeIndex === naturalNotes.length - 1}><SkipForward size={16}/></button></div>
    </div>

    <div className="one-string-fretboard">
      <div><span>{STRING_LABELS[activeString].split(' · ')[0]}自然音地图</span><h3>绿色圆点会跟随所选琴弦变化</h3><p>点击上方按钮或指板上的其他琴弦，就能查看那根弦的自然音位置。</p></div>
      {dynamicBoard}
    </div>

    <div className="one-string-memory"><strong>观察两个紧挨着的位置</strong><span>E–F 在 0–1 品，B–C 在 7–8 品；其他自然音之间都隔开一个品位。</span></div>

    <div className="note-name-quiz one-string-quiz">
      <div><span>一分钟检查</span><h3>{STRING_LABELS[activeString].split(' · ')[0]}上的 C 在第几品？</h3></div>
      <div>{quizOptions.map((answer) => <button key={answer} className={quizAnswer === answer ? (answer === cFret ? 'correct' : 'wrong') : ''} onClick={() => setQuizAnswer(answer)}>{answer} 品</button>)}</div>
      {quizAnswer && <p>{quizAnswer === cFret ? `正确：${STRING_LABELS[activeString].split(' · ')[0]} ${cFret} 品是 C，也就是 Do。` : `从空弦 ${NOTES[OPEN_NOTES[activeString]]} 沿自然音路线数到 C。`}</p>}
      <button className="strings-next-lesson" disabled={quizAnswer !== cFret} onClick={onNext}>完成本课，认识十二音</button>
    </div>
  </section>
}
