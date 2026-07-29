import { ArrowLeft, Pause, Play, Volume2 } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { cloneElement, isValidElement, useEffect, useMemo, useState } from 'react'

const NOTES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']
const SOLFEGE=['Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Si','La','Li','Si']
const OPEN_NOTES=[4,11,7,2,9,4]
const STRING_LABELS=['第 1 弦 · E','第 2 弦 · B','第 3 弦 · G','第 4 弦 · D','第 5 弦 · A','第 6 弦 · E']

type Props = { onBack?: () => void; onNext?: () => void; onPlay: (string: number, fret: number) => void; renderFretboard: (activeFret: number, frets: number[], onSelect: (string: number, fret: number) => void) => ReactNode }

export function ChromaticNotesLessonPage({ onBack, onNext, onPlay, renderFretboard }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [activeString,setActiveString]=useState(5)
  const [playing, setPlaying] = useState(false)
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null)
  const chromatic=useMemo(()=>Array.from({length:13},(_,fret)=>{const noteIndex=(OPEN_NOTES[activeString]+fret)%12;return [NOTES[noteIndex],SOLFEGE[noteIndex]]}),[activeString])
  const active = chromatic[activeIndex]
  const quizNote=NOTES[(OPEN_NOTES[activeString]+2)%12]
  const quizOptions=[quizNote,NOTES[(OPEN_NOTES[activeString]+1)%12],NOTES[(OPEN_NOTES[activeString]+3)%12]]
  const board=renderFretboard(activeIndex,Array.from({length:13},(_,index)=>index),(string,fret)=>{setActiveString(string);setActiveIndex(fret);setQuizAnswer(null);onPlay(string,fret)})
  const dynamicBoard=isValidElement(board)?cloneElement(board as ReactElement<Record<string,unknown>>,{highlightString:activeString,lessonActivePosition:{string:activeString,fret:activeIndex},lessonNaturalPositions:new Set(Array.from({length:13},(_,fret)=>`${activeString}-${fret}`))}):board

  const select = (index: number, sound = true) => {
    const next = Math.max(0, Math.min(12, index))
    setActiveIndex(next)
    if (sound) onPlay(activeString, next)
  }
  const chooseString=(string:number)=>{setActiveString(string);setActiveIndex(0);setQuizAnswer(null);setPlaying(false);onPlay(string,0)}

  useEffect(() => {
    if (!playing) return
    onPlay(activeString, activeIndex)
    const timer = window.setTimeout(() => {
      if (activeIndex === 12) setPlaying(false)
      else setActiveIndex((index) => index + 1)
    }, 650)
    return () => window.clearTimeout(timer)
  }, [activeIndex, activeString, onPlay, playing])

  return <section className="chromatic-lesson-page">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：一根弦上的自然音</button>
    <div className="strings-lesson-heading"><div><span>LESSON 07 · CHROMATIC NOTES</span><h2>认识十二音</h2><p>自然音之间的空位，也有自己的音名。把一品一品的声音连起来，就是半音阶。</p></div><div className="lesson-progress-number"><b>07</b><small>/ 12</small></div></div>

    <div className="chromatic-summary"><strong>一个八度</strong><span>12 个半音</span><i>→</i><strong>13 个品位点</strong><small>空弦 + 1 至 12 品</small></div>
    <div className="chromatic-string-selector"><div><span>选择一根弦观察</span><strong>{STRING_LABELS[activeString]}</strong></div><div>{STRING_LABELS.map((label,string)=><button key={label} className={activeString===string?'active':''} onClick={()=>chooseString(string)}><b>{string+1}</b><span>{NOTES[OPEN_NOTES[string]]}</span></button>)}</div></div>
    <div className="chromatic-grid">{chromatic.map(([note, solfege], index) => <button key={`${note}-${index}`} className={`${index === activeIndex ? 'active' : ''} ${note.includes('♯') ? 'sharp' : 'natural'}`} onClick={() => select(index)}><small>{index === 0 ? '空弦' : `${index} 品`}</small><strong>{note}</strong><span>{solfege}</span><Volume2 size={12}/></button>)}</div>

    <div className="chromatic-explain"><div className="chromatic-active-note"><b>{active[0]}</b><small>{active[1]}</small></div><div><span>{STRING_LABELS[activeString]} · 当前音高</span><h3>从空弦向前 {activeIndex} 个半音</h3><p>{active[0].includes('♯') ? '这是升号音，位于两个自然音之间。' : '这是自然音，在十二音系统中也占据一个半音位置。'}</p><button onClick={() => onPlay(activeString, activeIndex)}><Volume2 size={15}/>试听 {active[0]}</button></div><button className="chromatic-sequence" onClick={() => { if (!playing) setActiveIndex(0); setPlaying((value) => !value) }}>{playing ? <><Pause size={15}/>暂停</> : <><Play size={15}/>顺序听完十二音</>}</button></div>

    <div className="chromatic-fretboard-block"><div><span>完整半音阶在{STRING_LABELS[activeString].split(' · ')[0]}上</span><h3>每一根弦都是一条十二音阶梯</h3><p>从空弦 {NOTES[OPEN_NOTES[activeString]]} 开始，到 12 品再次回到 {NOTES[OPEN_NOTES[activeString]]}，音高升高一个八度。也可以直接点击下方任意琴弦切换观察。</p></div>{dynamicBoard}</div>

    <div className="chromatic-tip"><strong>先用升号记忆</strong><span>入门时先按“上行”来记：C → C♯ → D。以后再学习同一个音的另一种写法，例如 C♯ = D♭。</span></div>
    <div className="note-name-quiz chromatic-quiz"><div><span>一分钟检查</span><h3>{STRING_LABELS[activeString].split(' · ')[0]} 2 品是什么音？</h3></div><div>{quizOptions.map((answer) => <button key={answer} className={quizAnswer === answer ? (answer === quizNote ? 'correct' : 'wrong') : ''} onClick={() => setQuizAnswer(answer)}>{answer}</button>)}</div>{quizAnswer && <p>{quizAnswer === quizNote ? `正确：从空弦 ${NOTES[OPEN_NOTES[activeString]]} 向前两个半音就是 ${quizNote}。` : `从空弦 ${NOTES[OPEN_NOTES[activeString]]} 开始，一品一品向前数。`}</p>}<button className="strings-next-lesson" disabled={quizAnswer !== quizNote} onClick={onNext}>完成本课，认识整块指板</button></div>
  </section>
}
