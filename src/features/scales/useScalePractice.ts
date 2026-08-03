import { useMemo, useRef, useState } from 'react'
import { findScaleFingering } from '../../lib/scaleFingering'
import { NOTES, OPEN_MIDI, SCALES, noteAt } from '../../lib/musicTheory'
import type { ScaleType } from '../../lib/musicTheory'
import type { FretPosition } from '../../lib/scaleFingering'
import type { Feedback } from '../../types'

type UseScalePracticeOptions = {
  scaleRoot: number
  scaleType: ScaleType
  playGuitar: (string: number, fret: number) => void
  playMetronomeClick: (accent: boolean) => void
  setFeedback: (feedback: Feedback | ((current: Feedback) => Feedback)) => void
}

export function useScalePractice({ scaleRoot, scaleType, playGuitar, playMetronomeClick, setFeedback }: UseScalePracticeOptions) {
  const [scaleSequenceActive, setScaleSequenceActive] = useState(false)
  const [scaleSequenceStep, setScaleSequenceStep] = useState(0)
  const [scaleDescending, setScaleDescending] = useState(false)
  const [scalePlaybackPosition, setScalePlaybackPosition] = useState<FretPosition | null>(null)
  const [scalePlaybackStart, setScalePlaybackStart] = useState<FretPosition | null>(null)
  const [scalePlaybackActive, setScalePlaybackActive] = useState(false)
  const [scalePlaybackError, setScalePlaybackError] = useState('')
  const [scalePlaybackBpm, setScalePlaybackBpm] = useState(90)
  const [scalePlaybackBpmDraft, setScalePlaybackBpmDraft] = useState('90')
  const [scalePlaybackMetronome, setScalePlaybackMetronome] = useState(false)
  const scalePlaybackTimersRef = useRef<number[]>([])

  const scaleNotes = useMemo(() => new Set(SCALES[scaleType].intervals.map((interval) => NOTES[(scaleRoot + interval) % 12])), [scaleRoot, scaleType])
  const scaleSequence = useMemo(() => {
    const all = OPEN_MIDI.flatMap((openMidi, string) => Array.from({length:18}, (_, index) => ({ string, fret:index + 1, midi:openMidi + index + 1 })))
    const roots = all.filter((position) => position.string === 5 && position.midi % 12 === scaleRoot && position.fret <= 12)
    for (const root of roots) {
      const targetMidis = [...SCALES[scaleType].intervals,12].map((interval)=>root.midi+interval)
      const positions = [root]
      let current = root
      let notesOnCurrentString = 1
      for (const midi of targetMidis.slice(1)) {
        const candidates = all.filter((position) => position.midi === midi && position.string <= current.string && (position.string !== current.string || notesOnCurrentString < 3))
        const next = candidates.sort((a,b) => {
          const score = (position: typeof a) => (position.string === current.string ? 0 : 10) + Math.abs(position.fret - current.fret) + (current.string - position.string) * 2
          return score(a) - score(b)
        })[0]
        if (!next) { positions.length = 0; break }
        notesOnCurrentString = next.string === current.string ? notesOnCurrentString + 1 : 1
        positions.push(next); current = next
      }
      if (positions.length === targetMidis.length) return positions
    }
    return []
  }, [scaleRoot, scaleType])
  const orderedScaleSequence = scaleDescending ? [...scaleSequence].reverse() : scaleSequence

  const handleScaleSequenceClick = (string:number,fret:number) => {
    playGuitar(string,fret)
    if (!scaleSequenceActive) return
    const expected = orderedScaleSequence[scaleSequenceStep]
    if (!expected || expected.string !== string || expected.fret !== fret) { setFeedback({string,fret,correct:false}); window.setTimeout(()=>setFeedback(null),350); return }
    setFeedback({string,fret,correct:true})
    if (scaleSequenceStep + 1 >= orderedScaleSequence.length) { setScaleSequenceActive(false); setScaleSequenceStep(0); window.setTimeout(()=>setFeedback(null),500) }
    else { setScaleSequenceStep((step)=>step+1); window.setTimeout(()=>setFeedback(null),220) }
  }

  const stopScalePlayback = () => {
    scalePlaybackTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    scalePlaybackTimersRef.current = []
    setScalePlaybackActive(false)
    setScalePlaybackPosition(null)
  }

  const commitScalePlaybackBpm = (raw: string) => {
    const bpm = Math.max(40, Math.min(240, Number(raw) || 90))
    setScalePlaybackBpm(bpm); setScalePlaybackBpmDraft(String(bpm))
  }

  const playCurrentScale = () => {
    stopScalePlayback()
    const validSelectedStart = scalePlaybackStart && noteAt(scalePlaybackStart.string, scalePlaybackStart.fret) === NOTES[scaleRoot] ? scalePlaybackStart : null
    const start = validSelectedStart || scaleSequence[0]
    if (!start) { setScalePlaybackError('请先点击指板上的根音作为起点。'); return }
    const ascending = findScaleFingering({ start, intervals: SCALES[scaleType].intervals, openMidi: OPEN_MIDI })
    if (!ascending) { setScalePlaybackError('从这个根音无法在 0–15 品内完成连续上行八度，请换一个根音。'); return }
    setScalePlaybackError('')
    const path = [...ascending, ...ascending.slice(0, -1).reverse()]
    const beatMs = 60000 / scalePlaybackBpm
    const playStep = (position: FretPosition, index: number) => {
      setScalePlaybackPosition(position)
      if (scalePlaybackMetronome) playMetronomeClick(index % 4 === 0)
      playGuitar(position.string, position.fret)
    }
    const scheduleCycle = () => {
      if (path[0]) playStep(path[0], 0)
      path.slice(1).forEach((position, index) => scalePlaybackTimersRef.current.push(window.setTimeout(() => playStep(position, index + 1), (index + 1) * beatMs)))
      scalePlaybackTimersRef.current.push(window.setTimeout(scheduleCycle, path.length * beatMs))
    }
    setScalePlaybackActive(true)
    scheduleCycle()
  }

  return {
    scaleSequenceActive, setScaleSequenceActive,
    scaleSequenceStep, setScaleSequenceStep,
    scaleDescending, setScaleDescending,
    scalePlaybackPosition,
    scalePlaybackStart, setScalePlaybackStart,
    scalePlaybackActive,
    scalePlaybackError, setScalePlaybackError,
    scalePlaybackBpm,
    scalePlaybackBpmDraft, setScalePlaybackBpmDraft,
    scalePlaybackMetronome, setScalePlaybackMetronome,
    scaleNotes,
    scaleSequence,
    orderedScaleSequence,
    handleScaleSequenceClick,
    stopScalePlayback,
    commitScalePlaybackBpm,
    playCurrentScale,
  }
}
