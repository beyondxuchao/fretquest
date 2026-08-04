import { type CSSProperties } from 'react'
import { Play, Square } from 'lucide-react'

type Props = {
  bpm: number
  playing: boolean
  beat: number
  onBpmChange: (bpm: number) => void
  onPlayingChange: (playing: boolean) => void
}

export function Metronome({ bpm, playing, beat, onBpmChange, onPlayingChange }: Props) {
  return <section className="metronome-page">
    <div className="metronome-card metronome-standalone">
      <div className={`metronome-body ${playing ? 'swinging' : ''}`} style={{ '--swing-duration': `${60 / bpm}s` } as CSSProperties}>
        <i/><b/><em/>
      </div>
      <div>
        <span>TRADITIONAL METRONOME</span>
        <h3>传统节拍器 · {bpm} BPM</h3>
        <p>每小节第一拍为重音；摆锤左右各一次正好是一拍。</p>
        <div className="metro-beats">{[0, 1, 2, 3].map((item) => <i key={item} className={playing && beat === item ? 'active' : ''}>{item + 1}</i>)}</div>
        <div className="metro-tempo">
          <button onClick={() => onBpmChange(Math.max(40, bpm - 5))}>-</button>
          <strong>{bpm}<small>BPM</small></strong>
          <button onClick={() => onBpmChange(Math.min(240, bpm + 5))}>+</button>
        </div>
      </div>
      <button className={playing ? 'metro-stop' : 'metro-start'} onClick={() => onPlayingChange(!playing)}>
        {playing ? <><Square size={14}/> 停止</> : <><Play size={15}/> 开始节拍</>}
      </button>
    </div>
    <div className="metronome-tip"><strong>练琴建议</strong><span>从 70 BPM 开始，每次连续稳定演奏 4 小节后再提升 5 BPM。</span></div>
  </section>
}
