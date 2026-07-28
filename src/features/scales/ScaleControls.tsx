import { Play, Square, X } from 'lucide-react'

type ScaleOption = { value: string; name: string }

type ScaleControlsProps = {
  notes: readonly string[]
  root: number
  scales: ScaleOption[]
  scaleType: string
  playbackActive: boolean
  bpm: number
  bpmDraft: string
  metronome: boolean
  focus: boolean
  sequenceActive: boolean
  sequenceAvailable: boolean
  descending: boolean
  error: string
  onRootChange: (root: number) => void
  onScaleTypeChange: (type: string) => void
  onTogglePlayback: () => void
  onBpmDraftChange: (value: string) => void
  onBpmCommit: (value: string) => void
  onMetronomeChange: (enabled: boolean) => void
  onToggleFocus: () => void
  onToggleSequence: () => void
  onToggleDirection: () => void
}

export function ScaleControls({
  notes,
  root,
  scales,
  scaleType,
  playbackActive,
  bpm,
  bpmDraft,
  metronome,
  focus,
  sequenceActive,
  sequenceAvailable,
  descending,
  error,
  onRootChange,
  onScaleTypeChange,
  onTogglePlayback,
  onBpmDraftChange,
  onBpmCommit,
  onMetronomeChange,
  onToggleFocus,
  onToggleSequence,
  onToggleDirection,
}: ScaleControlsProps) {
  return <div className="scale-controls">
    <label>根音<select value={root} onChange={(event) => onRootChange(Number(event.target.value))}>{notes.map((note, index) => <option key={note} value={index}>{note}</option>)}</select></label>
    <label>音阶<select value={scaleType} onChange={(event) => onScaleTypeChange(event.target.value)}>{scales.map((scale) => <option key={scale.value} value={scale.value}>{scale.name}</option>)}</select></label>
    <button className={playbackActive ? 'sequence-active' : ''} onClick={onTogglePlayback}>{playbackActive ? <><Square size={15}/> 暂停播放</> : <><Play size={15}/> 上行＋下行</>}</button>
    <div className="scale-bpm"><span>BPM</span><div className="scale-bpm-stepper"><button aria-label="降低 BPM" onClick={() => onBpmCommit(String(bpm - 5))}>−</button><input inputMode="numeric" value={bpmDraft} onChange={(event) => onBpmDraftChange(event.target.value.replace(/\D/g, ''))} onBlur={(event) => onBpmCommit(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} aria-label="播放速度 BPM"/><button aria-label="提高 BPM" onClick={() => onBpmCommit(String(bpm + 5))}>＋</button></div></div>
    <label className="scale-metronome"><input type="checkbox" checked={metronome} onChange={(event) => onMetronomeChange(event.target.checked)}/><i/><span>节拍器</span></label>
    <button className="scale-focus-btn" onClick={onToggleFocus}>{focus ? <><X size={15}/> 退出全屏</> : <>全屏跟练</>}</button>
    <button className={sequenceActive ? 'sequence-active' : ''} disabled={!sequenceAvailable} onClick={onToggleSequence}>{sequenceActive ? '结束顺序练习' : '开始顺序练习'}</button>
    <button className="direction-btn" onClick={onToggleDirection}>{descending ? '下行' : '上行'}</button>
    <div className="scale-legend"><span><i className="root-dot"/>根音</span><span><i/>音阶音</span></div>
    {error && <small className="scale-playback-error">{error}</small>}
  </div>
}
