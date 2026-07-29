import { ArrowLeft, ChevronLeft, ChevronRight, Play, Volume2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

type Props = {
  onBack?: () => void
  onNext?: () => void
  onPlay: (string: number, fret: number) => void
  renderFretboard: (activeString: number, activeFret: number, onSelect: (string: number, fret: number) => void) => ReactNode
}

export function FretPositionsLessonPage({ onBack, onNext, onPlay, renderFretboard }: Props) {
  const [activeFret, setActiveFret] = useState(0)
  const [activeString, setActiveString] = useState(5)
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)

  const selectFret = (fret: number, string = 5) => {
    const next = Math.max(0, Math.min(12, fret))
    setActiveFret(next)
    setActiveString(string)
    onPlay(string, next)
  }

  return <section className="fret-positions-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：半音与全音</button>
    <div className="strings-lesson-heading">
      <div><span>LESSON 05 · FRETS</span><h2>认识品丝与品位</h2><p>品丝是金属线，品位是两根品丝之间的区域。左手真正按下的是品位。</p></div>
      <div className="lesson-progress-number"><b>05</b><small>/ 12</small></div>
    </div>

    <div className="fret-definition-row">
      <div><i className="fret-wire-demo"/><span>金属线</span><h3>品丝 · Fret Wire</h3><p>竖向金属条负责截断琴弦振动长度。</p></div>
      <div><i className="fret-space-demo">1</i><span>两条品丝之间</span><h3>品位 · Fret</h3><p>“按 1 品”是按在第一个区域内，不是压在金属线上。</p></div>
      <div><i className="open-string-demo">0</i><span>不按任何品位</span><h3>空弦 · Open String</h3><p>空弦可以记作 0 品，是琴弦原本的音高。</p></div>
    </div>

    <div className="fret-hand-tip">
      <div className="finger-placement-demo"><span className="demo-fret first"/><span className="demo-fret second"/><i/><b>按这里</b></div>
      <div><span>正确按法</span><h3>手指靠近下一根品丝，但不要压在品丝上</h3><p>这样更省力，也更不容易出现杂音。手指应尽量垂直，用指尖按弦。</p></div>
    </div>

    <div className="fret-interactive-block">
      <div className="fret-interactive-head">
        <div><span>当前观察</span><h3>{activeFret === 0 ? '空弦 · 0 品' : `第 ${activeFret} 品`}</h3><p>{activeFret === 0 ? '没有按弦，琴弦从上弦枕开始振动。' : `从空弦向琴身移动 ${activeFret} 品，音高升高 ${activeFret} 个半音。`}</p></div>
        <div className="fret-stepper"><button onClick={() => selectFret(activeFret - 1)} disabled={activeFret === 0}><ChevronLeft size={17}/></button><b>{activeFret}</b><button onClick={() => selectFret(activeFret + 1)} disabled={activeFret === 12}><ChevronRight size={17}/></button><button className="fret-listen" onClick={() => onPlay(5, activeFret)}><Volume2 size={15}/>试听</button></div>
      </div>
      <div className="fret-quick-select">{[0,1,2,3,5,7,9,12].map((fret) => <button key={fret} className={fret === activeFret ? 'active' : ''} onClick={() => selectFret(fret)}>{fret === 0 ? '空弦' : `${fret} 品`}</button>)}</div>
      {renderFretboard(activeString, activeFret, (string, fret) => { setActiveString(string); setActiveFret(fret); onPlay(string, fret) })}
    </div>

    <div className="twelfth-fret-note"><strong>为什么 12 品很重要？</strong><span>到 12 品时，琴弦有效长度约缩短一半，音高升高一个八度。音名回到空弦的同名音，但声音更高。</span><button onClick={() => { onPlay(5, 0); window.setTimeout(() => onPlay(5, 12), 650) }}><Play size={14}/>比较空弦与 12 品</button></div>

    <div className="note-name-quiz fret-quiz">
      <div><span>一分钟检查</span><h3>“按 3 品”时，手指应该放在哪里？</h3></div>
      <div>{[2,3,4].map((answer) => <button key={answer} className={quizAnswer === answer ? (answer === 3 ? 'correct' : 'wrong') : ''} onClick={() => setQuizAnswer(answer)}>{answer === 2 ? '第 2 个区域' : answer === 3 ? '第 3 个区域' : '第 3 根品丝上'}</button>)}</div>
      {quizAnswer && <p>{quizAnswer === 3 ? '正确：按在第 3 个品位内，并靠近它右侧的品丝。' : '品号指的是区域，不是金属品丝本身。'}</p>}
      <button className="strings-next-lesson" disabled={quizAnswer !== 3} onClick={onNext}>完成本课，在一根弦上找自然音</button>
    </div>
  </section>
}
