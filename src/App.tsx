import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cable, ChevronDown, Download, Flame, Guitar, Mic, MicOff, Play, RotateCcw, Settings2, Smartphone, Sparkles, Square, Timer, Trash2, Trophy, Volume2, X } from 'lucide-react'

const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const OPEN_NOTES = [4, 11, 7, 2, 9, 4] // high E → low E
const OPEN_MIDI = [64, 59, 55, 50, 45, 40] // E4 → E2
const SAMPLE_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const STRING_NAMES = ['1弦 E', '2弦 B', '3弦 G', '4弦 D', '5弦 A', '6弦 E']
const MARKERS = new Set([3, 5, 7, 9, 12])
const PREFERENCES_KEY = 'fretquest.preferences.v1'

type Preferences = {
  minFret: number
  maxFret: number
  activeStrings: boolean[]
  fretboardStyle: FretboardStyle
  soundOn: boolean
  noiseGate: number
  stability: number
}

function loadPreferences(): Partial<Preferences> {
  try { return JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}') as Partial<Preferences> }
  catch { return {} }
}

type PositionStats = Record<string, { correct: number; wrong: number; averageMs?: number; lastSeen?: number }>
type TrainingType = 'locate' | 'identify' | 'stringLocate' | 'allNotes' | 'octave' | 'interval' | 'intervalShape' | 'earLocate' | 'adaptive' | 'scaleDegree' | 'chordTone' | 'arpeggio'
function loadPositionStats(): PositionStats {
  try { return JSON.parse(localStorage.getItem('fretquest.positionStats.v1') || '{}') as PositionStats }
  catch { return {} }
}

type Status = 'idle' | 'playing' | 'finished'
type Feedback = { string: number; fret: number; correct: boolean } | null
type InputState = 'off' | 'requesting' | 'listening' | 'error'
type FretboardStyle = 'practice' | 'realistic' | 'ebony' | 'maple'
type AppMode = 'training' | 'learning' | 'scales' | 'theory' | 'chords' | 'recorder' | 'drums'
const SCALES = {
  major: { name: '大调音阶', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: '自然小调', intervals: [0, 2, 3, 5, 7, 8, 10] },
  majorPentatonic: { name: '大调五声音阶', intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { name: '小调五声音阶', intervals: [0, 3, 5, 7, 10] },
  blues: { name: '布鲁斯音阶', intervals: [0, 3, 5, 6, 7, 10] },
} satisfies Record<string, { name: string; intervals: number[] }>
type ScaleType = keyof typeof SCALES
type SolfegeDirection = 'noteToNumber' | 'numberToNote' | 'noteToName' | 'nameToNote' | 'numberToName' | 'nameToNumber'
const CHORD_TYPES = {
  major: { name: '大三和弦', suffix: '', formula: '1 · 3 · 5', intervals: [0, 4, 7] },
  minor: { name: '小三和弦', suffix: 'm', formula: '1 · ♭3 · 5', intervals: [0, 3, 7] },
  diminished: { name: '减三和弦', suffix: 'dim', formula: '1 · ♭3 · ♭5', intervals: [0, 3, 6] },
  augmented: { name: '增三和弦', suffix: 'aug', formula: '1 · 3 · ♯5', intervals: [0, 4, 8] },
  sus2: { name: '挂二和弦', suffix: 'sus2', formula: '1 · 2 · 5', intervals: [0, 2, 7] },
  sus4: { name: '挂四和弦', suffix: 'sus4', formula: '1 · 4 · 5', intervals: [0, 5, 7] },
  dominant7: { name: '属七和弦', suffix: '7', formula: '1 · 3 · 5 · ♭7', intervals: [0, 4, 7, 10] },
  major7: { name: '大七和弦', suffix: 'maj7', formula: '1 · 3 · 5 · 7', intervals: [0, 4, 7, 11] },
  minor7: { name: '小七和弦', suffix: 'm7', formula: '1 · ♭3 · 5 · ♭7', intervals: [0, 3, 7, 10] },
} as const
type ChordType = keyof typeof CHORD_TYPES
type KeyMode = 'major' | 'minor'
const DIAGRAM_OPEN = [4, 9, 2, 7, 11, 4] // low E → high E
const DEGREE_PITCH = [0, 0, 2, 4, 5, 7, 9, 11]
const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]
const PROGRESSIONS = [
  { label: '流行', formula: 'I–V–vi–IV', degrees: [0, 4, 5, 3] },
  { label: '经典', formula: 'I–vi–IV–V', degrees: [0, 5, 3, 4] },
  { label: '爵士', formula: 'ii–V–I', degrees: [1, 4, 0] },
  { label: '民谣', formula: 'I–IV–V–I', degrees: [0, 3, 4, 0] },
]
const FRET_POSITIONS = [
  { label: '开放', start: 1, end: 4 },
  { label: '3 把', start: 3, end: 6 },
  { label: '5 把', start: 5, end: 8 },
  { label: '7 把', start: 7, end: 10 },
  { label: '9 把', start: 9, end: 12 },
  { label: '12 把', start: 12, end: 15 },
]

