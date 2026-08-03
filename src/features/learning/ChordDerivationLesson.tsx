import { Play } from 'lucide-react'
import { CHORD_TYPES, NOTES, intervalDegreeLabel } from '../../lib/musicTheory'
import type { ChordType, parseChordInput } from '../../lib/musicTheory'

type ParsedChord = NonNullable<ReturnType<typeof parseChordInput>>

type Props = {
  value: string
  parsed: ParsedChord | null
  error: string
  onChange: (value: string) => void
  onSubmit: () => void
  onExample: (value: string) => void
  onPlay: (string: number, fret: number) => void
}

const INTERVAL_NAMES: Record<number, string> = {
  0: '根音',
  1: '小二度',
  2: '大二度 / 九度',
  3: '小三度',
  4: '大三度',
  5: '纯四度',
  6: '减五度',
  7: '纯五度',
  8: '增五度',
  9: '大六度',
  10: '小七度',
  11: '大七度',
}

export function ChordDerivationLesson({ value, parsed, error, onChange, onSubmit, onExample, onPlay }: Props) {
  const chordType = parsed?.matchedType ? CHORD_TYPES[parsed.matchedType as ChordType] : null
  const chordName = parsed ? `${NOTES[parsed.root]}${chordType ? chordType.suffix : parsed.source === 'symbol' ? '' : ' 自定义'}` : 'C'
  const tones = parsed?.intervals.map((interval, index) => ({
    interval,
    degree: intervalDegreeLabel(interval),
    note: NOTES[parsed.pitches[index] % 12],
    name: INTERVAL_NAMES[((interval % 12) + 12) % 12] || `${interval} 半音`,
  })) || []
  const playChord = () => {
    if (!parsed) return
    parsed.pitches.forEach((pitch, index) => {
      const fret = ((pitch - 4 + 12) % 12) || 12
      window.setTimeout(() => onPlay(5, fret), index * 380)
    })
  }

  return <section className="chord-derivation-lesson">
    <div className="chord-derivation-copy">
      <span>CHORD FORMULA</span>
      <h2>输入和弦，看它怎样由音程组成</h2>
      <p>输入 C、Cm、C7、DF♯A 或 1 3 5。第一个音会作为根音，下面的指板会用 1、3、5、♭7 这类度数标出所有对应位置。</p>
    </div>

    <form className="chord-learning-input" onSubmit={(event)=>{event.preventDefault();onSubmit()}}>
      <input value={value} onChange={(event)=>onChange(event.target.value)} placeholder="例如：C、Cm、C7、DF♯A、135" aria-label="输入和弦"/>
      <button type="submit">推导</button>
      {error && <small>{error}</small>}
    </form>
    <div className="chord-learning-examples">{['C','Cm','C7','Cmaj7','DF♯A','1 b3 5'].map((example)=><button key={example} onClick={()=>onExample(example)}>{example}</button>)}</div>

    {parsed && <div className="chord-formula-result">
      <div className="chord-result-title">
        <span>当前和弦</span>
        <strong>{chordName}</strong>
        <small>{chordType?.name || '自定义和弦'} · {tones.map((tone)=>tone.degree).join(' · ')}</small>
      </div>
      <button onClick={playChord}><Play size={14}/> 试听组成音</button>
    </div>}

    {parsed && <div className="chord-degree-table">
      {tones.map((tone)=><article key={`${tone.degree}-${tone.note}`}>
        <span>{tone.degree}</span>
        <strong>{tone.note}</strong>
        <small>{tone.name}</small>
      </article>)}
    </div>}

    <div className="chord-derivation-rule">
      <strong>关键规律</strong>
      <span>和弦公式描述的是度数关系，不是固定手形。C 大三和弦是 C、E、G，因为它们对应 1、3、5；C 小三和弦是 C、E♭、G，因为三音从大三度变成小三度。</span>
    </div>
  </section>
}
