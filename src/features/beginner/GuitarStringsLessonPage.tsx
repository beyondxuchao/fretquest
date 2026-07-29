import { ArrowLeft, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type GuitarString = {
  number: number
  note: string
  solfege: string
  octave: number
  frequency: number
  gauge: number
  description: string
  memory: string
}

const STRINGS: GuitarString[] = [
  { number: 1, note: 'E', solfege: 'Mi', octave: 4, frequency: 329.63, gauge: 1.1, description: '最高、最细的一根弦', memory: '1 弦最靠近地面，声音最高。' },
  { number: 2, note: 'B', solfege: 'Si', octave: 3, frequency: 246.94, gauge: 1.5, description: '第二高音弦', memory: '2 弦空弦是 B，对应唱名 Si。' },
  { number: 3, note: 'G', solfege: 'Sol', octave: 3, frequency: 196, gauge: 2, description: '中间的过渡弦', memory: '3 弦空弦是 G，对应唱名 Sol。' },
  { number: 4, note: 'D', solfege: 'Re', octave: 3, frequency: 146.83, gauge: 2.8, description: '低音区的起点', memory: '从 4 弦开始，琴弦明显变粗。' },
  { number: 5, note: 'A', solfege: 'La', octave: 2, frequency: 110, gauge: 3.7, description: '常用低音根音弦', memory: '5 弦空弦是 A，对应唱名 La。' },
  { number: 6, note: 'E', solfege: 'Mi', octave: 2, frequency: 82.41, gauge: 4.8, description: '最低、最粗的一根弦', memory: '6 弦最靠近你的脸，声音最低。' },
]

type Props = {
  onBack?: () => void
  onNext?: () => void
  onPlay: (string: number, fret: number) => void
  renderFretboard: (onStringSelect: (string: number) => void, activeString: number) => ReactNode
}

export function GuitarStringsLessonPage({ onBack, onNext, onPlay, renderFretboard }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const activeString = STRINGS[activeIndex]
  const progress = useMemo(() => ((activeIndex + 1) / STRINGS.length) * 100, [activeIndex])

  const playTone = (string: GuitarString) => {
    onPlay(string.number - 1, 0)
  }

  const selectString = (index: number, withSound = true) => {
    const next = Math.max(0, Math.min(STRINGS.length - 1, index))
    setActiveIndex(next)
    if (withSound) playTone(STRINGS[next])
  }

  useEffect(() => {
    if (!playing) return
    playTone(activeString)
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => {
        if (index === STRINGS.length - 1) {
          setPlaying(false)
          return index
        }
        return index + 1
      })
    }, 1900)
    return () => window.clearTimeout(timer)
  }, [activeIndex, playing])

  return <section className="strings-lesson-page">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：认识吉他</button>
    <div className="strings-lesson-heading">
      <div><span>LESSON 02 · OPEN STRINGS</span><h2>认识六根琴弦</h2><p>从最细的 1 弦开始，听见并记住每根空弦的名字。</p></div>
      <div className="lesson-progress-number"><b>02</b><small>/ 12</small></div>
    </div>

    <div className="strings-lesson-shell">
      <div className="strings-observation">
        <div className="string-orientation"><span>靠近地面 · 音高</span><span>靠近脸部 · 音低</span></div>
        <div className="open-strings-fretboard">
          {renderFretboard((string) => selectString(string, false), activeIndex)}
        </div>
        <div className="strings-controls">
          <button onClick={() => { setActiveIndex(0); setPlaying(false) }} aria-label="重置"><RotateCcw size={16}/></button>
          <button onClick={() => selectString(activeIndex - 1)} disabled={activeIndex === 0} aria-label="上一根弦"><SkipBack size={16}/></button>
          <button className="strings-play-all" onClick={() => setPlaying((value) => !value)}>{playing ? <><Pause size={16}/>暂停</> : <><Play size={16}/>逐弦试听</>}</button>
          <button onClick={() => selectString(activeIndex + 1)} disabled={activeIndex === STRINGS.length - 1} aria-label="下一根弦"><SkipForward size={16}/></button>
          <div className="anatomy-progress"><i style={{ width: `${progress}%` }}/></div>
        </div>
      </div>

      <aside className="string-detail-panel">
        <span>当前空弦</span>
        <div className="string-note-hero"><b>{activeString.note}</b><small>{activeString.octave}</small></div>
        <h3>第 {activeString.number} 弦 · {activeString.description}</h3>
        <div className="note-name-pair"><div><small>音名</small><strong>{activeString.note}</strong></div><i>=</i><div><small>固定唱名</small><strong>{activeString.solfege}</strong></div></div>
        <dl><div><dt>标准频率</dt><dd>{activeString.frequency.toFixed(2)} Hz</dd></div><div><dt>弦的粗细</dt><dd>{activeString.number <= 3 ? '较细 · 高音弦' : '较粗 · 低音弦'}</dd></div></dl>
        <p>{activeString.memory}</p>
        <button className="string-listen-again" onClick={() => playTone(activeString)}><Volume2 size={16}/>再听一次 {activeString.note}</button>
      </aside>
    </div>

    <div className="strings-quiz">
      <div><span>一分钟检查</span><h3>哪一根是最粗、声音最低的琴弦？</h3></div>
      <div className="strings-quiz-options">
        {[1, 3, 6].map((number) => <button key={number} className={quizAnswer === number ? (number === 6 ? 'correct' : 'wrong') : ''} onClick={() => setQuizAnswer(number)}>{number} 弦</button>)}
      </div>
      {quizAnswer !== null && <p>{quizAnswer === 6 ? '正确：6 弦最粗，空弦音是低音 E。' : '再看一眼：弦号越大，琴弦通常越粗、声音越低。'}</p>}
      <button className="strings-next-lesson" onClick={onNext} disabled={quizAnswer !== 6}>完成本课，学习音名与唱名</button>
    </div>
  </section>
}
