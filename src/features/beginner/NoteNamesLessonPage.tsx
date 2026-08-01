import { ArrowLeft, Pause, Play, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatActiveNote } from '../../lib/noteNotation'

const NATURAL_NOTES = [
  { note: 'C', solfege: 'Do', number: '1', color: '#ef767a', fret: 8 },
  { note: 'D', solfege: 'Re', number: '2', color: '#f3a35c', fret: 10 },
  { note: 'E', solfege: 'Mi', number: '3', color: '#e4ca55', fret: 12 },
  { note: 'F', solfege: 'Fa', number: '4', color: '#75bd78', fret: 13 },
  { note: 'G', solfege: 'Sol', number: '5', color: '#58aeb5', fret: 15 },
  { note: 'A', solfege: 'La', number: '6', color: '#718ee0', fret: 17 },
  { note: 'B', solfege: 'Si', number: '7', color: '#b27bd3', fret: 19 },
]

type Props = {
  onBack?: () => void
  onNext?: () => void
  onPlay: (string: number, fret: number) => void
}

export function NoteNamesLessonPage({ onBack, onNext, onPlay }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null)
  const active = NATURAL_NOTES[activeIndex]

  const playNote = (index: number) => {
    setActiveIndex(index)
    onPlay(5, NATURAL_NOTES[index].fret)
  }

  useEffect(() => {
    if (!playing) return
    onPlay(5, active.fret)
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => {
        if (index === NATURAL_NOTES.length - 1) {
          setPlaying(false)
          return index
        }
        return index + 1
      })
    }, 900)
    return () => window.clearTimeout(timer)
  }, [active.fret, onPlay, playing])

  return <section className="note-names-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：认识六根琴弦</button>
    <div className="strings-lesson-heading">
      <div><span>LESSON 03 · NOTE NAMES</span><h2>音名、唱名与简谱</h2><p>同一个声音可以有不同的称呼，先把三套最常见的名字对应起来。</p></div>
      <div className="lesson-progress-number"><b>03</b><small>/ 12</small></div>
    </div>

    <div className="note-system-intro">
      <div><span>音名</span><strong>C D E F G A B</strong><p>音的固定身份，用字母记录。</p></div>
      <i>=</i>
      <div><span>固定唱名</span><strong>Do Re Mi Fa Sol La Si</strong><p>开口唱出这些音时使用的名称。</p></div>
      <i>=</i>
      <div><span>数字简谱</span><strong>1 2 3 4 5 6 7</strong><p>入门歌曲中常见的数字记录法。</p></div>
    </div>

    <div className="note-lesson-stage">
      <div className="natural-note-strip">
        {NATURAL_NOTES.map((item, index) => <button key={item.note} className={index === activeIndex ? 'active' : ''} style={{ '--note-color': item.color } as React.CSSProperties} onClick={() => playNote(index)}>
          <strong>{formatActiveNote(item.note)}</strong><span>{item.solfege}</span><small>{item.number}</small><Volume2 size={13}/>
        </button>)}
      </div>

      <div className="active-note-explain">
        <div className="active-note-symbol" style={{ '--note-color': active.color } as React.CSSProperties}><b>{formatActiveNote(active.note)}</b><small>{active.number}</small></div>
        <div><span>这个音的固定对应</span><h3>{active.note} = {active.solfege} = {active.number}</h3><p>看到字母 <b>{active.note}</b>，固定唱名读作 <b>{active.solfege}</b>，数字简谱写作 <b>{active.number}</b>。</p><button onClick={() => onPlay(5, active.fret)}><Volume2 size={15}/>听 {active.note} · {active.solfege}</button></div>
      </div>

      <button className="natural-sequence-play" onClick={() => { if (!playing) setActiveIndex(0); setPlaying((value) => !value) }}>{playing ? <><Pause size={16}/>暂停顺序播放</> : <><Play size={16}/>从 Do 到 Si 顺序播放</>}</button>
    </div>

    <div className="fixed-do-note">
      <strong>这一阶段先用固定唱名</strong>
      <p>无论歌曲是什么调，C 都叫 Do、D 都叫 Re。等这些固定对应熟悉以后，再学习“首调唱名”。</p>
    </div>

    <div className="note-name-quiz">
      <div><span>一分钟检查</span><h3>音名 G 对应哪个固定唱名？</h3></div>
      <div>{['Fa', 'Sol', 'La'].map((answer) => <button key={answer} className={quizAnswer === answer ? (answer === 'Sol' ? 'correct' : 'wrong') : ''} onClick={() => setQuizAnswer(answer)}>{answer}</button>)}</div>
      {quizAnswer && <p>{quizAnswer === 'Sol' ? '正确：G = Sol = 5。' : '再看一次对应表：F 是 Fa，G 才是 Sol。'}</p>}
      <button className="strings-next-lesson" disabled={quizAnswer !== 'Sol'} onClick={onNext}>完成本课，学习半音与全音</button>
    </div>
  </section>
}