function parseChordDegrees(input: string) {
  const normalized = input.replace(/♭/g, 'b').replace(/♯/g, '#').replace(/[，,·\s]/g, '')
  const tokens = normalized.match(/[#b]?[1-7]/g) || []
  if (tokens.length < 3 || tokens.length > 4 || tokens.join('') !== normalized) return null
  const pitches = tokens.map((token) => {
    const degree = Number(token[token.length - 1])
    const alteration = token.startsWith('#') ? 1 : token.startsWith('b') ? -1 : 0
    return (DEGREE_PITCH[degree] + alteration + 12) % 12
  })
  const root = pitches[0]
  const intervals = pitches.map((pitch) => (pitch - root + 12) % 12)
  if (new Set(pitches).size !== pitches.length) return null
  const match = Object.entries(CHORD_TYPES).find(([, value]) => value.intervals.length === intervals.length && value.intervals.every((interval, index) => interval === intervals[index]))
  return { tokens, pitches, root, intervals, matchedType: match?.[0] as ChordType | undefined }
}

function deriveVoicings(root: number, intervals: readonly number[]) {
  const tones = new Set(intervals.map((i) => (root + i) % 12))
  const results: Array<Array<number | null>> = []
  const seen = new Set<string>()
  for (let start = 0; start <= 9 && results.length < 12; start++) {
    const end = start === 0 ? 4 : start + 3
    const choices = DIAGRAM_OPEN.map((open) => {
      const frets: Array<number | null> = [null]
      for (let fret = start; fret <= end; fret++) if (tones.has((open + fret) % 12)) frets.push(fret)
      return frets
    })
    const walk = (string: number, shape: Array<number | null>) => {
      if (results.length >= 12) return
      if (string === 6) {
        const sounding = shape.filter((f): f is number => f !== null)
        if (sounding.length < 4) return
        const present = new Set(shape.map((f, i) => f === null ? -1 : (DIAGRAM_OPEN[i] + f) % 12))
        if ([...tones].some((tone) => !present.has(tone))) return
        const bassString = shape.findIndex((f) => f !== null)
        if (bassString < 0 || (DIAGRAM_OPEN[bassString] + (shape[bassString] || 0)) % 12 !== root) return
        const pressed = sounding.filter((f) => f > 0)
        const uniqueFrets = new Set(pressed)
        if (uniqueFrets.size > 4) return
        const key = shape.join(',')
        if (!seen.has(key)) { seen.add(key); results.push([...shape]) }
        return
      }
      choices[string].forEach((fret) => walk(string + 1, [...shape, fret]))
    }
    walk(0, [])
  }
  return results
}
const INTERVALS = [
  ['纯一度', 'P1', 0], ['小二度', 'm2', 1], ['大二度', 'M2', 2], ['小三度', 'm3', 3],
  ['大三度', 'M3', 4], ['纯四度', 'P4', 5], ['增四度', 'TT', 6], ['纯五度', 'P5', 7],
  ['小六度', 'm6', 8], ['大六度', 'M6', 9], ['小七度', 'm7', 10], ['大七度', 'M7', 11], ['纯八度', 'P8', 12],
] as const
const SOLFEGE = [
  { note: 'C', number: '1', name: 'Do', noteIndex: 0 }, { note: 'D', number: '2', name: 'Re', noteIndex: 2 },
  { note: 'E', number: '3', name: 'Mi', noteIndex: 4 }, { note: 'F', number: '4', name: 'Fa', noteIndex: 5 },
  { note: 'G', number: '5', name: 'Sol', noteIndex: 7 }, { note: 'A', number: '6', name: 'La', noteIndex: 9 },
  { note: 'B', number: '7', name: 'Si', noteIndex: 11 },
] as const

function noteAt(string: number, fret: number) {
  return NOTES[(OPEN_NOTES[string] + fret) % 12]
}

function App() {
  const initialPreferences = useMemo(loadPreferences, [])
  const [appMode, setAppMode] = useState<AppMode>('training')
  const [drumBpm, setDrumBpm] = useState(96)
  const [drumPlaying, setDrumPlaying] = useState(false)
  const [metronomePlaying, setMetronomePlaying] = useState(false)
  const [metronomeBeat, setMetronomeBeat] = useState(0)
  const [drumStep, setDrumStep] = useState(-1)
  const [drumPattern, setDrumPattern] = useState({ kick: [true,false,false,false,true,false,false,false,true,false,false,false,true,false,false,false], snare: [false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false], hat: [true,false,true,false,true,false,true,false,true,false,true,false,true,false,true,false] })
  const [learningView, setLearningView] = useState<'explore' | 'ear' | 'interval' | 'scales' | 'theory'>('explore')
  const [learningIntervalSemitones, setLearningIntervalSemitones] = useState(7)
  const [learningIntervalAnchorString, setLearningIntervalAnchorString] = useState(5)
  const [selectedEarNote, setSelectedEarNote] = useState(0)
  const [earLesson, setEarLesson] = useState<'pitch' | 'relative' | 'fretboard' | 'library'>('pitch')
  const [learningEarPosition, setLearningEarPosition] = useState({ string: 5, fret: 1 })
  const [learningEarRevealed, setLearningEarRevealed] = useState(false)
  const [trainingType, setTrainingType] = useState<TrainingType>('locate')
  const [trainingMenu, setTrainingMenu] = useState<'basic' | 'relation' | 'applied' | null>(null)
  const [questionPosition, setQuestionPosition] = useState({ string: 0, fret: 1 })
  const [targetString, setTargetString] = useState(0)
  const [targetInterval, setTargetInterval] = useState(7)
  const [trainingGoalOffset, setTrainingGoalOffset] = useState(0)
  const [arpeggioPath, setArpeggioPath] = useState<Array<{string:number;fret:number}>>([])
  const [arpeggioStep, setArpeggioStep] = useState(0)
  const [earPromptId, setEarPromptId] = useState(0)
  const [foundPositions, setFoundPositions] = useState<string[]>([])
  const [scaleSequenceActive, setScaleSequenceActive] = useState(false)
  const [scaleSequenceStep, setScaleSequenceStep] = useState(0)
  const [scaleDescending, setScaleDescending] = useState(false)
  const [scaleRoot, setScaleRoot] = useState(0)
  const [scaleType, setScaleType] = useState<ScaleType>('major')
  const [theoryLesson, setTheoryLesson] = useState<'notes' | 'intervals' | 'solfege'>('notes')
  const [intervalRoot, setIntervalRoot] = useState(0)
  const [selectedInterval, setSelectedInterval] = useState(7)
  const [chordRoot, setChordRoot] = useState(0)
  const [chordType, setChordType] = useState<ChordType>('major')
  const [keyRoot, setKeyRoot] = useState(0)
  const [keyMode, setKeyMode] = useState<KeyMode>('major')
  const [progressionIndex, setProgressionIndex] = useState(0)
  const [selectedChordNotes, setSelectedChordNotes] = useState<number[]>([])
  const [harmonyToolsOpen, setHarmonyToolsOpen] = useState(false)
  const [chordInput, setChordInput] = useState('135')
  const [customChord, setCustomChord] = useState<ReturnType<typeof parseChordDegrees>>(null)
  const [chordInputError, setChordInputError] = useState('')
  const [solfegeQuestion, setSolfegeQuestion] = useState(0)
  const [solfegeDirection, setSolfegeDirection] = useState<SolfegeDirection>('noteToNumber')
  const [solfegeScore, setSolfegeScore] = useState(0)
  const [solfegeStreak, setSolfegeStreak] = useState(0)
  const [solfegeFeedback, setSolfegeFeedback] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [target, setTarget] = useState('C')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [timeLeft, setTimeLeft] = useState(60)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [positionStats, setPositionStats] = useState<PositionStats>(loadPositionStats)
  const [minFret, setMinFret] = useState(() => initialPreferences.minFret ?? 1)
  const [maxFret, setMaxFret] = useState(() => initialPreferences.maxFret ?? 12)
  const [activeStrings, setActiveStrings] = useState(() => initialPreferences.activeStrings?.length === 6 ? initialPreferences.activeStrings : [true, true, true, true, true, true])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focusTraining, setFocusTraining] = useState(false)
  const [fretboardStyle, setFretboardStyle] = useState<FretboardStyle>(() => initialPreferences.fretboardStyle ?? 'practice')
  const [soundOn, setSoundOn] = useState(() => initialPreferences.soundOn ?? true)
  const [inputState, setInputState] = useState<InputState>('off')
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [detectedNote, setDetectedNote] = useState<string | null>(null)
  const [detectedMidi, setDetectedMidi] = useState<number | null>(null)
  const [detectedHz, setDetectedHz] = useState(0)
  const [detectedCents, setDetectedCents] = useState(0)
  const [pitchStable, setPitchStable] = useState(false)
  const [inputLevel, setInputLevel] = useState(0)
  const [inputError, setInputError] = useState('')
  const [calibrationOpen, setCalibrationOpen] = useState(false)
  const [liveFretboardMap, setLiveFretboardMap] = useState(false)
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'ready'>('idle')
  const [recordingUrl, setRecordingUrl] = useState('')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingMime, setRecordingMime] = useState('audio/webm')
  const [noiseGate, setNoiseGate] = useState(() => initialPreferences.noiseGate ?? 8)
  const [stability, setStability] = useState(() => initialPreferences.stability ?? 7)
  const timerRef = useRef<number | null>(null)
  const audioRef = useRef<{ context: AudioContext; stream: MediaStream; raf: number } | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const questionStartedRef = useRef(Date.now())
  const answerRef = useRef<(note: string) => void>(() => {})
  const targetRef = useRef(target)
  const statusRef = useRef<Status>(status)
  const noiseGateRef = useRef(noiseGate)
  const stabilityRef = useRef(stability)
  const playbackContextRef = useRef<AudioContext | null>(null)
  const guitarSampleCache = useRef(new Map<number, AudioBuffer>())
  const drumTimerRef = useRef<number | null>(null)
  const metronomeTimerRef = useRef<number | null>(null)

  const availableNotes = useMemo(() => {
    const found = new Set<string>()
    activeStrings.forEach((on, string) => {
      if (on) for (let fret = minFret; fret <= maxFret; fret++) found.add(noteAt(string, fret))
    })
    return [...found]
  }, [activeStrings, minFret, maxFret])

  useEffect(() => {
    const preferences: Preferences = { minFret, maxFret, activeStrings, fretboardStyle, soundOn, noiseGate, stability }
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)) } catch { /* Storage may be unavailable in private mode. */ }
  }, [minFret, maxFret, activeStrings, fretboardStyle, soundOn, noiseGate, stability])

  useEffect(() => {
    try { localStorage.setItem('fretquest.positionStats.v1', JSON.stringify(positionStats)) } catch { /* Ignore unavailable storage. */ }
  }, [positionStats])

  const nextTarget = useCallback((current?: string) => {
    const pool = availableNotes.filter((note) => note !== current)
    const next = pool[Math.floor(Math.random() * pool.length)] || availableNotes[0] || 'C'
    setTarget(next)
  }, [availableNotes])

  const prepareQuestion = useCallback((current?: string) => {
    const enabled = activeStrings.map((on, index) => on ? index : -1).filter((index) => index >= 0)
    const string = enabled[Math.floor(Math.random() * enabled.length)] ?? 0
    const fret = minFret + Math.floor(Math.random() * (maxFret - minFret + 1))
    setFoundPositions([]); setArpeggioStep(0); questionStartedRef.current = Date.now()
    if (trainingType === 'adaptive') {
      const positions = enabled.flatMap((s)=>Array.from({length:maxFret-minFret+1},(_,i)=>({string:s,fret:minFret+i})))
      const weighted = positions.map((position)=>{ const stat=positionStats[`${position.string}-${position.fret}`]; const total=(stat?.correct||0)+(stat?.wrong||0); const error=total?(stat?.wrong||0)/total:.45; const slow=Math.min(1,(stat?.averageMs||2500)/6000); const stale=Math.min(1,(Date.now()-(stat?.lastSeen||0))/(1000*60*60*24*7)); return {position,weight:1+error*5+slow*2+stale} })
      const totalWeight=weighted.reduce((sum,item)=>sum+item.weight,0); let roll=Math.random()*totalWeight; const selected=weighted.find((item)=>(roll-=item.weight)<=0)?.position||{string,fret}
      setQuestionPosition(selected); setTargetString(selected.string); setTarget(noteAt(selected.string,selected.fret))
    } else if (trainingType === 'scaleDegree' || trainingType === 'chordTone') {
      const offsets = trainingType === 'scaleDegree' ? SCALES[scaleType].intervals : [...CHORD_TYPES[chordType].intervals]
      const offset = offsets[Math.floor(Math.random()*offsets.length)] || 0
      const root = trainingType === 'scaleDegree' ? scaleRoot : chordRoot
      const pitch = (root+offset)%12
      const candidates=enabled.flatMap((s)=>Array.from({length:maxFret-minFret+1},(_,i)=>({string:s,fret:minFret+i}))).filter((p)=>(OPEN_MIDI[p.string]+p.fret)%12===pitch)
      const selected=candidates[Math.floor(Math.random()*candidates.length)]||{string,fret}
      setTrainingGoalOffset(offset); setTargetString(selected.string); setQuestionPosition(selected); setTarget(NOTES[pitch])
    } else if (trainingType === 'arpeggio') {
      const tones=new Set(CHORD_TYPES[chordType].intervals.map((offset)=>(chordRoot+offset)%12))
      const orderedStrings=[...enabled].sort((a,b)=>OPEN_MIDI[a]-OPEN_MIDI[b]); const path:Array<{string:number;fret:number;midi:number}>=[]; let lastMidi=-1
      orderedStrings.forEach((s,index)=>{ const candidates=Array.from({length:maxFret-minFret+1},(_,i)=>({string:s,fret:minFret+i,midi:OPEN_MIDI[s]+minFret+i})).filter((p)=>tones.has(p.midi%12)&&p.midi>lastMidi).sort((a,b)=>a.midi-b.midi); const rootCandidate=index===0?candidates.find((p)=>p.midi%12===chordRoot):undefined; const selected=rootCandidate||candidates[0]; if(selected){path.push(selected);lastMidi=selected.midi} })
      const playable=path.map(({string,fret})=>({string,fret})); setArpeggioPath(playable); setQuestionPosition(playable[0]||{string,fret}); setTarget(`${NOTES[chordRoot]}${CHORD_TYPES[chordType].suffix}`)
    } else if (trainingType === 'identify' || trainingType === 'earLocate') {
      setQuestionPosition({ string, fret }); setTarget(noteAt(string, fret))
      if (trainingType === 'earLocate') setEarPromptId((id) => id + 1)
    } else if (trainingType === 'octave' || trainingType === 'interval' || trainingType === 'intervalShape') {
      const interval = trainingType === 'octave' ? 12 : [3,4,5,7,10][Math.floor(Math.random()*5)]
      setTargetInterval(interval)
      const candidates: Array<{string:number;fret:number}> = []
      enabled.forEach((s) => { for(let f=minFret;f<=maxFret;f++){ const midi=OPEN_MIDI[s]+f; const targetStrings=trainingType==='intervalShape' ? [s-1] : enabled; if(targetStrings.some((s2)=>s2>=0&&enabled.includes(s2)&&Array.from({length:maxFret-minFret+1},(_,i)=>i+minFret).some((f2)=>OPEN_MIDI[s2]+f2===midi+interval))) candidates.push({string:s,fret:f}) } })
      const anchor = candidates[Math.floor(Math.random()*candidates.length)] || {string,fret}
      setQuestionPosition(anchor); setTargetString(trainingType==='intervalShape' ? anchor.string-1 : anchor.string); setTarget(noteAt(anchor.string,anchor.fret))
    } else if (trainingType === 'stringLocate') {
      setTargetString(string)
      const notes = Array.from({length:maxFret-minFret+1}, (_, index) => noteAt(string, index + minFret)).filter((note, index, all) => all.indexOf(note) === index && note !== current)
      setTarget(notes[Math.floor(Math.random() * notes.length)] || noteAt(string, fret))
    } else nextTarget(current)
  }, [activeStrings, minFret, maxFret, nextTarget, trainingType, positionStats, scaleType, scaleRoot, chordType, chordRoot])

  const playTone = (note: string, good: boolean) => {
    if (!soundOn) return
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const semitone = NOTES.indexOf(note)
    osc.frequency.value = 261.63 * Math.pow(2, semitone / 12)
    osc.type = good ? 'sine' : 'triangle'
    gain.gain.setValueAtTime(good ? 0.09 : 0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (good ? 0.22 : 0.12))
    osc.connect(gain).connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.24)
  }

  const playDrumHit = (kind: 'kick' | 'snare' | 'hat') => {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = playbackContextRef.current || new AudioContextClass()
    playbackContextRef.current = ctx
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    if (kind === 'kick') { const osc=ctx.createOscillator(); const gain=ctx.createGain(); osc.type='sine'; osc.frequency.setValueAtTime(150,now); osc.frequency.exponentialRampToValueAtTime(48,now+.13); gain.gain.setValueAtTime(.55,now); gain.gain.exponentialRampToValueAtTime(.001,now+.18); osc.connect(gain).connect(ctx.destination); osc.start(now);osc.stop(now+.19); return }
    const length=kind==='snare' ? .16 : .055; const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate); const data=buffer.getChannelData(0); for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length); const source=ctx.createBufferSource();const filter=ctx.createBiquadFilter();const gain=ctx.createGain(); filter.type='highpass';filter.frequency.value=kind==='snare'?1200:6500;gain.gain.setValueAtTime(kind==='snare' ? .24 : .11,now);gain.gain.exponentialRampToValueAtTime(.001,now+length);source.buffer=buffer;source.connect(filter).connect(gain).connect(ctx.destination);source.start(now)
  }

  const playMetronomeClick = (accent: boolean) => {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = playbackContextRef.current || new AudioContextClass(); playbackContextRef.current = ctx
    if (ctx.state === 'suspended') void ctx.resume()
    const osc=ctx.createOscillator(), gain=ctx.createGain(), now=ctx.currentTime
    osc.type='square';osc.frequency.value=accent?1760:1120;gain.gain.setValueAtTime(accent ? .22 : .12,now);gain.gain.exponentialRampToValueAtTime(.001,now+.045);osc.connect(gain).connect(ctx.destination);osc.start(now);osc.stop(now+.05)
  }

  useEffect(() => {
    if (!drumPlaying) { if (drumTimerRef.current) window.clearInterval(drumTimerRef.current); drumTimerRef.current=null; setDrumStep(-1); return }
    const tick=()=>setDrumStep((previous)=>{const next=(previous+1)%16;if(drumPattern.kick[next])playDrumHit('kick');if(drumPattern.snare[next])playDrumHit('snare');if(drumPattern.hat[next])playDrumHit('hat');return next})
    tick(); drumTimerRef.current=window.setInterval(tick, 60000 / drumBpm / 4)
    return ()=>{if(drumTimerRef.current)window.clearInterval(drumTimerRef.current)}
  }, [drumBpm, drumPattern, drumPlaying])

  useEffect(() => {
    if (!metronomePlaying) { if(metronomeTimerRef.current)window.clearInterval(metronomeTimerRef.current);metronomeTimerRef.current=null;setMetronomeBeat(0);return }
    const tick=()=>setMetronomeBeat((beat)=>{const next=(beat+1)%4;playMetronomeClick(next===0);return next})
    playMetronomeClick(true);metronomeTimerRef.current=window.setInterval(tick,60000/drumBpm)
    return ()=>{if(metronomeTimerRef.current)window.clearInterval(metronomeTimerRef.current)}
  }, [drumBpm, metronomePlaying])

  const playGuitar = (string: number, fret: number) => {
    if (!soundOn) return
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const midi = OPEN_MIDI[string] + fret
    const soundfont = (window as unknown as { MIDI?: { Soundfont?: { acoustic_guitar_steel?: Record<string, string> } } }).MIDI?.Soundfont?.acoustic_guitar_steel
    const sampleKey = `${SAMPLE_NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
    const sampleUri = soundfont?.[sampleKey]
    const ctx = playbackContextRef.current || new AudioContextClass()
    playbackContextRef.current = ctx
    if (ctx.state === 'suspended') void ctx.resume()

    const playSample = (buffer: AudioBuffer) => {
      const source = ctx.createBufferSource()
      const gain = ctx.createGain()
      source.buffer = buffer
      gain.gain.setValueAtTime(.42, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + Math.min(buffer.duration, 4.5))
      source.connect(gain).connect(ctx.destination)
      source.start()
    }
    const cached = guitarSampleCache.current.get(midi)
    if (cached) { playSample(cached); return }
    if (sampleUri) {
      void fetch(sampleUri).then((response) => response.arrayBuffer()).then((data) => ctx.decodeAudioData(data)).then((buffer) => {
        guitarSampleCache.current.set(midi, buffer); playSample(buffer)
      }).catch(() => playSynthGuitar(ctx, midi))
      return
    }
    playSynthGuitar(ctx, midi)
  }

  const playSynthGuitar = (ctx: AudioContext, midi: number) => {
    const frequency = 440 * Math.pow(2, (midi - 69) / 12)
    const duration = Math.max(1.3, 2.7 - frequency / 700)
    const frameCount = Math.ceil(ctx.sampleRate * duration)
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    const period = Math.max(2, Math.round(ctx.sampleRate / frequency))
    const delayLine = new Float32Array(period)
    for (let i = 0; i < period; i++) {
      const pickPosition = i / period
      const envelope = Math.sin(Math.PI * Math.min(1, pickPosition * 3.2))
      delayLine[i] = (Math.random() * 2 - 1) * envelope
    }
    let previous = 0
    for (let i = 0; i < frameCount; i++) {
      const index = i % period
      const current = delayLine[index]
      const next = delayLine[(index + 1) % period]
      const filtered = .996 * (current + next) * .5
      delayLine[index] = filtered
      previous = previous * .08 + current * .92
      data[i] = previous * Math.exp(-i / (ctx.sampleRate * duration * .72))
    }
    const source = ctx.createBufferSource()
    const body = ctx.createBiquadFilter()
    const warmth = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    body.type = 'peaking'; body.frequency.value = 190; body.Q.value = 1.1; body.gain.value = 5
    warmth.type = 'lowpass'; warmth.frequency.value = 3600; warmth.Q.value = .45
    gain.gain.setValueAtTime(.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration)
    source.buffer = buffer
    source.connect(body).connect(warmth).connect(gain).connect(ctx.destination)
    source.start(); source.stop(ctx.currentTime + duration)
  }

  const nextLearningEarNote = () => {
    const enabled = activeStrings.map((on,index)=>on?index:-1).filter((index)=>index>=0)
    const string = enabled[Math.floor(Math.random()*enabled.length)] ?? 0
    const fret = minFret + Math.floor(Math.random()*(maxFret-minFret+1))
    setLearningEarPosition({string,fret}); setLearningEarRevealed(false); setFeedback(null)
    window.setTimeout(()=>playGuitar(string,fret),120)
  }

  useEffect(() => {
    if (status !== 'playing' || trainingType !== 'earLocate' || earPromptId === 0) return
    const replayTimer = window.setTimeout(() => playGuitar(questionPosition.string, questionPosition.fret), 180)
    return () => clearTimeout(replayTimer)
  }, [earPromptId, questionPosition.fret, questionPosition.string, status, trainingType])

  const clearRecording = useCallback(() => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    setRecordingUrl(''); setRecordingSeconds(0); setRecordingState('idle')
  }, [recordingUrl])

  const stopRecording = useCallback(() => {
    if (recordingTimerRef.current) { window.clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  const startRecording = useCallback(() => {
    const stream = audioRef.current?.stream
    if (!stream || typeof MediaRecorder === 'undefined') return
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
    const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recordingChunksRef.current = []
    recorder.ondataavailable = (event) => { if (event.data.size) recordingChunksRef.current.push(event.data) }
    recorder.onstop = () => {
      const finalType = recorder.mimeType || mimeType || 'audio/webm'
      const blob = new Blob(recordingChunksRef.current, { type: finalType })
      setRecordingMime(finalType); setRecordingUrl(URL.createObjectURL(blob)); setRecordingState('ready')
      recorderRef.current = null
    }
    recorderRef.current = recorder
    setRecordingUrl(''); setRecordingSeconds(0); setRecordingState('recording')
    recorder.start(250)
    recordingTimerRef.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000)
  }, [recordingUrl])

  const stopInput = useCallback(() => {
    stopRecording()
    const audio = audioRef.current
    if (audio) {
      cancelAnimationFrame(audio.raf)
      audio.stream.getTracks().forEach((track) => track.stop())
      void audio.context.close()
      audioRef.current = null
    }
    setInputState('off'); setDetectedNote(null); setDetectedMidi(null); setDetectedHz(0); setDetectedCents(0); setPitchStable(false); setInputLevel(0); setLiveFretboardMap(false)
  }, [stopRecording])

  const connectInput = useCallback(async (selectedId?: string) => {
    stopInput()
    setInputState('requesting'); setInputError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedId ? { exact: selectedId } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')
      const activeId = stream.getAudioTracks()[0]?.getSettings().deviceId || selectedId || ''
      setInputDevices(devices); setDeviceId(activeId)
      const context = new AudioContext()
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 4096; analyser.smoothingTimeConstant = 0
      source.connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      let lastNote = ''; let stableFrames = 0; let lastSubmitted = ''; let quietFrames = 0

      const detectPitch = () => {
        analyser.getFloatTimeDomainData(samples)
        let rms = 0
        for (const sample of samples) rms += sample * sample
        rms = Math.sqrt(rms / samples.length)
        setInputLevel(Math.min(1, rms * 14))
        let frequency = 0
        if (rms > noiseGateRef.current / 1000) {
          const minLag = Math.floor(context.sampleRate / 1050)
          const maxLag = Math.min(Math.floor(context.sampleRate / 65), samples.length / 2)
          let bestLag = -1; let bestCorrelation = 0
          for (let lag = minLag; lag <= maxLag; lag++) {
            let correlation = 0
            for (let i = 0; i < samples.length - lag; i++) correlation += samples[i] * samples[i + lag]
            if (correlation > bestCorrelation) { bestCorrelation = correlation; bestLag = lag }
          }
          if (bestLag > 0) frequency = context.sampleRate / bestLag
        }
        if (frequency) {
          const midi = Math.round(69 + 12 * Math.log2(frequency / 440))
          const note = NOTES[((midi % 12) + 12) % 12]
          const exactFrequency = 440 * Math.pow(2, (midi - 69) / 12)
          const cents = Math.round(1200 * Math.log2(frequency / exactFrequency))
          setDetectedNote(note); setDetectedMidi(midi); setDetectedHz(frequency); setDetectedCents(cents); quietFrames = 0
          if (note === lastNote) stableFrames++; else { lastNote = note; stableFrames = 1 }
          setPitchStable(stableFrames >= stabilityRef.current)
          if (stableFrames >= stabilityRef.current && Math.abs(cents) <= 35 && note !== lastSubmitted && statusRef.current === 'playing') {
            lastSubmitted = note; answerRef.current(note)
          }
        } else {
          quietFrames++
          if (quietFrames > 5) { setDetectedNote(null); setDetectedMidi(null); setDetectedHz(0); setDetectedCents(0); setPitchStable(false); lastSubmitted = ''; stableFrames = 0 }
        }
        if (audioRef.current) audioRef.current.raf = requestAnimationFrame(detectPitch)
      }
      audioRef.current = { context, stream, raf: requestAnimationFrame(detectPitch) }
      setInputState('listening')
    } catch (error) {
      setInputState('error')
      setInputError(error instanceof DOMException && error.name === 'NotAllowedError' ? '没有麦克风权限，请在浏览器地址栏中允许访问。' : '无法打开音频输入，请确认设备已连接且未被其他程序占用。')
    }
  }, [stopInput])

  useEffect(() => () => stopInput(), [stopInput])

  const startGame = () => {
    setScore(0); setStreak(0); setBestStreak(0); setCorrect(0); setAttempts(0)
    setTimeLeft(60); setFeedback(null); setFoundPositions([]); prepareQuestion(); setStatus('playing')
  }

  const enterFocusTraining = () => {
    setFocusTraining(true)
    if (status !== 'playing') startGame()
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  const exitFocusTraining = () => {
    setFocusTraining(false)
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  }

  useEffect(() => {
    const syncFullscreen = () => { if (!document.fullscreenElement) setFocusTraining(false) }
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    if (status !== 'playing') return
    timerRef.current = window.setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) { setStatus('finished'); return 0 }
        return time - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [status])

  const choose = (string: number, fret: number) => {
    if (appMode === 'learning') {
      const isCorrect = learningView !== 'ear' || OPEN_MIDI[string]+fret === OPEN_MIDI[learningEarPosition.string]+learningEarPosition.fret
      setFeedback({ string, fret, correct: isCorrect }); playGuitar(string, fret)
      if (isCorrect && learningView === 'ear') setLearningEarRevealed(true)
      window.setTimeout(() => setFeedback(null), 350)
      return
    }
    if (status !== 'playing' || !activeStrings[string]) return
    if (trainingType === 'identify') return
    const chosen = noteAt(string, fret)
    const clickedKey = `${string}-${fret}`
    if (trainingType === 'arpeggio') {
      const expected = arpeggioPath[arpeggioStep]
      if (!expected) return
      const isCorrect = expected.string === string && expected.fret === fret
      setAttempts((n)=>n+1); setFeedback({string,fret,correct:isCorrect}); playGuitar(string,fret)
      if (isCorrect) {
        const nextStep=arpeggioStep+1; setArpeggioStep(nextStep)
        if (nextStep>=arpeggioPath.length) { setCorrect((n)=>n+1); setScore((n)=>n+150); setStreak((n)=>n+1); window.setTimeout(()=>{setFeedback(null);prepareQuestion()},360) }
        else window.setTimeout(()=>setFeedback(null),180)
      } else { setStreak(0); setScore((n)=>Math.max(0,n-20)); window.setTimeout(()=>setFeedback(null),420) }
      return
    }
    if (trainingType === 'allNotes' && foundPositions.includes(clickedKey)) return
    const expectedAllNotes = trainingType === 'allNotes' ? activeStrings.flatMap((on,s) => on ? Array.from({length:maxFret-minFret+1},(_,i)=>({string:s,fret:i+minFret})).filter((p)=>noteAt(p.string,p.fret)===target) : []) : []
    const anchorMidi = OPEN_MIDI[questionPosition.string] + questionPosition.fret
    const clickedMidi = OPEN_MIDI[string] + fret
    const isCorrect = trainingType === 'earLocate'
      ? clickedMidi === anchorMidi
      : trainingType === 'octave' || trainingType === 'interval' || trainingType === 'intervalShape'
      ? clickedMidi - anchorMidi === targetInterval && (trainingType !== 'intervalShape' || string === targetString)
      : chosen === target && (!['stringLocate','adaptive','scaleDegree','chordTone'].includes(trainingType) || string === targetString)
    const positionKey = `${string}-${fret}`
    setPositionStats((all) => {
      const previous = all[positionKey] || { correct: 0, wrong: 0 }
      const elapsed=Date.now()-questionStartedRef.current; const completed=previous.correct+(isCorrect?1:0); const averageMs=isCorrect?Math.round(((previous.averageMs||elapsed)*previous.correct+elapsed)/Math.max(1,completed)):previous.averageMs
      return { ...all, [positionKey]: { ...previous, correct: completed, wrong: previous.wrong + (isCorrect ? 0 : 1), averageMs, lastSeen:Date.now() } }
    })
    setAttempts((n) => n + 1)
    setFeedback({ string, fret, correct: isCorrect })
    playGuitar(string, fret)
    if (isCorrect) {
      if (trainingType === 'allNotes') {
        const nextFound = [...foundPositions, clickedKey]
        setFoundPositions(nextFound); setCorrect((n)=>n+1); setScore((n)=>n+100)
        window.setTimeout(() => setFeedback(null), 220)
        if (nextFound.length >= expectedAllNotes.length) window.setTimeout(() => prepareQuestion(target), 360)
        return
      }
      const nextStreak = streak + 1
      setCorrect((n) => n + 1)
      setStreak(nextStreak)
      setBestStreak((n) => Math.max(n, nextStreak))
      setScore((n) => n + 100 + Math.min(nextStreak - 1, 10) * 10)
      window.setTimeout(() => { setFeedback(null); prepareQuestion(target) }, 280)
    } else {
      setStreak(0)
      setScore((n) => Math.max(0, n - 20))
      window.setTimeout(() => setFeedback(null), 420)
    }
  }

  const answerIdentification = (answer: string) => {
    if (status !== 'playing' || trainingType !== 'identify' || feedback) return
    const isCorrect = answer === target
    const { string, fret } = questionPosition
    const key = `${string}-${fret}`
    setAttempts((n) => n + 1); setFeedback({ string, fret, correct: isCorrect }); playGuitar(string, fret)
    setPositionStats((all) => { const previous = all[key] || { correct:0, wrong:0 }; const elapsed=Date.now()-questionStartedRef.current; const completed=previous.correct+(isCorrect?1:0); return {...all,[key]:{...previous,correct:completed,wrong:previous.wrong+(isCorrect?0:1),averageMs:isCorrect?Math.round(((previous.averageMs||elapsed)*previous.correct+elapsed)/Math.max(1,completed)):previous.averageMs,lastSeen:Date.now()}} })
    if (isCorrect) {
      const nextStreak = streak + 1
      setCorrect((n) => n + 1); setStreak(nextStreak); setBestStreak((n) => Math.max(n,nextStreak)); setScore((n) => n + 100 + Math.min(nextStreak-1,10)*10)
      window.setTimeout(() => { setFeedback(null); prepareQuestion(target) }, 380)
    } else { setStreak(0); setScore((n) => Math.max(0,n-20)); window.setTimeout(() => setFeedback(null), 420) }
  }

  const answerByNote = (note: string) => {
    if (status !== 'playing') return
    const isCorrect = note === target
    setAttempts((n) => n + 1); playTone(note, isCorrect)
    if (isCorrect) {
      const nextStreak = streak + 1
      setCorrect((n) => n + 1); setStreak(nextStreak); setBestStreak((n) => Math.max(n, nextStreak))
      setScore((n) => n + 100 + Math.min(nextStreak - 1, 10) * 10)
      prepareQuestion(target)
    } else { setStreak(0); setScore((n) => Math.max(0, n - 20)) }
  }
  answerRef.current = answerByNote
  targetRef.current = target
  statusRef.current = status
  noiseGateRef.current = noiseGate
  stabilityRef.current = stability

  const accuracy = attempts ? Math.round(correct / attempts * 100) : 0
  const visibleMinFret = appMode === 'training' ? minFret : 1
  const visibleFretCount = maxFret - visibleMinFret + 1
  const learningScale = appMode === 'learning' && learningView === 'scales'
  const learningTheory = appMode === 'learning' && learningView === 'theory'
  const learningIntervalPair = useMemo(() => {
    const targetString = learningIntervalAnchorString - 1
    for (let fret = 1; fret <= maxFret; fret++) {
      const targetFret = OPEN_MIDI[learningIntervalAnchorString] + fret + learningIntervalSemitones - OPEN_MIDI[targetString]
      if (targetFret >= 1 && targetFret <= maxFret) return { anchor: { string: learningIntervalAnchorString, fret }, target: { string: targetString, fret: targetFret } }
    }
    return null
  }, [learningIntervalAnchorString, learningIntervalSemitones, maxFret])
  const weakPositions = useMemo(() => Object.entries(positionStats).map(([key, value]) => {
    const [string, fret] = key.split('-').map(Number)
    const total = value.correct + value.wrong
    return { string, fret, ...value, total, accuracy: total ? Math.round(value.correct / total * 100) : 0 }
  }).filter((item) => item.total >= 2).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total).slice(0, 5), [positionStats])
  const scaleNotes = useMemo(() => new Set(SCALES[scaleType].intervals.map((interval) => NOTES[(scaleRoot + interval) % 12])), [scaleRoot, scaleType])
  const scaleSequence = useMemo(() => {
    const all = activeStrings.flatMap((on,string) => on ? Array.from({length:maxFret},(_,index)=>({string,fret:index+1,midi:OPEN_MIDI[string]+index+1})) : []).sort((a,b)=>a.midi-b.midi)
    const roots = all.filter((position) => position.midi % 12 === scaleRoot)
    for (const root of roots) {
      const targetMidis = [...SCALES[scaleType].intervals,12].map((interval)=>root.midi+interval)
      const positions = targetMidis.map((midi)=>all.find((position)=>position.midi===midi))
      if (positions.every(Boolean)) return positions as Array<{string:number;fret:number;midi:number}>
    }
    return []
  }, [activeStrings,maxFret,scaleRoot,scaleType])
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
  const chord = CHORD_TYPES[chordType]
  const effectiveRoot = customChord?.root ?? chordRoot
  const effectiveIntervals = customChord?.intervals ?? chord.intervals
  const effectiveType = customChord?.matchedType ? CHORD_TYPES[customChord.matchedType] : customChord ? null : chord
  const effectiveSuffix = effectiveType?.suffix ?? '（自定义）'
  const effectiveName = effectiveType?.name ?? '自定义和弦'
  const effectiveFormula = customChord ? customChord.tokens.join(' · ').replace(/b/g, '♭').replace(/#/g, '♯') : chord.formula
  const chordNotes = useMemo(() => effectiveIntervals.map((interval) => NOTES[(effectiveRoot + interval) % 12]), [effectiveIntervals, effectiveRoot])
  const chordVoicings = useMemo(() => deriveVoicings(effectiveRoot, effectiveIntervals), [effectiveIntervals, effectiveRoot])
  const diatonicChords = useMemo(() => {
    const layout = keyMode === 'major'
      ? [[0,'I','major'],[2,'ii','minor'],[4,'iii','minor'],[5,'IV','major'],[7,'V','major'],[9,'vi','minor'],[11,'vii°','diminished']]
      : [[0,'i','minor'],[2,'ii°','diminished'],[3,'III','major'],[5,'iv','minor'],[7,'v','minor'],[8,'VI','major'],[10,'VII','major']]
    return layout.map(([offset,roman,type]) => ({ root: (keyRoot + Number(offset)) % 12, roman: String(roman), type: type as ChordType }))
  }, [keyMode, keyRoot])
  const secondaryDominants = useMemo(() => diatonicChords.slice(1, 6).map((targetChord) => ({ root: (targetChord.root + 7) % 12, target: targetChord, label: `V/${targetChord.roman}` })), [diatonicChords])
  const progressionChords = useMemo(() => PROGRESSIONS[progressionIndex].degrees.map((degree) => diatonicChords[degree]), [diatonicChords, progressionIndex])
  const submitChordInput = () => {
    const parsed = parseChordDegrees(chordInput)
    if (!parsed) { setChordInputError('请输入 3–4 个不同的音，例如 135、1 ♭3 5 或 1 3 5 ♭7'); return }
    setChordInputError(''); setCustomChord(parsed)
  }
  const identifySelectedChord = () => {
    if (selectedChordNotes.length < 3) { setChordInputError('请至少选择 3 个音'); return }
    const match = NOTES.flatMap((_, root) => Object.entries(CHORD_TYPES).map(([type, value]) => ({ root, type: type as ChordType, intervals: value.intervals }))).find((candidate) => candidate.intervals.length === selectedChordNotes.length && candidate.intervals.every((interval) => selectedChordNotes.includes((candidate.root + interval) % 12)))
    if (!match) { setChordInputError('暂未识别该音组，可尝试使用上方组成音输入推导'); return }
    setChordRoot(match.root); setChordType(match.type); setCustomChord(null); setChordInputError('')
  }
  const playCurrentScale = () => {
    const baseFret = ((scaleRoot - OPEN_NOTES[5] + 12) % 12) || 12
    ;[...SCALES[scaleType].intervals, 12].forEach((interval, index) => window.setTimeout(() => playGuitar(5, baseFret + interval), index * 330))
  }
  const answerSolfege = (answer: string) => {
    if (solfegeFeedback) return
    const item = SOLFEGE[solfegeQuestion]
    const expected = solfegeDirection.endsWith('Number') ? item.number : solfegeDirection.endsWith('Note') ? item.note : item.name
    const isCorrect = answer === expected
    setSolfegeFeedback(answer)
    playGuitar(5, ((item.noteIndex - OPEN_NOTES[5] + 12) % 12) || 12)
    if (isCorrect) { setSolfegeScore((n) => n + 1); setSolfegeStreak((n) => n + 1) } else setSolfegeStreak(0)
    window.setTimeout(() => {
      setSolfegeQuestion((current) => { let next = Math.floor(Math.random() * SOLFEGE.length); if (next === current) next = (next + 1) % SOLFEGE.length; return next })
      const directions: SolfegeDirection[] = ['noteToNumber', 'numberToNote', 'noteToName', 'nameToNote', 'numberToName', 'nameToNumber']
      setSolfegeDirection(directions[Math.floor(Math.random() * directions.length)])
      setSolfegeFeedback(null)
    }, 650)
  }

  return (
    <main className={focusTraining ? 'training-focus' : ''}>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Guitar size={19}/></span><span>Fret<span>Quest</span></span></a>
        <nav>
          <button className={appMode === 'training' ? 'nav-active' : ''} onClick={() => { setAppMode('training'); setStatus('idle') }}>训练场</button>
          <button className={appMode === 'learning' ? 'nav-active' : ''} onClick={() => { setAppMode('learning'); setStatus('idle') }}>学习模式</button>
          <button className={appMode === 'chords' ? 'nav-active' : ''} onClick={() => { setAppMode('chords'); setStatus('idle') }}>和弦推导</button>
          <button className={appMode === 'drums' ? 'nav-active' : ''} onClick={() => { setAppMode('drums'); setStatus('idle') }}>节奏鼓机</button>
          <button className={appMode === 'recorder' ? 'nav-active' : ''} onClick={() => { setAppMode('recorder'); setStatus('idle') }}>录音机</button>
        </nav>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setSoundOn(!soundOn)} aria-label="声音"><Volume2 size={18} className={!soundOn ? 'muted' : ''}/></button>
          <button className="settings-btn" onClick={() => setSettingsOpen(true)}><Settings2 size={17}/> 设置</button>
        </div>
      </header>

      {((appMode === 'training' && status === 'playing') || (appMode === 'learning' && ['explore','interval','scales'].includes(learningView))) && <div className="portrait-orientation-guard" role="dialog" aria-modal="true" aria-label="请横屏使用指板"><div className="rotate-phone"><Smartphone size={42}/><i>↻</i></div><strong>请将手机横过来</strong><p>横屏后可以完整查看吉他指板<br/>页面会自动恢复，无需刷新</p><button onClick={()=>setSettingsOpen(true)}><Settings2 size={14}/> 打开设置</button></div>}

      {appMode === 'training' && <div className="training-subnav">
        <div className="current-training"><span>当前训练</span><strong>{{locate:'音名定位',identify:'反向识别',stringLocate:'指定弦定位',allNotes:'同名音全搜',octave:'八度形状',interval:'音程定位',intervalShape:'音程形状',earLocate:'听音找指板',adaptive:'自适应复习',scaleDegree:'音阶音级',chordTone:'和弦内音',arpeggio:'琶音路径'}[trainingType]}</strong></div>
        <div className="training-menus">
          <div className="training-menu-wrap"><button className={['locate','identify','stringLocate'].includes(trainingType) ? 'active' : ''} disabled={status === 'playing'} onClick={() => setTrainingMenu(trainingMenu === 'basic' ? null : 'basic')}>基础定位 <ChevronDown size={13}/></button>{trainingMenu === 'basic' && <div className="training-popover">
            {([['locate','音名定位','看到音名，寻找指板位置'],['identify','反向识别','看到位置，选择正确音名'],['stringLocate','指定弦定位','只在指定弦上寻找目标音']] as const).map(([value,title,description]) => <button className={trainingType === value ? 'selected' : ''} key={value} onClick={() => {setTrainingType(value);setStatus('idle');setTrainingMenu(null)}}><i>{value === 'locate' ? '01' : value === 'identify' ? '02' : '03'}</i><span><strong>{title}</strong><small>{description}</small></span></button>)}
          </div>}</div>
          <div className="training-menu-wrap"><button className={['allNotes','octave','interval','intervalShape','earLocate'].includes(trainingType) ? 'active' : ''} disabled={status === 'playing'} onClick={() => setTrainingMenu(trainingMenu === 'relation' ? null : 'relation')}>关系训练 <ChevronDown size={13}/></button>{trainingMenu === 'relation' && <div className="training-popover">
            {([['allNotes','同名音全搜','找齐范围内全部同名音'],['octave','八度形状','寻找上方一个八度位置'],['interval','音程定位','从根音寻找指定音程'],['intervalShape','音程形状','固定在相邻高音弦上找目标'],['earLocate','听音找指板','聆听真实吉他音，寻找相同音高']] as const).map(([value,title,description]) => <button className={trainingType === value ? 'selected' : ''} key={value} onClick={() => {setTrainingType(value);setStatus('idle');setTrainingMenu(null)}}><i>{value === 'allNotes' ? '04' : value === 'octave' ? '05' : value === 'interval' ? '06' : value === 'intervalShape' ? '07' : '08'}</i><span><strong>{title}</strong><small>{description}</small></span></button>)}
          </div>}</div>
          <div className="training-menu-wrap"><button className={['adaptive','scaleDegree','chordTone','arpeggio'].includes(trainingType) ? 'active' : ''} disabled={status === 'playing'} onClick={() => setTrainingMenu(trainingMenu === 'applied' ? null : 'applied')}>应用训练 <ChevronDown size={13}/></button>{trainingMenu === 'applied' && <div className="training-popover">
            {([['adaptive','自适应复习','根据错误率与反应时间安排薄弱位置'],['scaleDegree','音阶音级','在指定弦寻找当前音阶的目标级数'],['chordTone','和弦内音','寻找根音、三音、五音与七音'],['arpeggio','琶音路径','按音高顺序完成和弦琶音']] as const).map(([value,title,description],index) => <button className={trainingType === value ? 'selected' : ''} key={value} onClick={() => {setTrainingType(value);setStatus('idle');setTrainingMenu(null)}}><i>{String(index+8).padStart(2,'0')}</i><span><strong>{title}</strong><small>{description}</small></span></button>)}
          </div>}</div>
        </div>
        <div className="training-description"><span>{{locate:'看到音名，在整块指板上寻找位置',identify:'看到高亮位置，从十二个音名中选择',stringLocate:'只在指定的一根弦上寻找目标音',allNotes:'找齐当前范围内所有相同音名',octave:'从根音寻找上方一个八度的位置',interval:'从根音寻找指定的音程距离',intervalShape:'从根音到指定相邻高音弦，复现音程手形',earLocate:'聆听单音，在指板上找到相同实际音高',adaptive:'优先复习错误多、反应慢和长期未练的位置',scaleDegree:'把音阶级数映射到指定琴弦',chordTone:'识别并定位当前和弦的组成音',arpeggio:'按顺序连接和弦音，建立可演奏路径'}[trainingType]}</span></div>
        <div className={`training-status ${status}`}><i/>{status === 'playing' ? '训练进行中' : status === 'finished' ? '本局已完成' : '等待开始'}</div>
      </div>}

      <section className="hero">
        <div className="eyebrow"><Sparkles size={14}/> {appMode === 'drums' ? '为节拍、分解和即兴提供稳定律动' : appMode === 'recorder' ? '记录每一次练习与灵感' : appMode === 'chords' ? '从组成音推导可弹奏的吉他指法' : learningTheory ? '理解规则，才能更快记住指板' : learningScale ? '看见音阶在整块指板上的形状' : appMode === 'learning' ? '观察、聆听，熟悉音符之间的关系' : '每天 5 分钟，认识整块指板'}</div>
        <h1>{appMode === 'drums' ? '练琴节奏鼓机' : appMode === 'recorder' ? '吉他录音机' : appMode === 'chords' ? '吉他和弦推导' : learningTheory ? '吉他基础乐理' : learningScale ? '音阶练习' : appMode === 'learning' ? '自由探索指板' : status === 'finished' ? '本局完成' : '找到这个音'}</h1>
        {appMode === 'chords' && <div className="scale-heading"><strong>{NOTES[effectiveRoot]}{effectiveSuffix}</strong><small>{effectiveName} · {effectiveFormula} · {chordNotes.join(' · ')}</small></div>}
        {learningTheory && <div className="scale-heading"><strong>{theoryLesson === 'notes' ? '认识十二个音' : theoryLesson === 'intervals' ? '理解音程距离' : '音名与唱名转换'}</strong><small>{theoryLesson === 'notes' ? '从 C 到 B，读懂指板上的语言' : theoryLesson === 'intervals' ? '两个音之间的距离，构成旋律与和弦' : 'C D E F G A B ↔ 1 2 3 4 5 6 7'}</small></div>}
        {learningScale && <div className="scale-heading"><strong>{NOTES[scaleRoot]} {SCALES[scaleType].name}</strong><small>{SCALES[scaleType].intervals.map((interval) => NOTES[(scaleRoot + interval) % 12]).join(' · ')}</small></div>}
        {appMode === 'learning' && !learningScale && !learningTheory && <div className="learning-title"><strong>{learningView === 'ear' ? '听音实验室' : learningView === 'interval' ? '指板音程形状' : '全音符地图'}</strong><small>{learningView === 'ear' ? '先熟悉、再对比，建立十二音的听觉印象' : learningView === 'interval' ? '用两根弦之间的固定形状，快速建立空间记忆' : '点击任意音符试听'}</small></div>}
        {appMode === 'training' && status !== 'finished' && <div className={`target-note ${status === 'idle' ? 'dim' : ''}`}>{status === 'idle' ? '?' : trainingType === 'identify' ? '看指板' : trainingType === 'earLocate' ? <Volume2 size={52}/> : trainingType === 'octave' ? '8度' : trainingType === 'interval' || trainingType === 'intervalShape' ? INTERVALS.find((item)=>item[2]===targetInterval)?.[1] : trainingType === 'scaleDegree' ? `${SCALES[scaleType].intervals.indexOf(trainingGoalOffset)+1}级` : trainingType === 'chordTone' ? ({0:'根音',3:'小三音',4:'大三音',6:'减五音',7:'五音',9:'减七音',10:'小七音',11:'大七音'} as Record<number,string>)[trainingGoalOffset] || `${trainingGoalOffset}半音` : target}<small>{status === 'idle' ? '准备好了吗' : trainingType === 'identify' ? '选择高亮位置的音名' : trainingType === 'earLocate' ? '听声音，找到相同实际音高的位置' : trainingType === 'adaptive' ? `薄弱位置复习 · 只在第 ${targetString+1} 弦寻找 ${target}` : trainingType === 'scaleDegree' ? `${NOTES[scaleRoot]} ${SCALES[scaleType].name} · 第 ${targetString+1} 弦 · 目标音 ${target}` : trainingType === 'chordTone' ? `${NOTES[chordRoot]}${CHORD_TYPES[chordType].suffix || 'Major'} · 第 ${targetString+1} 弦 · 目标音 ${target}` : trainingType === 'arpeggio' ? `按音高上行点击 · ${arpeggioStep}/${arpeggioPath.length}` : trainingType === 'stringLocate' ? `只在第 ${targetString + 1} 弦上寻找` : trainingType === 'allNotes' ? `找出全部 ${target} · 已找到 ${foundPositions.length} 个` : trainingType === 'octave' ? '从根音寻找上方八度音' : trainingType === 'intervalShape' ? `从根音在第 ${targetString+1} 弦复现上行${INTERVALS.find((item)=>item[2]===targetInterval)?.[0]}形状` : trainingType === 'interval' ? `从根音寻找上行${INTERVALS.find((item)=>item[2]===targetInterval)?.[0]}` : '点击指板上的正确位置'}</small>{status === 'playing' && trainingType === 'earLocate' && <button className="replay-note" onClick={() => playGuitar(questionPosition.string,questionPosition.fret)}><Volume2 size={13}/> 再听一次</button>}</div>}
        {appMode === 'training' && status === 'finished' && (
          <div className="result-summary">
            <strong>{score.toLocaleString()}</strong><span>分</span>
            <p>答对 {correct} 题 · 正确率 {accuracy}% · 最佳连击 {bestStreak}</p>
          </div>
        )}
      </section>

      <section className={`game-wrap mode-${appMode}`}>
        {appMode === 'training' && status !== 'playing' && ['locate','stringLocate','adaptive'].includes(trainingType) && <section className="position-practice"><div><span>POSITION PRACTICE</span><strong>按把位练习</strong><small>固定手形覆盖一小段品位，强迫自己离开前五品。</small></div><div className="position-buttons">{FRET_POSITIONS.map((position)=><button key={position.label} className={minFret===position.start&&maxFret===position.end?'selected':''} onClick={()=>{setMinFret(position.start);setMaxFret(position.end)}}><strong>{position.label}</strong><small>{position.start}–{position.end} 品</small></button>)}<button className="position-custom" onClick={()=>setSettingsOpen(true)}><strong>自定义</strong><small>{minFret}–{maxFret} 品</small></button></div></section>}
        {appMode === 'training' && (status === 'playing' || focusTraining) && <div className="landscape-target-hud"><span>{status === 'finished' ? '训练完成' : '当前目标'}</span><strong>{status === 'finished' ? `${score} 分` : trainingType === 'identify' ? '识别高亮位置' : trainingType === 'earLocate' ? '听音找位置' : trainingType === 'octave' ? '8度' : trainingType === 'interval' ? INTERVALS.find((item)=>item[2]===targetInterval)?.[1] : trainingType === 'scaleDegree' ? `${([...SCALES[scaleType].intervals] as number[]).indexOf(trainingGoalOffset)+1}级 · ${target}` : trainingType === 'chordTone' ? `${target} · 和弦内音` : target}</strong><small>{status === 'finished' ? `${accuracy}%` : trainingType === 'stringLocate' || trainingType === 'adaptive' || trainingType === 'scaleDegree' || trainingType === 'chordTone' ? `第 ${targetString+1} 弦` : trainingType === 'arpeggio' ? `${arpeggioStep}/${arpeggioPath.length}` : `${timeLeft}秒`}</small>{focusTraining && <button onClick={exitFocusTraining} aria-label="退出全屏训练"><X size={15}/></button>}</div>}
        {appMode === 'training' && status === 'idle' && ['scaleDegree','chordTone','arpeggio'].includes(trainingType) && <div className="applied-training-controls">
          <span>训练内容</span><label>根音<select value={trainingType === 'scaleDegree' ? scaleRoot : chordRoot} onChange={(e)=>trainingType === 'scaleDegree' ? setScaleRoot(Number(e.target.value)) : setChordRoot(Number(e.target.value))}>{NOTES.map((note,index)=><option key={note} value={index}>{note}</option>)}</select></label>
          {trainingType === 'scaleDegree' ? <label>音阶<select value={scaleType} onChange={(e)=>setScaleType(e.target.value as ScaleType)}>{Object.entries(SCALES).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></label> : <label>和弦<select value={chordType} onChange={(e)=>setChordType(e.target.value as ChordType)}>{Object.entries(CHORD_TYPES).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></label>}
        </div>}
        {appMode === 'drums' && <section className="drum-machine"><div className="drum-head"><div><span>GUITAR PRACTICE GROOVE</span><h2>16 步节奏编排</h2><p>点击格子编辑节奏，用稳定的四分音符与十六分律动练习扫弦、节拍和即兴。</p></div><div className="drum-transport"><button onClick={()=>setDrumBpm((b)=>Math.max(40,b-5))}>−</button><strong>{drumBpm}<small>BPM</small></strong><button onClick={()=>setDrumBpm((b)=>Math.min(240,b+5))}>+</button><button className={drumPlaying?'stop':'start'} onClick={()=>setDrumPlaying((value)=>!value)}>{drumPlaying?<><Square size={14}/> 停止</>:<><Play size={15}/> 播放</>}</button></div></div><div className="metronome-card"><div className={`metronome-body ${metronomePlaying?'swinging':''}`} style={{'--swing-duration':`${60/drumBpm}s`} as React.CSSProperties}><i/><b/><em/></div><div><span>TRADITIONAL METRONOME</span><h3>传统节拍器 · {drumBpm} BPM</h3><p>每小节第一拍为重音；摆锤左右各一次正好是一拍。</p><div className="metro-beats">{[0,1,2,3].map((beat)=><i key={beat} className={metronomePlaying&&metronomeBeat===beat?'active':''}>{beat+1}</i>)}</div></div><button className={metronomePlaying?'metro-stop':'metro-start'} onClick={()=>setMetronomePlaying((value)=>!value)}>{metronomePlaying?<><Square size={14}/> 停止</>:<><Play size={15}/> 开始节拍</>}</button></div><div className="drum-presets"><span>快速节奏</span><button onClick={()=>setDrumPattern({kick:[true,false,false,false,true,false,false,false,true,false,false,false,true,false,false,false],snare:[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],hat:[true,false,true,false,true,false,true,false,true,false,true,false,true,false,true,false]})}>基础 Rock</button><button onClick={()=>setDrumPattern({kick:[true,false,false,true,false,false,true,false,true,false,false,true,false,false,true,false],snare:[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],hat:Array(16).fill(true)})}>8 Beat</button><button onClick={()=>setDrumPattern({kick:[true,false,true,false,false,false,true,false,true,false,false,true,false,true,false,false],snare:[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],hat:[true,false,true,true,true,false,true,true,true,false,true,true,true,false,true,true]})}>Funk</button></div><div className="drum-grid">{(['kick','snare','hat'] as const).map((row)=><div className="drum-row" key={row}><strong>{row==='kick'?'底鼓':row==='snare'?'军鼓':'踩镲'}</strong>{drumPattern[row].map((on,index)=><button key={index} aria-label={`${row} 第 ${index+1} 步`} className={`${on?'on':''} ${drumStep===index?'playing':''} ${index%4===0?'beat':''}`} onClick={()=>setDrumPattern((pattern)=>({...pattern,[row]:pattern[row].map((value,step)=>step===index?!value:value)}))}>{index%4===0?index/4+1:''}</button>)}</div>)}</div><div className="drum-tip"><strong>练琴建议</strong><span>从 70 BPM 开始，每次连续稳定演奏 4 小节后再提升 5 BPM。可保持本页播放鼓机，同时切到录音机录下练习。</span></div></section>}
        {appMode === 'recorder' && <section className="recorder-studio">
          <div className="studio-toolbar"><div><span className={`device-light ${inputState === 'listening' ? 'online' : ''}`}/><strong>{inputState === 'listening' ? '输入设备已就绪' : '尚未连接输入设备'}</strong><small>{inputState === 'listening' ? (inputDevices.find((device)=>device.deviceId===deviceId)?.label || 'USB 音频输入') : '支持 G5n、USB 声卡和设备麦克风'}</small></div>{inputState === 'listening' && inputDevices.length > 1 && <select value={deviceId} onChange={(e)=>void connectInput(e.target.value)}>{inputDevices.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label || `音频输入 ${index+1}`}</option>)}</select>}<button className="studio-connect" disabled={inputState === 'requesting'} onClick={()=>inputState === 'listening'?stopInput():void connectInput()}>{inputState === 'listening'?<><MicOff size={15}/>断开设备</>:<><Cable size={15}/>{inputState === 'requesting'?'连接中…':'连接设备'}</>}</button></div>
          <div className={`studio-deck ${recordingState}`}>
            <div className="studio-display"><span>{recordingState === 'recording' ? 'RECORDING' : recordingState === 'ready' ? 'TAKE READY' : 'READY'}</span><time>{String(Math.floor(recordingSeconds / 60)).padStart(2,'0')}<i>:</i>{String(recordingSeconds % 60).padStart(2,'0')}</time><small>{recordingState === 'recording' ? '正在录制设备输入原声' : inputState === 'listening' ? '按下录音键开始' : '请先连接输入设备'}</small></div>
            <div className="studio-wave" aria-hidden="true">{Array.from({length:44},(_,index)=><i key={index} style={{height:`${inputState === 'listening' ? Math.max(3, inputLevel*54*(.45+.55*Math.abs(Math.sin(index*.72)))) : 3}px`}}/>)}</div>
            <div className="studio-meter"><span>L</span><div><i style={{width:`${inputLevel*100}%`}}/></div><b>{inputLevel > .8 ? 'PEAK' : `${Math.round(inputLevel*100)}`}</b></div>
            <div className="transport-controls">{recordingState !== 'recording' ? <button className="main-record" disabled={inputState !== 'listening'} onClick={startRecording}><span/><strong>{recordingState === 'ready' ? '重新录制' : '开始录音'}</strong></button> : <button className="main-stop" onClick={stopRecording}><Square size={19}/><strong>停止录音</strong></button>}</div>
          </div>
          {recordingState === 'ready' && recordingUrl && <section className="take-panel"><div><span>当前录音</span><strong>吉他录音 · {String(Math.floor(recordingSeconds/60)).padStart(2,'0')}:{String(recordingSeconds%60).padStart(2,'0')}</strong></div><audio src={recordingUrl} controls/><a href={recordingUrl} download={`guitar-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.${recordingMime.includes('ogg')?'ogg':recordingMime.includes('mp4')?'m4a':'webm'}`}><Download size={15}/> 下载录音</a><button onClick={clearRecording}><Trash2 size={15}/> 删除</button></section>}
          {inputState === 'error' && <p className="studio-error">{inputError}</p>}
          <p className="recorder-tip">录音只保存在当前浏览器中。下载前请不要刷新页面；使用 G5n 时将录制其 USB 输入提供的声音。</p>
        </section>}
        {appMode === 'learning' && <div className="learning-toolbar">
          <div className="learning-view-switch"><button className={learningView==='explore'?'active':''} onClick={()=>setLearningView('explore')}>指板探索</button><button className={learningView==='interval'?'active':''} onClick={()=>setLearningView('interval')}>音程形状</button><button className={learningView==='scales'?'active':''} onClick={()=>setLearningView('scales')}>音阶</button><button className={learningView==='theory'?'active':''} onClick={()=>setLearningView('theory')}>基础乐理</button><button className={learningView==='ear'?'active':''} onClick={()=>setLearningView('ear')}>听音学习</button></div>
          {learningView === 'ear' && <span className="learning-method">熟悉音色 → 参照对比 → 跨八度识别 → 进入测试</span>}
        </div>}
        {appMode === 'learning' && learningView === 'ear' && <section className="ear-lab">
          <div className="ear-course-nav"><button className={earLesson==='pitch'?'active':''} onClick={()=>setEarLesson('pitch')}><i>01</i><span><strong>音高基础</strong><small>高低、音程距离与八度</small></span></button><button className={earLesson==='relative'?'active':''} onClick={()=>setEarLesson('relative')}><i>02</i><span><strong>相对音感</strong><small>以主音听辨 1–7 级</small></span></button><button className={earLesson==='fretboard'?'active':''} onClick={()=>setEarLesson('fretboard')}><i>03</i><span><strong>指板映射</strong><small>把声音放回吉他指板</small></span></button><button className={`ear-library-tab ${earLesson==='library'?'active':''}`} onClick={()=>setEarLesson('library')}>十二音试听工具</button></div>
          {earLesson === 'pitch' && <div className="ear-course-content"><div className="ear-lab-intro"><span className="lesson-number">LESSON 01 · PITCH</span><h2>先听懂声音的高低与距离</h2><p>不要记音名。先判断声音往上还是往下，并区分半音、全音和八度。</p></div><div className="ear-concept-grid">
            <article><span>高低方向</span><h3>低 → 高</h3><p>两个音依次播放，注意第二个音的方向。</p><button onClick={()=>{playGuitar(5,8);window.setTimeout(()=>playGuitar(5,15),650)}}><Play size={14}/> 播放 C3 → G3</button><button onClick={()=>{playGuitar(5,20);window.setTimeout(()=>playGuitar(5,13),650)}}><Play size={14}/> 播放 C4 → F3</button></article>
            <article><span>距离大小</span><h3>半音与全音</h3><p>半音是相邻一品，全音是相隔两品。</p><button onClick={()=>{playGuitar(5,8);window.setTimeout(()=>playGuitar(5,9),650)}}><Play size={14}/> 半音 C → C♯</button><button onClick={()=>{playGuitar(5,8);window.setTimeout(()=>playGuitar(5,10),650)}}><Play size={14}/> 全音 C → D</button></article>
            <article><span>相同身份</span><h3>八度</h3><p>音高明显改变，但两个音具有相同音名。</p><button onClick={()=>{playGuitar(5,8);window.setTimeout(()=>playGuitar(5,20),650)}}><Play size={14}/> C3 → C4</button><button onClick={()=>{playGuitar(5,15);window.setTimeout(()=>playGuitar(5,27),650)}}><Play size={14}/> G3 → G4</button></article>
          </div></div>}
          {earLesson === 'relative' && <div className="ear-course-content"><div className="ear-lab-intro"><span className="lesson-number">LESSON 02 · FUNCTIONAL EAR</span><h2>用主音 C 感受七个级数</h2><p>每次先听主音 1，再听目标级数。重点记住它相对主音的稳定、明亮或紧张感。</p></div><div className="degree-list">{SOLFEGE.map((item,index)=><button key={item.note} onClick={()=>{playGuitar(5,8);window.setTimeout(()=>playGuitar(5,8+item.noteIndex),650)}}><i>{item.number}</i><span><strong>{item.name}</strong><small>{item.note} · {index===0?'主音，最稳定':index===4?'属音，有支撑感':index===6?'强烈趋向主音':'相对主音的第 '+item.number+' 级'}</small></span><Play size={14}/></button>)}</div></div>}
          {earLesson === 'fretboard' && <div className="ear-course-content fretboard-course"><div className="ear-lab-intro"><span className="lesson-number">LESSON 03 · MAP THE SOUND</span><h2>把听到的音映射到指板</h2><p>先听音，在脑中判断高低和可能位置，再到指板上验证。这里不要求绝对音感，而是建立声音与手位的联系。</p></div><div className="mapping-steps"><div><i>1</i><strong>听</strong><span>重复播放真实吉他单音</span></div><b>→</b><div><i>2</i><strong>判断</strong><span>判断音区与相对距离</span></div><b>→</b><div><i>3</i><strong>定位</strong><span>在指板寻找同音高位置</span></div></div><button className="start-ear-test" onClick={()=>{setAppMode('training');setTrainingType('earLocate');setStatus('idle')}}><Volume2 size={17}/> 进入听音找指板训练</button></div>}
          {earLesson === 'library' && <><div className="ear-lab-intro"><span className="lesson-number">REFERENCE TOOL</span><h2>十二音自由试听</h2><p>这是辅助对照工具，不是正式课程。可以随时比较音名、唱名和不同八度。</p></div><div className="ear-note-grid">{NOTES.map((note,index) => <button className={`${selectedEarNote===index?'selected':''} ${note.includes('♯')?'accidental':'natural'}`} key={note} onClick={()=>{setSelectedEarNote(index);playGuitar(5,8+index)}}><span>{note}</span><small>{SOLFEGE.find((item)=>item.noteIndex===index)?.name || (index===1?'Do♯':index===3?'Re♯':index===6?'Fa♯':index===8?'Sol♯':'La♯')}</small><Volume2 size={13}/></button>)}</div><div className="ear-focus">
            <div className="ear-focus-note"><span>当前音</span><strong>{NOTES[selectedEarNote]}</strong><small>距离 C：{selectedEarNote} 个半音</small></div>
            <div className="ear-stage"><span>01 · 跨八度听同一个音</span><p>音高不同，但音名和听觉“颜色”保持一致。</p><div><button onClick={()=>playGuitar(5,8+selectedEarNote)}>低音 {NOTES[selectedEarNote]}</button><button onClick={()=>playGuitar(5,20+selectedEarNote)}>中音 {NOTES[selectedEarNote]}</button><button onClick={()=>playGuitar(5,32+selectedEarNote)}>高音 {NOTES[selectedEarNote]}</button></div></div>
            <div className="ear-stage"><span>02 · 用 C 建立参照</span><p>先听 C，再听目标音，感受它们之间的距离。</p><button className="compare-play" onClick={()=>{playGuitar(5,8);window.setTimeout(()=>playGuitar(5,8+selectedEarNote),650)}}><Play size={14}/> C → {NOTES[selectedEarNote]}</button></div>
            <div className="ear-stage"><span>03 · 听完整半音阶</span><p>连续听十二音如何逐级上行，建立音高方向感。</p><button className="compare-play" onClick={()=>NOTES.forEach((_,index)=>window.setTimeout(()=>playGuitar(5,8+index),index*330))}><Play size={14}/> 播放 C 半音阶</button></div>
          </div></>}
        </section>}
        {appMode === 'learning' && learningView === 'interval' && <section className="interval-learning-panel">
          <div className="interval-lesson-copy"><span className="lesson-number">FRETBOARD SHAPES</span><h2>从根音出发，记住目标音的落点</h2><p>绿色是根音，蓝色是目标音。保持手形不变，换到不同把位和音名时，音程关系仍然成立。</p></div>
          <div className="interval-lesson-controls"><div><span>选择音程</span><div className="interval-choice-grid">{INTERVALS.filter((item) => [3,4,5,7,10,12].includes(item[2] as number)).map(([name,symbol,semitones])=><button key={String(symbol)} className={learningIntervalSemitones===semitones?'active':''} onClick={()=>setLearningIntervalSemitones(semitones as number)}><b>{symbol}</b><small>{name}</small></button>)}</div></div><div><span>相邻弦组合</span><div className="string-pair-choice">{[5,4,3,2,1].map((string)=><button key={string} className={learningIntervalAnchorString===string?'active':''} onClick={()=>setLearningIntervalAnchorString(string)}>{string+1} 弦 → {string} 弦</button>)}</div></div></div>
          {learningIntervalPair && <div className="interval-explanation"><div><span>当前形状</span><strong>{noteAt(learningIntervalPair.anchor.string, learningIntervalPair.anchor.fret)} → {noteAt(learningIntervalPair.target.string, learningIntervalPair.target.fret)}</strong><small>{INTERVALS.find((item)=>item[2]===learningIntervalSemitones)?.[0]} · {learningIntervalSemitones} 半音</small></div><p>从第 {learningIntervalAnchorString+1} 弦根音到第 {learningIntervalAnchorString} 弦目标音：向高音弦移动 <b>{learningIntervalPair.target.fret - learningIntervalPair.anchor.fret > 0 ? '+' : ''}{learningIntervalPair.target.fret - learningIntervalPair.anchor.fret}</b> 品。{learningIntervalAnchorString===2 ? '注意：3→2 弦是大三度调弦，形状会比其他相邻弦偏移 1 品。' : '其余相邻弦之间是纯四度调弦，可复用同一套形状。'}</p><button onClick={()=>{playGuitar(learningIntervalPair.anchor.string,learningIntervalPair.anchor.fret);window.setTimeout(()=>playGuitar(learningIntervalPair.target.string,learningIntervalPair.target.fret),600)}}><Play size={14}/> 试听两个音</button></div>}
        </section>}
        {appMode === 'chords' && <section className="chord-panel">
          <div className="chord-input-box">
            <div><span className="lesson-number">COMPOSE · 输入组成音</span><h2>写下音，自动推导和弦</h2><p>第一个音作为根音，支持数字音和升降记号。</p></div>
            <form onSubmit={(e) => { e.preventDefault(); submitChordInput() }}><input value={chordInput} onChange={(e) => setChordInput(e.target.value)} placeholder="例如：135" aria-label="和弦组成音"/><button type="submit">开始推导</button>{chordInputError && <small>{chordInputError}</small>}</form>
            <div className="input-examples"><span>试一试</span>{['135','1b35','145','135b7','1b35b7'].map((example) => <button key={example} onClick={() => { setChordInput(example); const parsed = parseChordDegrees(example); if (parsed) { setCustomChord(parsed); setChordInputError('') } }}>{example.replace(/b/g,'♭')}</button>)}</div>
          </div>
          <button className={`harmony-tools-toggle ${harmonyToolsOpen ? 'open' : ''}`} onClick={()=>setHarmonyToolsOpen(!harmonyToolsOpen)}><span>高级和声工具</span><small>调内和弦、五度圈、进行与和弦识别</small><ChevronDown size={16}/></button>
          {harmonyToolsOpen && <><section className="chord-identifier"><div><span>CHORD IDENTIFIER</span><h2>点击音名识别和弦</h2><p>选择 3–4 个组成音，自动识别后进入指法推导。</p></div><div className="chord-note-picker">{NOTES.map((note,index)=><button key={note} className={selectedChordNotes.includes(index)?'selected':''} onClick={()=>setSelectedChordNotes((items)=>items.includes(index)?items.filter((item)=>item!==index):items.length<4?[...items,index]:items)}>{note}</button>)}<button className="identify-chord-btn" onClick={identifySelectedChord}>识别</button></div></section>
          <section className="key-chord-map"><div className="key-map-head"><div><span>KEY HARMONY</span><h2>调内和弦地图</h2><p>选择调性，点击级数即可推导对应指法。</p></div><div className="key-map-selects"><label>主音<select value={keyRoot} onChange={(e)=>setKeyRoot(Number(e.target.value))}>{NOTES.map((note,index)=><option key={note} value={index}>{note}</option>)}</select></label><label>调式<select value={keyMode} onChange={(e)=>setKeyMode(e.target.value as KeyMode)}><option value="major">大调</option><option value="minor">自然小调</option></select></label></div></div><div className="harmony-explorer"><div className="circle-of-fifths"><span className="circle-key">{NOTES[keyRoot]}<small>{keyMode==='major'?'大调':'小调'}</small></span>{FIFTHS.map((note,index)=><button key={note} className={note===keyRoot?'selected':''} style={{transform:`rotate(${index*30}deg) translateY(-74px) rotate(-${index*30}deg)`}} onClick={()=>setKeyRoot(note)}>{NOTES[note]}</button>)}</div><div className="progression-tool"><span>常用进行 · 自动随调性移调</span><div className="progression-tabs">{PROGRESSIONS.map((item,index)=><button className={progressionIndex===index?'selected':''} key={item.formula} onClick={()=>setProgressionIndex(index)}>{item.label} <small>{item.formula}</small></button>)}</div><div className="progression-chords">{progressionChords.map((item,index)=><button key={`${item.roman}-${index}`} onClick={()=>{setChordRoot(item.root);setChordType(item.type);setCustomChord(null)}}><span>{item.roman}</span><strong>{NOTES[item.root]}{CHORD_TYPES[item.type].suffix || ''}</strong></button>)}</div></div></div><div className="diatonic-chord-grid">{diatonicChords.map((item)=><button key={item.roman} className={chordRoot===item.root && chordType===item.type && !customChord ? 'selected' : ''} onClick={()=>{setChordRoot(item.root);setChordType(item.type);setCustomChord(null)}}><span>{item.roman}</span><strong>{NOTES[item.root]}{CHORD_TYPES[item.type].suffix || ''}</strong><small>{CHORD_TYPES[item.type].name}</small></button>)}</div><div className="secondary-dominants"><span>常用副属和弦</span>{secondaryDominants.map((item)=><button key={item.label} onClick={()=>{setChordRoot(item.root);setChordType('dominant7');setCustomChord(null)}}><strong>{NOTES[item.root]}7</strong><small>{item.label} → {NOTES[item.target.root]}{CHORD_TYPES[item.target.type].suffix || ''}</small></button>)}</div></section></>}
          <div className="chord-controls">
            <span className="preset-label">或使用预设</span>
            <label>根音<select value={chordRoot} onChange={(e) => { setChordRoot(Number(e.target.value)); setCustomChord(null) }}>{NOTES.map((note, index) => <option value={index} key={note}>{note}</option>)}</select></label>
            <label>和弦类型<select value={chordType} onChange={(e) => { setChordType(e.target.value as ChordType); setCustomChord(null) }}>{Object.entries(CHORD_TYPES).map(([key, value]) => <option value={key} key={key}>{value.name}（{value.suffix || 'Major'}）</option>)}</select></label>
            <div className="chord-theory"><span>音程公式 <strong>{effectiveFormula}</strong></span><span>组成音 <strong>{chordNotes.join(' · ')}</strong></span></div>
          </div>
          <div className="derivation-note"><Sparkles size={16}/><div><strong>已推导出 {chordVoicings.length} 种可用指法</strong><span>覆盖全部和弦音、最低音为根音、横跨不超过四品，并限制为四个手指可完成的组合。</span></div></div>
          <div className="chord-results">{chordVoicings.length ? chordVoicings.map((shape, shapeIndex) => {
            const pressed = shape.filter((f): f is number => f !== null && f > 0)
            const minFret = pressed.length ? Math.min(...pressed) : 1
            const maxFret = pressed.length ? Math.max(...pressed) : 1
            const baseFret = maxFret <= 4 ? 1 : minFret
            const playShape = () => shape.forEach((fret, i) => { if (fret !== null) window.setTimeout(() => playGuitar(5-i, fret), i*38) })
            return <article className="chord-card" key={shape.join(',')} role="button" tabIndex={0} onClick={playShape} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); playShape() } }} aria-label={`试听 ${NOTES[effectiveRoot]}${effectiveSuffix} 按法 ${shapeIndex + 1}`}>
              <div className="chord-card-head"><strong>{NOTES[effectiveRoot]}{effectiveSuffix}</strong><span>按法 {shapeIndex + 1}</span></div>
              <svg viewBox="0 0 150 190" role="img" aria-label={`${NOTES[effectiveRoot]}${effectiveSuffix} 和弦图`}>
                {baseFret > 1 && <text x="5" y="57" className="fret-offset">{baseFret}fr</text>}
                {Array.from({length:6},(_,i)=><line key={`s${i}`} x1={25+i*20} y1="35" x2={25+i*20} y2="155" className="diagram-string"/>)}
                {Array.from({length:5},(_,i)=><line key={`f${i}`} x1="25" y1={35+i*30} x2="125" y2={35+i*30} className={i===0&&baseFret===1?'diagram-nut':'diagram-fret'}/>)}
                {shape.map((fret,i) => fret === null ? <text key={i} x={25+i*20} y="24" className="mute">×</text> : fret === 0 ? <circle key={i} cx={25+i*20} cy="18" r="6" className="open-string"/> : <circle key={i} cx={25+i*20} cy={50+(fret-baseFret)*30} r="8" className="finger-dot"/>)}
                {shape.map((fret,i) => fret === null ? null : <text key={`n${i}`} x={25+i*20} y="176" className={(DIAGRAM_OPEN[i]+fret)%12===effectiveRoot?'root-name':'tone-name'}>{NOTES[(DIAGRAM_OPEN[i]+fret)%12]}</text>)}
              </svg>
            </article>
          }) : <div className="no-voicing">当前搜索范围没有找到符合条件的按法，请尝试其他和弦。</div>}</div>
          <p className="algorithm-credit">推导算法参考 youngdro/guitarChord，经授权集成并适配 TypeScript 与当前指板模型。</p>
        </section>}
        {learningTheory && <section className="theory-panel">
          <div className="theory-tabs"><button className={theoryLesson === 'notes' ? 'active' : ''} onClick={() => setTheoryLesson('notes')}>01 · 基础音名</button><button className={theoryLesson === 'intervals' ? 'active' : ''} onClick={() => setTheoryLesson('intervals')}>02 · 音程</button><button className={theoryLesson === 'solfege' ? 'active' : ''} onClick={() => setTheoryLesson('solfege')}>03 · 音名与唱名</button></div>
          {theoryLesson === 'notes' ? <div className="notes-lesson">
            <div className="lesson-copy"><span className="lesson-number">LESSON 01</span><h2>音乐中有 12 个音</h2><p>相邻两个音之间相差一个<strong>半音</strong>，在吉他上就是相邻一品。走完 12 个半音后，音名重新循环，但音高升高一个八度。</p><div className="tip"><strong>记忆重点</strong><span>E–F 和 B–C 之间没有升降音，它们天然相邻；其他自然音之间都隔着一个升音。</span></div></div>
            <div className="chromatic-notes">{NOTES.map((note, index) => <button key={note} className={!note.includes('♯') ? 'natural' : ''} onClick={() => playGuitar(5, ((index - OPEN_NOTES[5] + 12) % 12) || 12)}><strong>{note}</strong><small>{note.includes('♯') ? '升音' : '自然音'}</small></button>)}</div>
          </div> : theoryLesson === 'intervals' ? <div className="interval-lesson">
            <div className="interval-builder"><span className="lesson-number">INTERVAL BUILDER</span><h2>{NOTES[intervalRoot]} → {NOTES[(intervalRoot + selectedInterval) % 12]}</h2><strong>{INTERVALS.find((item) => item[2] === selectedInterval)?.[0]}</strong><p>{selectedInterval} 个半音 · 同一根弦上相隔 {selectedInterval} 品</p><div><select value={intervalRoot} onChange={(e) => setIntervalRoot(Number(e.target.value))}>{NOTES.map((note, i) => <option key={note} value={i}>{note}</option>)}</select><button onClick={() => { const fret = ((intervalRoot - 4 + 12) % 12) || 12; playGuitar(5, fret); window.setTimeout(() => playGuitar(5, fret + selectedInterval), 550) }}><Play size={15}/> 试听音程</button></div></div>
            <div className="interval-grid">{INTERVALS.map(([name, symbol, semitones]) => <button key={symbol} className={selectedInterval === semitones ? 'selected' : ''} onClick={() => setSelectedInterval(semitones)}><span>{symbol}</span><strong>{name}</strong><small>{semitones} 半音</small></button>)}</div>
          </div> : <div className="solfege-lesson">
            <div className="solfege-guide"><span className="lesson-number">FIXED DO · 固定调</span><h2>音名、简谱与唱名</h2><p>固定调中，C 永远唱 Do、写作 1。音名表示音的身份，唱名帮助开口唱，数字简谱便于记录旋律。</p><div className="solfege-map">{SOLFEGE.map((item) => <button key={item.note} onClick={() => playGuitar(5, ((item.noteIndex - OPEN_NOTES[5] + 12) % 12) || 12)}><strong>{item.note}</strong><span>{item.number}</span><small>{item.name}</small></button>)}</div><div className="tip"><strong>记忆口诀</strong><span>CDEFGAB 对应 1234567，也就是 Do Re Mi Fa Sol La Si。</span></div></div>
            <div className="solfege-quiz">
              <div className="quiz-top"><span>双向快答</span><div><strong>{solfegeScore}</strong> 答对 <strong>{solfegeStreak}</strong> 连击</div></div>
              <p>{solfegeDirection.endsWith('Number') ? '它对应哪个数字简谱？' : solfegeDirection.endsWith('Note') ? '它对应哪个音名？' : '它对应哪个唱名？'}</p>
              <div className="quiz-prompt">{solfegeDirection.startsWith('note') ? SOLFEGE[solfegeQuestion].note : solfegeDirection.startsWith('number') ? SOLFEGE[solfegeQuestion].number : SOLFEGE[solfegeQuestion].name}</div>
              <div className="quiz-answers">{SOLFEGE.map((item) => { const value = solfegeDirection.endsWith('Number') ? item.number : solfegeDirection.endsWith('Note') ? item.note : item.name; const current = SOLFEGE[solfegeQuestion]; const expected = solfegeDirection.endsWith('Number') ? current.number : solfegeDirection.endsWith('Note') ? current.note : current.name; const answered = solfegeFeedback === value; return <button key={value} className={solfegeFeedback ? (value === expected ? 'right' : answered ? 'wrong' : '') : ''} onClick={() => answerSolfege(value)}>{value}</button> })}</div>
              <small className="quiz-hint">答题后会播放对应音高，试着跟着唱出来</small>
            </div>
          </div>}
        </section>}
        {learningScale && <div className="scale-controls">
          <label>根音<select value={scaleRoot} onChange={(e) => setScaleRoot(Number(e.target.value))}>{NOTES.map((note, index) => <option key={note} value={index}>{note}</option>)}</select></label>
          <label>音阶<select value={scaleType} onChange={(e) => setScaleType(e.target.value as ScaleType)}>{Object.entries(SCALES).map(([key, scale]) => <option key={key} value={key}>{scale.name}</option>)}</select></label>
          <button onClick={playCurrentScale}><Play size={15}/> 播放音阶</button>
          <button className={scaleSequenceActive ? 'sequence-active' : ''} disabled={!scaleSequence.length} onClick={() => { setScaleSequenceActive(!scaleSequenceActive); setScaleSequenceStep(0) }}>{scaleSequenceActive ? '结束顺序练习' : '开始顺序练习'}</button>
          <button className="direction-btn" onClick={() => {setScaleDescending(!scaleDescending);setScaleSequenceStep(0)}}>{scaleDescending?'下行':'上行'}</button>
          <div className="scale-legend"><span><i className="root-dot"/>根音</span><span><i/>音阶音</span></div>
        </div>}
        {appMode !== 'theory' && !learningTheory && appMode !== 'chords' && appMode !== 'recorder' && <div className={`input-panel input-float ${inputState === 'listening' ? 'connected' : ''} ${calibrationOpen ? 'expanded' : ''}`}>
          <div className="input-symbol">{inputState === 'listening' ? <Mic size={19}/> : <Cable size={19}/>}</div>
          <div className="input-copy">
            <strong>{inputState === 'listening' ? '吉他输入已连接' : '使用真实吉他作答'}</strong>
            <span>{inputState === 'listening' ? (liveFretboardMap ? '实时显示正在弹奏的实际音高位置' : '弹出目标音符即可自动作答') : '连接 USB 声卡或使用设备麦克风'}</span>
          </div>
          {inputState === 'listening' && <div className="pitch-monitor">
            <div className="level"><i style={{width: `${inputLevel * 100}%`}} /></div>
            <strong className={pitchStable ? 'stable' : ''}>{detectedNote || '—'}</strong><span>{detectedHz ? `${detectedCents > 0 ? '+' : ''}${detectedCents} cent` : '等待声音'}</span>
          </div>}
          {inputState === 'listening' && inputDevices.length > 1 && <select value={deviceId} onChange={(e) => void connectInput(e.target.value)} aria-label="输入设备">
            {inputDevices.map((device, i) => <option value={device.deviceId} key={device.deviceId}>{device.label || `音频输入 ${i + 1}`}</option>)}
          </select>}
          <button className="connect-btn" disabled={inputState === 'requesting'} onClick={() => inputState === 'listening' ? stopInput() : void connectInput()}>
            {inputState === 'listening' ? <><MicOff size={16}/> 断开</> : <><Mic size={16}/> {inputState === 'requesting' ? '连接中…' : '连接输入'}</>}
          </button>
          {inputState === 'listening' && <button className={`live-map-btn ${liveFretboardMap ? 'active' : ''}`} onClick={() => setLiveFretboardMap(!liveFretboardMap)}>{liveFretboardMap ? '关闭实时地图' : '开启实时地图'}</button>}
          {inputState === 'listening' && <button className="calibrate-btn" onClick={() => setCalibrationOpen(!calibrationOpen)}>{calibrationOpen ? '收起' : '校准'}</button>}
          {inputState === 'error' && <p className="input-error">{inputError}</p>}
          {inputState === 'listening' && calibrationOpen && <div className="calibration">
            <div className="tuner">
              <span>♭</span><div className="tuner-track"><i className="tuner-center"/><b style={{left: `${Math.max(2, Math.min(98, 50 + detectedCents))}%`}} /></div><span>♯</span>
              <strong>{detectedNote ? (Math.abs(detectedCents) <= 5 ? '音准正确' : detectedCents < 0 ? '音偏低' : '音偏高') : '弹奏一个单音进行测试'}</strong>
              <small>{detectedHz ? `${detectedHz.toFixed(1)} Hz · ${pitchStable ? '音高稳定' : '正在确认音高'}` : '建议使用干净音色，并逐根弦拨奏'}</small>
            </div>
            <label><span>输入灵敏度 <em>{noiseGate <= 7 ? '高' : noiseGate <= 14 ? '中' : '低'}</em></span><input type="range" min="3" max="25" value={noiseGate} onChange={(e) => setNoiseGate(Number(e.target.value))}/><small>环境嘈杂或出现误触时向右调</small></label>
            <label><span>识别稳定度 <em>{stability <= 5 ? '快速' : stability <= 9 ? '均衡' : '稳定'}</em></span><input type="range" min="4" max="14" value={stability} onChange={(e) => setStability(Number(e.target.value))}/><small>误判较多时向右调，响应会稍慢</small></label>
          </div>}
        </div>}
        {appMode === 'training' && <div className="stats">
          <div><Timer size={17}/><span>剩余时间</span><strong className={timeLeft <= 10 ? 'danger' : ''}>{timeLeft}<small>秒</small></strong></div>
          <i />
          <div><Trophy size={17}/><span>得分</span><strong>{score.toLocaleString()}</strong></div>
          <i />
          <div><Flame size={17}/><span>连击</span><strong>{streak}<small>x</small></strong></div>
        </div>}

        {appMode !== 'theory' && !learningTheory && appMode !== 'chords' && appMode !== 'recorder' && appMode !== 'drums' && !(appMode === 'learning' && learningView === 'ear') && <div className="fretboard-scroll">
          <div className="fret-numbers" style={{gridTemplateColumns: `var(--fret-label-width, 62px) repeat(${visibleFretCount}, minmax(var(--fret-cell-min, 54px), 1fr))`}}>
            <span />{Array.from({length: visibleFretCount}, (_, index) => <span key={visibleMinFret + index}>{visibleMinFret + index}</span>)}
          </div>
          <div className={`fretboard ${fretboardStyle} ${status === 'finished' ? 'review' : ''} ${appMode === 'learning' && learningView === 'explore' ? 'learning' : ''} ${appMode === 'learning' && learningView === 'interval' ? 'interval-learning' : ''} ${appMode === 'learning' && learningView === 'ear' ? 'ear-learning' : ''} ${learningScale ? 'scale-mode' : ''}`}>
            {activeStrings.map((active, string) => (
              <div className={`string-row ${!active ? 'disabled' : ''} ${appMode === 'training' && status === 'playing' && ['stringLocate','adaptive','scaleDegree','chordTone'].includes(trainingType) ? (string === targetString ? 'target-string' : 'non-target-string') : ''}`} key={string} style={{gridTemplateColumns: `var(--fret-label-width, 62px) repeat(${visibleFretCount}, minmax(var(--fret-cell-min, 54px), 1fr))`}}>
                {(() => {
                  const openNote = noteAt(string, 0)
                  const openHit = feedback?.string === string && feedback.fret === 0
                  const openScaleClass = learningScale && scaleNotes.has(openNote) ? (openNote === NOTES[scaleRoot] ? 'scale-root' : 'scale-note') : ''
                  const openLiveClass = liveFretboardMap && pitchStable && detectedMidi === OPEN_MIDI[string] ? 'live-pitch-position' : ''
                  return <button className={`string-label ${openHit ? (feedback.correct ? 'correct' : 'wrong') : ''} ${openScaleClass} ${openLiveClass}`} disabled={!active} onClick={() => learningScale ? playGuitar(string, 0) : choose(string, 0)} title={appMode === 'training' ? `${string + 1}弦空弦` : `${STRING_NAMES[string]} 空弦`}>
                    <span>{appMode === 'training' ? `${string + 1}弦` : STRING_NAMES[string]}</span>
                    <b>{appMode === 'learning' || openScaleClass || openLiveClass ? openNote : ''}</b>
                  </button>
                })()}
                {Array.from({length: visibleFretCount}, (_, index) => {
                  const fret = index + visibleMinFret
                  const hit = feedback?.string === string && feedback.fret === fret
                  const currentNote = noteAt(string, fret)
                  const scaleClass = learningScale && scaleNotes.has(currentNote) ? (currentNote === NOTES[scaleRoot] ? 'scale-root' : 'scale-note') : ''
                  const history = positionStats[`${string}-${fret}`]
                  const historyTotal = history ? history.correct + history.wrong : 0
                  const historyRate = historyTotal ? history.correct / historyTotal : 1
                  const heatClass = status === 'finished' && historyTotal >= 2 ? (historyRate < .5 ? 'heat-weak' : historyRate < .8 ? 'heat-warn' : 'heat-strong') : ''
                  const questionClass = appMode === 'training' && status === 'playing' && ['identify','octave','interval','intervalShape'].includes(trainingType) && questionPosition.string === string && questionPosition.fret === fret ? 'question-position' : ''
                  const foundClass = trainingType === 'allNotes' && foundPositions.includes(`${string}-${fret}`) ? 'found-position' : ''
                  const sequenceIndex = learningScale ? orderedScaleSequence.findIndex((position)=>position.string===string&&position.fret===fret) : -1
                  const sequenceClass = scaleSequenceActive && sequenceIndex === scaleSequenceStep ? 'sequence-next' : scaleSequenceActive && sequenceIndex > -1 && sequenceIndex < scaleSequenceStep ? 'sequence-done' : ''
                  const earRevealClass = appMode === 'learning' && learningView === 'ear' && learningEarRevealed && OPEN_MIDI[string]+fret === OPEN_MIDI[learningEarPosition.string]+learningEarPosition.fret ? 'ear-revealed-position' : ''
                  const intervalAnchorClass = appMode === 'learning' && learningView === 'interval' && learningIntervalPair?.anchor.string === string && learningIntervalPair.anchor.fret === fret ? 'interval-anchor-position' : ''
                  const intervalTargetClass = appMode === 'learning' && learningView === 'interval' && learningIntervalPair?.target.string === string && learningIntervalPair.target.fret === fret ? 'interval-target-position' : ''
                  const livePitchClass = liveFretboardMap && pitchStable && detectedMidi === OPEN_MIDI[string] + fret ? 'live-pitch-position' : ''
                  const arpeggioIndex = trainingType === 'arpeggio' ? arpeggioPath.findIndex((position)=>position.string===string&&position.fret===fret) : -1
                  const arpeggioClass = arpeggioIndex > -1 ? (arpeggioIndex < arpeggioStep ? 'path-done' : arpeggioIndex === arpeggioStep ? 'path-next' : 'path-future') : ''
                  return <button key={fret} onClick={() => learningScale ? handleScaleSequenceClick(string, fret) : choose(string, fret)} disabled={!active} className={`${hit ? (feedback.correct ? 'correct' : 'wrong') : ''} ${scaleClass} ${heatClass} ${questionClass} ${foundClass} ${sequenceClass} ${earRevealClass} ${intervalAnchorClass} ${intervalTargetClass} ${livePitchClass} ${arpeggioClass}`}>
                    <span className="string-wire" style={{height: `${1 + string * .45}px`}} />
                    <b>{arpeggioIndex > -1 && arpeggioIndex <= arpeggioStep ? arpeggioIndex+1 : (appMode === 'learning' && (learningView === 'explore' || learningView === 'interval')) || status === 'finished' || hit || scaleClass || earRevealClass || intervalAnchorClass || intervalTargetClass || livePitchClass ? currentNote : ''}</b>
                  </button>
                })}
              </div>
            ))}
            <div className="markers" style={{gridTemplateColumns: `var(--fret-label-width, 62px) repeat(${visibleFretCount}, minmax(var(--fret-cell-min, 54px), 1fr))`}}>
              <span />{Array.from({length: visibleFretCount}, (_, index) => { const fret = index + visibleMinFret; return <span key={fret}>{MARKERS.has(fret) && <i className={fret === 12 ? 'double' : ''}/>}</span> })}
            </div>
          </div>
        </div>}

        {appMode === 'training' && status === 'playing' && trainingType === 'identify' && <div className="note-answers">{NOTES.map((note) => <button key={note} onClick={() => answerIdentification(note)}>{note}</button>)}</div>}

        {appMode === 'training' && status === 'finished' && <section className="weak-review">
          <div className="weak-review-head"><div><span>长期学习记录</span><h3>薄弱位置</h3></div><div className="heat-legend"><span><i className="good"/>熟练</span><span><i className="medium"/>待加强</span><span><i className="weak"/>薄弱</span></div></div>
          {weakPositions.length ? <div className="weak-list">{weakPositions.map((item, index) => <div key={`${item.string}-${item.fret}`}><strong>#{index + 1}</strong><span>{item.string + 1}弦 · {item.fret === 0 ? '空弦' : `${item.fret}品`}</span><b>{noteAt(item.string, item.fret)}</b><em>{item.accuracy}%</em><small>{item.correct} 对 / {item.wrong} 错 · {item.averageMs ? `${(item.averageMs/1000).toFixed(1)}秒` : '待测速'}</small></div>)}</div> : <p className="no-history">继续完成几次训练后，这里会显示你最容易出错的指板位置。</p>}
        </section>}

        {appMode !== 'theory' && !learningTheory && appMode !== 'chords' && appMode !== 'recorder' && appMode !== 'drums' && !(appMode === 'learning' && learningView === 'ear') && <div className="game-actions">
          {appMode === 'training' && status === 'idle' && <><button className="primary" onClick={startGame}>开始训练 <span>60 秒</span></button><button className="focus-launch" onClick={enterFocusTraining}>全屏训练</button></>}
          {appMode === 'training' && status === 'playing' && <><button className="quit" onClick={() => setStatus('finished')}>提前结束</button><button className="focus-launch" onClick={enterFocusTraining}>全屏训练</button></>}
          {appMode === 'training' && status === 'finished' && <button className="primary" onClick={startGame}><RotateCcw size={18}/> 再来一局</button>}
          {appMode === 'learning' && !learningScale && <button className="primary" onClick={() => { setAppMode('training'); setStatus('idle') }}>去训练场检验记忆</button>}
          {learningScale && <button className="primary" onClick={() => {setScaleSequenceActive(true);setScaleSequenceStep(0)}}><Play size={17}/> 开始{scaleDescending?'下行':'上行'}顺序练习</button>}
          <p>{learningScale ? (scaleSequenceActive ? `请点击发光音符 · 第 ${scaleSequenceStep+1}/${orderedScaleSequence.length} 个` : '点击“顺序练习”，按上行或下行顺序完成一个八度') : appMode === 'learning' ? '相同音名使用相同颜色，帮助你识别八度与横向规律' : status === 'idle' ? '找出目标音符在指板上的任意正确位置' : status === 'playing' ? '答对得 100 分，连续答对还有额外加成' : '所有音符已显示，可以复盘这一局'}</p>
        </div>}
      </section>

      <footer><span>标准调弦 · E A D G B E</span><span>用耳朵听，也用眼睛记</span></footer>

      {settingsOpen && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
        <aside className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setSettingsOpen(false)}><X size={20}/></button>
          <div className="modal-icon"><Settings2 size={21}/></div><h2>训练设置</h2><p>控制本局出现的指板范围</p>
          <label className="field-label">练习范围 <strong>{minFret} – {maxFret} 品</strong></label>
          <div className="dual-fret-range"><div className="dual-range-track" style={{background:`linear-gradient(90deg,#303630 0 ${((minFret-1)/17)*100}%,#b8ee50 ${((minFret-1)/17)*100}% ${((maxFret-1)/17)*100}%,#303630 ${((maxFret-1)/17)*100}% 100%)`}}/><input aria-label="起始品" type="range" min="1" max="18" value={minFret} onChange={(e) => setMinFret(Math.min(Number(e.target.value), maxFret - 1))}/><input aria-label="结束品" type="range" min="1" max="18" value={maxFret} onChange={(e) => setMaxFret(Math.max(Number(e.target.value), minFret + 1))}/><div className="dual-range-values"><span>起始 <b>{minFret}</b></span><span>结束 <b>{maxFret}</b></span></div></div>
          <label className="field-label board-style-title">指板外观</label>
          <div className="board-style-options">
            <button className={fretboardStyle === 'practice' ? 'selected' : ''} onClick={() => setFretboardStyle('practice')}>
              <span className="style-preview practice-preview"><i/><i/><i/></span><strong>训练模式</strong><small>高对比，更容易定位</small>
            </button>
            <button className={fretboardStyle === 'realistic' ? 'selected' : ''} onClick={() => setFretboardStyle('realistic')}>
              <span className="style-preview wood-preview"><i/><i/><i/></span><strong>玫瑰木</strong><small>经典深棕色木纹</small>
            </button>
            <button className={fretboardStyle === 'ebony' ? 'selected' : ''} onClick={() => setFretboardStyle('ebony')}>
              <span className="style-preview ebony-preview"><i/><i/><i/></span><strong>乌木</strong><small>近黑色，纹理细密</small>
            </button>
            <button className={fretboardStyle === 'maple' ? 'selected' : ''} onClick={() => setFretboardStyle('maple')}>
              <span className="style-preview maple-preview"><i/><i/><i/></span><strong>枫木</strong><small>浅黄明亮木色</small>
            </button>
          </div>
          <label className="field-label strings-title">参与练习的弦</label>
          <div className="string-toggles">{STRING_NAMES.map((name, i) => <button key={name} className={activeStrings[i] ? 'selected' : ''} onClick={() => {
            if (activeStrings.filter(Boolean).length === 1 && activeStrings[i]) return
            setActiveStrings((all) => all.map((v, j) => j === i ? !v : v))
          }}>{name}</button>)}</div>
          <button className="primary modal-save" onClick={() => setSettingsOpen(false)}>保存设置</button>
        </aside>
      </div>}
    </main>
  )
}

export default App
