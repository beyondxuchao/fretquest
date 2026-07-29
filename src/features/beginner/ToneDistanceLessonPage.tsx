import { ArrowLeft, Play, Volume2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

type Example = {
  id: string
  from: string
  to: string
  kind: 'half' | 'whole'
  frets: [number, number]
  explanation: string
}

const EXAMPLES: Example[] = [
  { id: 'ef', from: 'E', to: 'F', kind: 'half', frets: [0, 1], explanation: 'E 和 F 中间没有其他音，直接相邻。' },
  { id: 'bc', from: 'B', to: 'C', kind: 'half', frets: [7, 8], explanation: 'B 和 C 也直接相邻，这是第二组特殊关系。' },
  { id: 'cd', from: 'C', to: 'D', kind: 'whole', frets: [8, 10], explanation: 'C 到 D 中间还隔着 C♯，所以是两个半音。' },
]

type Props = {
  onBack?: () => void
  onNext?: () => void
  onPlay: (string: number, fret: number) => void
  renderFretboard: ReactNode
}

export function ToneDistanceLessonPage({ onBack, onNext, onPlay, renderFretboard }: Props) {
  const [activeExample, setActiveExample] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null)
  const example = EXAMPLES[activeExample]

  const playPair = (item: Example) => {
    onPlay(5, item.frets[0])
    window.setTimeout(() => onPlay(5, item.frets[1]), 650)
  }

  return <section className="tone-distance-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：音名、唱名与简谱</button>
    <div className="strings-lesson-heading">
      <div><span>LESSON 04 · TONE DISTANCE</span><h2>半音与全音</h2><p>音与音之间也有距离。在吉他上，品位就是最直观的尺子。</p></div>
      <div className="lesson-progress-number"><b>04</b><small>/ 12</small></div>
    </div>

    <div className="tone-rule-band">
      <div><span>最小距离</span><strong>相邻 1 品</strong><b>半音</b><small>Half Step</small></div>
      <i>× 2</i>
      <div><span>两个半音</span><strong>相隔 2 品</strong><b>全音</b><small>Whole Step</small></div>
    </div>

    <div className="tone-note-ladder" aria-label="自然音之间的全音半音关系">
      {['C','D','E','F','G','A','B','C'].map((note, index) => <div key={`${note}-${index}`} className="tone-ladder-note">
        <strong>{note}</strong>
        {index < 7 && <span className={index === 2 || index === 6 ? 'half' : 'whole'}>{index === 2 || index === 6 ? '半音 · 1品' : '全音 · 2品'}</span>}
      </div>)}
    </div>

    <div className="tone-special-tip"><strong>只先记住这一句</strong><span>E–F、B–C 是半音；其他相邻自然音都是全音。</span></div>

    <div className="tone-example-shell">
      <div className="tone-example-tabs">
        {EXAMPLES.map((item, index) => <button key={item.id} className={index === activeExample ? 'active' : ''} onClick={() => { setActiveExample(index); playPair(item) }}><strong>{item.from} → {item.to}</strong><small>{item.kind === 'half' ? '半音' : '全音'}</small></button>)}
      </div>
      <div className="tone-example-detail">
        <div className={`tone-distance-visual ${example.kind}`}><b>{example.from}</b><i/><span>{example.kind === 'half' ? '1 品' : '2 品'}</span><i/><b>{example.to}</b></div>
        <div><span>{example.kind === 'half' ? 'HALF STEP · 半音' : 'WHOLE STEP · 全音'}</span><h3>{example.from} 到 {example.to}</h3><p>{example.explanation}</p><button onClick={() => playPair(example)}><Volume2 size={15}/>听两音距离</button></div>
      </div>
    </div>

    <div className="tone-fretboard-block">
      <div><span>放到真实指板上</span><h3>每向琴身移动一品，音高升高一个半音</h3><p>点击同一根弦上的相邻品位，比较它们的声音；相隔两品就是一个全音。</p></div>
      <div className="tone-fretboard-legend"><span><i className="ef"/>E–F</span><span><i className="bc"/>B–C</span><small>同色相邻位置组成一个半音</small></div>
      {renderFretboard}
    </div>

    <div className="note-name-quiz tone-quiz">
      <div><span>一分钟检查</span><h3>自然音 E 到 F，在指板上相隔几品？</h3></div>
      <div>{['1 品', '2 品', '3 品'].map((answer) => <button key={answer} className={quizAnswer === answer ? (answer === '1 品' ? 'correct' : 'wrong') : ''} onClick={() => setQuizAnswer(answer)}>{answer}</button>)}</div>
      {quizAnswer && <p>{quizAnswer === '1 品' ? '正确：E–F 是半音，相邻一品。' : 'E–F 是特殊的半音关系，中间没有其他音。'}</p>}
      <button className="strings-next-lesson" disabled={quizAnswer !== '1 品'} onClick={onNext}><Play size={14}/>完成本课，认识品位</button>
    </div>
  </section>
}
