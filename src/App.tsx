import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Guitar, Play, RotateCcw, Settings2, Smartphone, Sparkles, Square, Volume2, X } from 'lucide-react'
import { findScaleFingering } from './lib/scaleFingering'
import { clearLearningData, loadJson, POSITION_STATS_KEY, PREFERENCES_KEY, saveJson } from './lib/storage'
import { ScaleControls } from './features/scales/ScaleControls'
import { SettingsModal } from './features/settings/SettingsModal'
import { Fretboard } from './components/Fretboard'
import { AudioInputPanel } from './features/audio/AudioInputPanel'
import { useAudioInput } from './features/audio/useAudioInput'
import { RecorderStudio } from './features/recorder/RecorderStudio'
import { useRecorder } from './features/recorder/useRecorder'
import { DrumMachine } from './features/drums/DrumMachine'
import { useDrumMachine } from './features/drums/useDrumMachine'
import { TrainingNavigation } from './features/training/TrainingNavigation'
import { TrainingStats } from './features/training/TrainingStats'
import { WeakReview } from './features/training/WeakReview'
import { LearningToolbar } from './features/learning/LearningToolbar'
import { IntervalLearningPanel } from './features/learning/IntervalLearningPanel'
import { GuitarAnatomyPage } from './features/beginner/GuitarAnatomyPage'
import { GuitarStringsLessonPage } from './features/beginner/GuitarStringsLessonPage'
import { NoteNamesLessonPage } from './features/beginner/NoteNamesLessonPage'
import { ToneDistanceLessonPage } from './features/beginner/ToneDistanceLessonPage'
import { FretPositionsLessonPage } from './features/beginner/FretPositionsLessonPage'
import { OneStringNotesLessonPage } from './features/beginner/OneStringNotesLessonPage'
import { ChromaticNotesLessonPage } from './features/beginner/ChromaticNotesLessonPage'
import { WholeFretboardLessonPage } from './features/beginner/WholeFretboardLessonPage'
import { FirstMelodyLessonPage } from './features/beginner/FirstMelodyLessonPage'
import { FirstChordLessonPage } from './features/beginner/FirstChordLessonPage'
import { FirstChordProgressionLessonPage } from './features/beginner/FirstChordProgressionLessonPage'
import { MajorMinorChordLessonPage } from './features/beginner/MajorMinorChordLessonPage'
import { MelodyHarmonyLessonPage } from './features/beginner/MelodyHarmonyLessonPage'
import { MelodyAccompanimentLessonPage } from './features/beginner/MelodyAccompanimentLessonPage'
import { DailyPracticePage, DailySessionBar } from './features/daily/DailyPracticePage'
import { AssessmentPage } from './features/assessment/AssessmentPage'
import { ASSESSMENT_STAGES, loadPracticeProfile, PRACTICE_PROFILE_KEY, updatePracticeProfile } from './lib/practiceProfile'
import type { PracticeSession, StageResult } from './lib/practiceProfile'
import type { AppMode, Feedback, FretboardStyle, KeyMode, LearningView, PositionStats, Preferences, SolfegeDirection, Status, TrainingType } from './types'

const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
const OPEN_NOTES = [4, 11, 7, 2, 9, 4] // high E → low E
const OPEN_MIDI = [64, 59, 55, 50, 45, 40] // E4 → E2
const HALF_STEP_LESSON_HIGHLIGHTS = Object.fromEntries(OPEN_MIDI.flatMap((midi,string)=>Array.from({length:13},(_,fret)=>{
  const pitch=(midi+fret)%12
  return pitch===4||pitch===5?[`${string}-${fret}`,'ef' as const]:pitch===11||pitch===0?[`${string}-${fret}`,'bc' as const]:null
}).filter((entry):entry is [string,'ef'|'bc']=>entry!==null)))
const SAMPLE_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const STRING_NAMES = ['1弦 E', '2弦 B', '3弦 G', '4弦 D', '5弦 A', '6弦 E']

function loadPreferences(): Partial<Preferences> {
  return loadJson<Partial<Preferences>>(PREFERENCES_KEY, {})
}

function loadPositionStats(): PositionStats {
  return loadJson<PositionStats>(POSITION_STATS_KEY, {})
}

const SCALES = {
  major: { name: '大调音阶', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: '自然小调', intervals: [0, 2, 3, 5, 7, 8, 10] },
  majorPentatonic: { name: '大调五声音阶', intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { name: '小调五声音阶', intervals: [0, 3, 5, 7, 10] },
  blues: { name: '布鲁斯音阶', intervals: [0, 3, 5, 6, 7, 10] },
} satisfies Record<string, { name: string; intervals: number[] }>
type ScaleType = keyof typeof SCALES
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
const DIAGRAM_OPEN = [4, 9, 2, 7, 11, 4] // low E → high E
const CAGED_SHAPES = {
  C: { root: 0, frets: [null, 3, 2, 0, 1, 0], tip: '根音在第 5 弦；向上移动时，以横按替代开放弦。' },
  A: { root: 9, frets: [null, 0, 2, 2, 2, 0], tip: '根音在第 5 弦；是最容易连接横按和弦的形状。' },
  G: { root: 7, frets: [3, 2, 0, 0, 0, 3], tip: '覆盖六根弦，适合认识低音根音与高音重复根音。' },
  E: { root: 4, frets: [0, 2, 2, 1, 0, 0], tip: '根音在第 6 弦；向上移动后就是常用的大横按形状。' },
  D: { root: 2, frets: [null, null, 0, 2, 3, 2], tip: '高音区形状，根音在第 4 弦，适合连接旋律与和弦。' },
} as const
const CAGED_C_MAJOR = {
  C: { shift: 0, frets: [null, 3, 2, 0, 1, 0], position: '开放位', rootString: '5 弦 3 品' },
  A: { shift: 3, frets: [null, 3, 5, 5, 5, 3], position: '第 3 把位', rootString: '5 弦 3 品' },
  G: { shift: 5, frets: [8, 7, 5, 5, 5, 8], position: '第 5 把位', rootString: '6 弦 8 品' },
  E: { shift: 8, frets: [8, 10, 10, 9, 8, 8], position: '第 8 把位', rootString: '6 弦 8 品' },
  D: { shift: 10, frets: [null, null, 10, 12, 13, 12], position: '第 10 把位', rootString: '4 弦 10 品' },
} as const
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
  const initialPracticeProfile = useMemo(loadPracticeProfile, [])
  const [practiceProfile,setPracticeProfile]=useState(initialPracticeProfile)
  const [appMode, setAppMode] = useState<AppMode>(()=>initialPracticeProfile.assessmentCompleted?'training':'assessment')
  const [beginnerLesson,setBeginnerLesson]=useState<'anatomy'|'strings'|'notes'|'tones'|'frets'|'one-string'|'chromatic'|'whole-board'|'melody'|'first-chord'|'first-progression'|'major-minor'|'melody-harmony'|'accompaniment'>('anatomy')
  const [dailyStep,setDailyStep]=useState<number|null>(null)
  const [assessmentStep,setAssessmentStep]=useState<number|null>(null)
  const [assessmentResult,setAssessmentResult]=useState<StageResult[]|null>(null)
  const [assessmentFretRange,setAssessmentFretRange]=useState<{min:number;max:number}|null>(null)
  const {bpm:drumBpm,setBpm:setDrumBpm,drumPlaying,setDrumPlaying,metronomePlaying,setMetronomePlaying,metronomeBeat,drumStep,pattern:drumPattern,setPattern:setDrumPattern,playMetronomeClick}=useDrumMachine()
  const [learningView, setLearningView] = useState<LearningView>('explore')
  const [cagedShape, setCagedShape] = useState<keyof typeof CAGED_SHAPES>('C')
  const [cagedAnimating, setCagedAnimating] = useState(false)
  const [learningIntervalSemitones, setLearningIntervalSemitones] = useState(7)
  const [learningIntervalAnchorString, setLearningIntervalAnchorString] = useState(5)
  const [selectedEarNote, setSelectedEarNote] = useState(0)
  const [earLesson, setEarLesson] = useState<'pitch' | 'relative' | 'fretboard' | 'library'>('pitch')
  const [learningEarPosition, setLearningEarPosition] = useState({ string: 5, fret: 1 })
  const [learningEarRevealed, setLearningEarRevealed] = useState(false)
  const [trainingType, setTrainingType] = useState<TrainingType>('locate')
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
  const [scalePlaybackPosition, setScalePlaybackPosition] = useState<{string:number;fret:number} | null>(null)
  const [scalePlaybackStart, setScalePlaybackStart] = useState<{string:number;fret:number} | null>(null)
  const [scalePlaybackActive, setScalePlaybackActive] = useState(false)
  const [scalePlaybackError, setScalePlaybackError] = useState('')
  const [scalePlaybackBpm, setScalePlaybackBpm] = useState(90)
  const [scalePlaybackBpmDraft, setScalePlaybackBpmDraft] = useState('90')
  const [scalePlaybackMetronome, setScalePlaybackMetronome] = useState(false)
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
  const [scaleFocus, setScaleFocus] = useState(false)
  const [fretboardStyle, setFretboardStyle] = useState<FretboardStyle>(() => initialPreferences.fretboardStyle ?? 'practice')
  const [soundOn, setSoundOn] = useState(() => initialPreferences.soundOn ?? true)
  const [calibrationOpen, setCalibrationOpen] = useState(false)
  const [liveFretboardMap, setLiveFretboardMap] = useState(false)
  const [noiseGate, setNoiseGate] = useState(() => initialPreferences.noiseGate ?? 8)
  const [stability, setStability] = useState(() => initialPreferences.stability ?? 7)
  const timerRef = useRef<number | null>(null)
  const questionStartedRef = useRef(Date.now())
  const correctRef=useRef(0),attemptsRef=useRef(0),scoreRef=useRef(0)
  const stageStartCountsRef=useRef({correct:0,attempts:0})
  const programResultsRef=useRef<StageResult[]>([])
  const stagePerformanceRef=useRef({masteryTotal:0,completed:0,slowCorrect:0,timeouts:0,wrongClicks:0,responseTotalMs:0})
  const questionWrongRef=useRef(0),questionActiveRef=useRef(false)
  const questionPositionRef=useRef(questionPosition)
  const practiceProfileRef=useRef(practiceProfile),positionStatsRef=useRef(positionStats)
  const answerRef = useRef<(note: string) => void>(() => {})
  const playbackContextRef = useRef<AudioContext | null>(null)
  const guitarSampleCache = useRef(new Map<number, AudioBuffer>())
  const scalePlaybackTimersRef = useRef<number[]>([])
  const {state:inputState,devices:inputDevices,deviceId,detectedNote,detectedMidi,detectedHz,detectedCents,pitchStable,inputLevel,error:inputError,stream:inputStream,connect:connectInput,stop:stopInput}=useAudioInput({notes:NOTES,noiseGate,stability,status,onStableNote:(note)=>answerRef.current(note)})
  const {state:recordingState,url:recordingUrl,seconds:recordingSeconds,mime:recordingMime,start:startRecording,stop:stopRecording,clear:clearRecording}=useRecorder(inputStream)

  const availableNotes = useMemo(() => {
    const found = new Set<string>()
    activeStrings.forEach((on, string) => {
      if (on) for (let fret = minFret; fret <= maxFret; fret++) found.add(noteAt(string, fret))
    })
    return [...found]
  }, [activeStrings, minFret, maxFret])

  useEffect(() => {
    const preferences: Preferences = { minFret, maxFret, activeStrings, fretboardStyle, soundOn, noiseGate, stability }
    saveJson(PREFERENCES_KEY, preferences)
  }, [minFret, maxFret, activeStrings, fretboardStyle, soundOn, noiseGate, stability])

  useEffect(() => {
    saveJson(POSITION_STATS_KEY, positionStats)
  }, [positionStats])

  useEffect(()=>{correctRef.current=correct;attemptsRef.current=attempts;scoreRef.current=score},[attempts,correct,score])
  useEffect(()=>{practiceProfileRef.current=practiceProfile;saveJson(PRACTICE_PROFILE_KEY,practiceProfile)},[practiceProfile])
  useEffect(()=>{positionStatsRef.current=positionStats},[positionStats])
  useEffect(()=>{questionPositionRef.current=questionPosition},[questionPosition])

  const nextTarget = useCallback((current?: string) => {
    const pool = availableNotes.filter((note) => note !== current)
    const next = pool[Math.floor(Math.random() * pool.length)] || availableNotes[0] || 'C'
    setTarget(next)
  }, [availableNotes])

  const prepareQuestion = useCallback((current?: string) => {
    const enabled = activeStrings.map((on, index) => on ? index : -1).filter((index) => index >= 0)
    const string = enabled[Math.floor(Math.random() * enabled.length)] ?? 0
    const fret = minFret + Math.floor(Math.random() * (maxFret - minFret + 1))
    setFoundPositions([]); setArpeggioStep(0); questionStartedRef.current = Date.now();questionWrongRef.current=0;questionActiveRef.current=true
    if (trainingType === 'positionAssessment') {
      const ranges=[{min:1,max:4},{min:5,max:8},{min:9,max:12}],range=ranges[Math.floor(Math.random()*ranges.length)]
      const assessmentFret=range.min+Math.floor(Math.random()*(range.max-range.min+1))
      setAssessmentFretRange(range);setQuestionPosition({string,fret:assessmentFret});setTarget(noteAt(string,assessmentFret))
    } else if (trainingType === 'adaptive') {
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

  const disconnectInput = useCallback(() => {
    stopRecording(); stopInput(); setLiveFretboardMap(false)
  }, [stopInput, stopRecording])

  const selectInput = useCallback((selectedId?: string) => {
    stopRecording(); setLiveFretboardMap(false); void connectInput(selectedId)
  }, [connectInput, stopRecording])

  const startGame = () => {
    setScore(0); setStreak(0); setBestStreak(0); setCorrect(0); setAttempts(0)
    setTimeLeft(60); setFeedback(null); setFoundPositions([]); prepareQuestion(); setStatus('playing')
  }

  const startDailyPractice = () => {
    setScore(0); setStreak(0); setBestStreak(0); setCorrect(0); setAttempts(0)
    correctRef.current=0;attemptsRef.current=0;scoreRef.current=0;programResultsRef.current=[];stageStartCountsRef.current={correct:0,attempts:0}
    setFeedback(null); setFoundPositions([]); setDailyStep(0); setAppMode('training'); setStatus('idle')
  }

  const startAssessment = () => {
    setScore(0);setStreak(0);setBestStreak(0);setCorrect(0);setAttempts(0)
    correctRef.current=0;attemptsRef.current=0;scoreRef.current=0;programResultsRef.current=[];stageStartCountsRef.current={correct:0,attempts:0}
    setAssessmentResult(null);setDailyStep(null);setAssessmentStep(0);setAppMode('training');setStatus('idle')
  }

  const skipAssessment = () => {
    setPracticeProfile((profile)=>({...profile,assessmentCompleted:true}));setAssessmentResult(null);setAssessmentStep(null);setLearningView('explore');setAppMode('learning');setStatus('idle')
  }


  const exitDailyPractice = () => {
    setDailyStep(null); setStatus('idle'); setAppMode('daily'); setFocusTraining(false)
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  }

  const exitAssessment = () => {
    setAssessmentStep(null);setAssessmentResult(null);setAssessmentFretRange(null);setStatus('idle');setAppMode('assessment');setFocusTraining(false);programResultsRef.current=[]
    if(document.fullscreenElement)void document.exitFullscreen().catch(()=>undefined)
  }

  const captureProgramStage = useCallback((type:TrainingType) => {
    const shownFor=Date.now()-questionStartedRef.current,minOpportunity=type==='earLocate'?4000:2000
    if(questionActiveRef.current&&shownFor>=minOpportunity){stagePerformanceRef.current.completed+=1;stagePerformanceRef.current.timeouts+=1;questionActiveRef.current=false
      if(['identify','positionAssessment','earLocate','octave','interval','intervalShape','adaptive','scaleDegree','chordTone'].includes(type)){const position=questionPositionRef.current,key=`${position.string}-${position.fret}`
        setPositionStats((all)=>{const previous=all[key]||{correct:0,wrong:0};return {...all,[key]:{...previous,wrong:previous.wrong+1,timeouts:(previous.timeouts||0)+1,mastery:Math.round((previous.mastery??50)*.75),lastSeen:Date.now()}}})}
    }
    questionActiveRef.current=false
    const correctCount=Math.max(0,correctRef.current-stageStartCountsRef.current.correct),attemptCount=Math.max(0,attemptsRef.current-stageStartCountsRef.current.attempts)
    const performance=stagePerformanceRef.current
    const result:StageResult={type,correct:correctCount,attempts:attemptCount,accuracy:attemptCount?Math.round(correctCount/attemptCount*100):0,mastery:performance.completed?Math.round(performance.masteryTotal/performance.completed):0,slowCorrect:performance.slowCorrect,timeouts:performance.timeouts,wrongClicks:performance.wrongClicks,averageResponseMs:correctCount?Math.round(performance.responseTotalMs/correctCount):undefined}
    programResultsRef.current.push(result);stageStartCountsRef.current={correct:correctRef.current,attempts:attemptsRef.current};return result
  },[])

  const currentQuestionMastery = (isCorrect:boolean) => {
    if(!isCorrect)return 0
    const elapsed=Date.now()-questionStartedRef.current,wrong=questionWrongRef.current,fastLimit=trainingType==='earLocate'?4500:2500,slowLimit=trainingType==='earLocate'?8000:5500
    if(wrong>=2)return 20
    if(wrong===1)return 45
    if(elapsed<=fastLimit)return 100
    if(elapsed<=slowLimit)return 72
    return 40
  }

  const recordQuestionPerformance = (isCorrect:boolean) => {
    if(dailyStep===null&&assessmentStep===null)return currentQuestionMastery(isCorrect)
    if(!isCorrect){questionWrongRef.current+=1;stagePerformanceRef.current.wrongClicks+=1;return 0}
    const elapsed=Date.now()-questionStartedRef.current,mastery=currentQuestionMastery(true),slowLimit=trainingType==='earLocate'?8000:5500
    stagePerformanceRef.current.masteryTotal+=mastery;stagePerformanceRef.current.completed+=1;stagePerformanceRef.current.responseTotalMs+=elapsed
    if(elapsed>slowLimit)stagePerformanceRef.current.slowCorrect+=1
    questionActiveRef.current=false
    return mastery
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

  const enterScaleFocus = () => {
    setScaleFocus(true)
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  const exitScaleFocus = () => {
    setScaleFocus(false)
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  }

  useEffect(() => {
    const syncFullscreen = () => { if (!document.fullscreenElement) { setFocusTraining(false); setScaleFocus(false) } }
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    if (dailyStep === null || appMode !== 'training' || status !== 'idle') return
    const stage=practiceProfile.dailyPlan[dailyStep]
    if (trainingType !== stage.type) { setTrainingType(stage.type); return }
    stageStartCountsRef.current={correct:correctRef.current,attempts:attemptsRef.current}
    stagePerformanceRef.current={masteryTotal:0,completed:0,slowCorrect:0,timeouts:0,wrongClicks:0,responseTotalMs:0}
    setTimeLeft(Math.round(stage.minutes*60)); setFeedback(null); setFoundPositions([]); prepareQuestion(); setStatus('playing')
  }, [appMode,dailyStep,practiceProfile.dailyPlan,prepareQuestion,status,trainingType])

  useEffect(()=>{
    if(assessmentStep===null||appMode!=='training'||status!=='idle')return
    if(assessmentStep>=ASSESSMENT_STAGES.length){setAssessmentStep(0);return}
    const stage=ASSESSMENT_STAGES[assessmentStep]
    if(trainingType!==stage.type){setTrainingType(stage.type);return}
    if(stage.type!=='positionAssessment')setAssessmentFretRange(null)
    stageStartCountsRef.current={correct:correctRef.current,attempts:attemptsRef.current}
    stagePerformanceRef.current={masteryTotal:0,completed:0,slowCorrect:0,timeouts:0,wrongClicks:0,responseTotalMs:0}
    setTimeLeft(Math.round(stage.minutes*60));setFeedback(null);setFoundPositions([]);prepareQuestion();setStatus('playing')
  },[appMode,assessmentStep,prepareQuestion,status,trainingType])

  useEffect(()=>{
    if(dailyStep!==null&&dailyStep>=practiceProfile.dailyPlan.length){setDailyStep(practiceProfile.dailyPlan.length?0:null);setStatus('idle')}
  },[dailyStep,practiceProfile.dailyPlan.length])

  useEffect(() => {
    if (status !== 'playing') return
    timerRef.current = window.setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          if(assessmentStep!==null){captureProgramStage(ASSESSMENT_STAGES[assessmentStep].type);if(assessmentStep<ASSESSMENT_STAGES.length-1){const nextStep=assessmentStep+1;setStatus('idle');setAssessmentStep(nextStep);return Math.round(ASSESSMENT_STAGES[nextStep].minutes*60)}const stages=[...programResultsRef.current],session:PracticeSession={kind:'assessment',completedAt:Date.now(),score:scoreRef.current,accuracy:Math.round(stages.reduce((sum,item)=>sum+item.correct,0)/Math.max(1,stages.reduce((sum,item)=>sum+item.attempts,0))*100),stages};const updated=updatePracticeProfile(practiceProfileRef.current,session,positionStatsRef.current);setPracticeProfile(updated);setAssessmentResult(stages);setAssessmentStep(null);setAssessmentFretRange(null);setAppMode('assessment');setStatus('finished');return 0}
          if (dailyStep !== null) {const plan=practiceProfileRef.current.dailyPlan;captureProgramStage(plan[dailyStep].type);if(dailyStep < plan.length-1){setStatus('idle');setDailyStep((step)=>step===null?null:step+1);return Math.round(plan[dailyStep+1].minutes*60)}const stages=[...programResultsRef.current],session:PracticeSession={kind:'daily',completedAt:Date.now(),score:scoreRef.current,accuracy:Math.round(stages.reduce((sum,item)=>sum+item.correct,0)/Math.max(1,stages.reduce((sum,item)=>sum+item.attempts,0))*100),stages};setPracticeProfile((profile)=>updatePracticeProfile(profile,session,positionStatsRef.current));setStatus('finished');return 0}
          setStatus('finished'); return 0
        }
        return time - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [assessmentStep,captureProgramStage,dailyStep,status])

  const choose = (string: number, fret: number) => {
    if (appMode === 'learning') {
      const isCorrect = learningView !== 'ear' || OPEN_MIDI[string]+fret === OPEN_MIDI[learningEarPosition.string]+learningEarPosition.fret
      setFeedback({ string, fret, correct: isCorrect }); playGuitar(string, fret)
      if (isCorrect && learningView === 'ear') setLearningEarRevealed(true)
      window.setTimeout(() => setFeedback(null), 350)
      return
    }
    if (status !== 'playing' || !activeStrings[string]) return
    if(trainingType==='positionAssessment'&&assessmentFretRange&&(fret<assessmentFretRange.min||fret>assessmentFretRange.max))return
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
    const questionMastery=recordQuestionPerformance(isCorrect)
    setPositionStats((all) => {
      const previous = all[positionKey] || { correct: 0, wrong: 0 }
      const elapsed=Date.now()-questionStartedRef.current; const completed=previous.correct+(isCorrect?1:0); const averageMs=isCorrect?Math.round(((previous.averageMs||elapsed)*previous.correct+elapsed)/Math.max(1,completed)):previous.averageMs
      const mastery=isCorrect?(previous.mastery===undefined?questionMastery:Math.round(previous.mastery*.7+questionMastery*.3)):Math.round((previous.mastery??50)*.9)
      return { ...all, [positionKey]: { ...previous, correct: completed, wrong: previous.wrong + (isCorrect ? 0 : 1), averageMs, mastery, slowCorrect:(previous.slowCorrect||0)+(isCorrect&&questionMastery===40?1:0), lastSeen:Date.now() } }
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
    const questionMastery=recordQuestionPerformance(isCorrect)
    setAttempts((n) => n + 1); setFeedback({ string, fret, correct: isCorrect }); playGuitar(string, fret)
    setPositionStats((all) => { const previous = all[key] || { correct:0, wrong:0 }; const elapsed=Date.now()-questionStartedRef.current; const completed=previous.correct+(isCorrect?1:0);const mastery=isCorrect?(previous.mastery===undefined?questionMastery:Math.round(previous.mastery*.7+questionMastery*.3)):Math.round((previous.mastery??50)*.9); return {...all,[key]:{...previous,correct:completed,wrong:previous.wrong+(isCorrect?0:1),averageMs:isCorrect?Math.round(((previous.averageMs||elapsed)*previous.correct+elapsed)/Math.max(1,completed)):previous.averageMs,mastery,slowCorrect:(previous.slowCorrect||0)+(isCorrect&&questionMastery===40?1:0),lastSeen:Date.now()}} })
    if (isCorrect) {
      const nextStreak = streak + 1
      setCorrect((n) => n + 1); setStreak(nextStreak); setBestStreak((n) => Math.max(n,nextStreak)); setScore((n) => n + 100 + Math.min(nextStreak-1,10)*10)
      window.setTimeout(() => { setFeedback(null); prepareQuestion(target) }, 380)
    } else { setStreak(0); setScore((n) => Math.max(0,n-20)); window.setTimeout(() => setFeedback(null), 420) }
  }

  const answerByNote = (note: string) => {
    if (status !== 'playing') return
    const isCorrect = note === target
    recordQuestionPerformance(isCorrect)
    setAttempts((n) => n + 1); playTone(note, isCorrect)
    if (isCorrect) {
      const nextStreak = streak + 1
      setCorrect((n) => n + 1); setStreak(nextStreak); setBestStreak((n) => Math.max(n, nextStreak))
      setScore((n) => n + 100 + Math.min(nextStreak - 1, 10) * 10)
      prepareQuestion(target)
    } else { setStreak(0); setScore((n) => Math.max(0, n - 20)) }
  }
  answerRef.current = answerByNote

  const accuracy = attempts ? Math.round(correct / attempts * 100) : 0
  const positionAssessmentActive=assessmentStep!==null&&trainingType==='positionAssessment'
  const visibleMinFret = positionAssessmentActive ? 1 : appMode === 'training' ? minFret : 1
  const visibleMaxFret = positionAssessmentActive ? 12 : appMode === 'training' ? maxFret : 15
  const visibleFretCount = visibleMaxFret - visibleMinFret + 1
  const learningScale = appMode === 'learning' && learningView === 'scales'
  const learningTheory = appMode === 'learning' && learningView === 'theory'
  const learningCaged = appMode === 'learning' && learningView === 'caged'
  const cagedPositions = useMemo(() => new Set(CAGED_C_MAJOR[cagedShape].frets.flatMap((fret, diagramString) => fret === null ? [] : [{ string: 5 - diagramString, fret }] ).map((position) => `${position.string}-${position.fret}`)), [cagedShape])

  useEffect(() => {
    if (!cagedAnimating || !learningCaged) return
    const shapes = Object.keys(CAGED_C_MAJOR) as Array<keyof typeof CAGED_C_MAJOR>
    const timer = window.setInterval(() => setCagedShape((shape) => shapes[(shapes.indexOf(shape) + 1) % shapes.length]), 1800)
    return () => window.clearInterval(timer)
  }, [cagedAnimating, learningCaged])
  const learningIntervalPair = useMemo(() => {
    const learningFretLimit = appMode === 'learning' ? 15 : maxFret
    const targetString = learningIntervalAnchorString - 1
    for (let fret = 1; fret <= learningFretLimit; fret++) {
      const targetFret = OPEN_MIDI[learningIntervalAnchorString] + fret + learningIntervalSemitones - OPEN_MIDI[targetString]
      if (targetFret >= 1 && targetFret <= learningFretLimit) return { anchor: { string: learningIntervalAnchorString, fret }, target: { string: targetString, fret: targetFret } }
    }
    return null
  }, [appMode, learningIntervalAnchorString, learningIntervalSemitones, maxFret])
  const scaleNotes = useMemo(() => new Set(SCALES[scaleType].intervals.map((interval) => NOTES[(scaleRoot + interval) % 12])), [scaleRoot, scaleType])
  const scaleSequence = useMemo(() => {
    // 学习音阶始终使用完整指板，而不是训练设置中的弦和品位范围。
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
  }, [scaleRoot,scaleType])
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
    const playStep = (position: {string:number;fret:number}, index: number) => {
        setScalePlaybackPosition(position)
        if (scalePlaybackMetronome) playMetronomeClick(index % 4 === 0)
        playGuitar(position.string, position.fret)
    }
    // 第一颗音同步发出，确保浏览器把这次播放视为用户手势，音频不会被拦截。
    const scheduleCycle = () => {
      if (path[0]) playStep(path[0], 0)
      path.slice(1).forEach((position, index) => scalePlaybackTimersRef.current.push(window.setTimeout(() => playStep(position, index + 1), (index + 1) * beatMs)))
      scalePlaybackTimersRef.current.push(window.setTimeout(scheduleCycle, path.length * beatMs))
    }
    setScalePlaybackActive(true)
    scheduleCycle()
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
    <main className={`app-${appMode} ${assessmentStep!==null?'assessment-running':''} ${focusTraining ? 'training-focus' : ''} ${scaleFocus ? 'scale-focus' : ''}`}>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Guitar size={19}/></span><span>Fret<span>Seek</span></span></a>
        <nav>
          <button className={appMode === 'daily' ? 'nav-active' : ''} onClick={() => { setDailyStep(null); setAppMode('daily'); setStatus('idle') }}>今日 10 分钟</button>
          <button className={appMode === 'beginner' ? 'nav-active' : ''} onClick={() => { setDailyStep(null); setBeginnerLesson('anatomy'); setAppMode('beginner'); setStatus('idle') }}>零基础</button>
          <button className={appMode === 'training' && dailyStep === null ? 'nav-active' : ''} onClick={() => { setDailyStep(null); setAppMode('training'); setStatus('idle') }}>训练场</button>
          <button className={appMode === 'learning' ? 'nav-active' : ''} onClick={() => { setDailyStep(null); setAppMode('learning'); setStatus('idle') }}>学习模式</button>
          <button className={appMode === 'chords' ? 'nav-active' : ''} onClick={() => { setDailyStep(null); setAppMode('chords'); setStatus('idle') }}>和弦推导</button>
          <button className={appMode === 'drums' ? 'nav-active' : ''} onClick={() => { setDailyStep(null); setAppMode('drums'); setStatus('idle') }}>节奏鼓机</button>
          <button className={appMode === 'recorder' ? 'nav-active' : ''} onClick={() => { setDailyStep(null); setAppMode('recorder'); setStatus('idle') }}>录音机</button>
        </nav>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setSoundOn(!soundOn)} aria-label="声音"><Volume2 size={18} className={!soundOn ? 'muted' : ''}/></button>
          <button className="settings-btn" onClick={() => setSettingsOpen(true)}><Settings2 size={17}/> 设置</button>
        </div>
      </header>

      {((appMode === 'training' && status === 'playing') || (appMode === 'learning' && ['explore','interval','scales'].includes(learningView))) && <div className="portrait-orientation-guard" role="dialog" aria-modal="true" aria-label="请横屏使用指板"><div className="rotate-phone"><Smartphone size={42}/><i>↻</i></div><strong>请将手机横过来</strong><p>横屏后可以完整查看吉他指板<br/>页面会自动恢复，无需刷新</p><button onClick={()=>setSettingsOpen(true)}><Settings2 size={14}/> 打开设置</button></div>}

      {appMode === 'training' && dailyStep === null && assessmentStep === null && <TrainingNavigation trainingType={trainingType} status={status} onSelect={(type)=>{setTrainingType(type);setStatus('idle')}}/>}
      {appMode === 'training' && dailyStep !== null && <DailySessionBar stages={practiceProfile.dailyPlan} step={dailyStep} timeLeft={timeLeft} onExit={exitDailyPractice}/>}
      {appMode === 'training' && assessmentStep !== null && <DailySessionBar stages={ASSESSMENT_STAGES} step={assessmentStep} timeLeft={timeLeft} label="首次能力诊断" onExit={exitAssessment}/>}

      {appMode !== 'beginner' && <section className="hero">
        <div className="eyebrow"><Sparkles size={14}/> {appMode === 'assessment' ? '先诊断，再制定真正适合你的课程' : appMode === 'daily' ? '定位、关系、应用与听觉，一次完成' : appMode === 'drums' ? '为节拍、分解和即兴提供稳定律动' : appMode === 'recorder' ? '记录每一次练习与灵感' : appMode === 'chords' ? '从组成音推导可弹奏的吉他指法' : learningTheory ? '理解规则，才能更快记住指板' : learningScale ? '看见音阶在整块指板上的形状' : appMode === 'learning' ? '观察、聆听，熟悉音符之间的关系' : '每天 5 分钟，认识整块指板'}</div>
        <h1>{appMode === 'assessment' ? assessmentResult?'诊断分析':'能力诊断' : appMode === 'daily' ? '今日混合练习' : appMode === 'drums' ? '练琴节奏鼓机' : appMode === 'recorder' ? '吉他录音机' : appMode === 'chords' ? '吉他和弦推导' : learningTheory ? '吉他基础乐理' : learningScale ? '音阶练习' : appMode === 'learning' ? '自由探索指板' : status === 'finished' ? dailyStep !== null ? '今日练习完成' : '本局完成' : '找到这个音'}</h1>
        {appMode === 'chords' && <div className="scale-heading"><strong>{NOTES[effectiveRoot]}{effectiveSuffix}</strong><small>{effectiveName} · {effectiveFormula} · {chordNotes.join(' · ')}</small></div>}
        {learningTheory && <div className="scale-heading"><strong>{theoryLesson === 'notes' ? '认识十二个音' : theoryLesson === 'intervals' ? '理解音程距离' : '音名与唱名转换'}</strong><small>{theoryLesson === 'notes' ? '从 C 到 B，读懂指板上的语言' : theoryLesson === 'intervals' ? '两个音之间的距离，构成旋律与和弦' : 'C D E F G A B ↔ 1 2 3 4 5 6 7'}</small></div>}
        {learningScale && <div className="scale-heading"><strong>{NOTES[scaleRoot]} {SCALES[scaleType].name}</strong><small>{SCALES[scaleType].intervals.map((interval) => NOTES[(scaleRoot + interval) % 12]).join(' · ')}</small></div>}
        {appMode === 'learning' && !learningScale && !learningTheory && <div className="learning-title"><strong>{learningView === 'ear' ? '听音实验室' : learningView === 'interval' ? '指板音程形状' : learningView === 'caged' ? 'CAGED 和弦形状' : '全音符地图'}</strong><small>{learningView === 'ear' ? '先熟悉、再对比，建立十二音的听觉印象' : learningView === 'interval' ? '用两根弦之间的固定形状，快速建立空间记忆' : learningView === 'caged' ? '用五个开放和弦形状连接整块指板' : '点击任意音符试听'}</small></div>}
        {appMode === 'training' && status !== 'finished' && <div className={`target-note ${status === 'idle' ? 'dim' : ''}`}>{status === 'idle' ? '?' : trainingType === 'identify' ? '看指板' : trainingType === 'earLocate' ? <Volume2 size={52}/> : trainingType === 'octave' ? '8度' : trainingType === 'interval' || trainingType === 'intervalShape' ? INTERVALS.find((item)=>item[2]===targetInterval)?.[1] : trainingType === 'scaleDegree' ? `${SCALES[scaleType].intervals.indexOf(trainingGoalOffset)+1}级` : trainingType === 'chordTone' ? ({0:'根音',3:'小三音',4:'大三音',6:'减五音',7:'五音',9:'减七音',10:'小七音',11:'大七音'} as Record<number,string>)[trainingGoalOffset] || `${trainingGoalOffset}半音` : target}<small>{status === 'idle' ? '准备好了吗' : trainingType === 'identify' ? '选择高亮位置的音名' : trainingType === 'earLocate' ? '听声音，找到相同实际音高的位置' : trainingType === 'adaptive' ? `薄弱位置复习 · 只在第 ${targetString+1} 弦寻找 ${target}` : trainingType === 'scaleDegree' ? `${NOTES[scaleRoot]} ${SCALES[scaleType].name} · 第 ${targetString+1} 弦 · 目标音 ${target}` : trainingType === 'chordTone' ? `${NOTES[chordRoot]}${CHORD_TYPES[chordType].suffix || 'Major'} · 第 ${targetString+1} 弦 · 目标音 ${target}` : trainingType === 'arpeggio' ? `按音高上行点击 · ${arpeggioStep}/${arpeggioPath.length}` : trainingType === 'stringLocate' ? `只在第 ${targetString + 1} 弦上寻找` : trainingType === 'allNotes' ? `找出全部 ${target} · 已找到 ${foundPositions.length} 个` : trainingType === 'octave' ? '从根音寻找上方八度音' : trainingType === 'intervalShape' ? `从根音在第 ${targetString+1} 弦复现上行${INTERVALS.find((item)=>item[2]===targetInterval)?.[0]}形状` : trainingType === 'interval' ? `从根音寻找上行${INTERVALS.find((item)=>item[2]===targetInterval)?.[0]}` : '点击指板上的正确位置'}</small>{status === 'playing' && trainingType === 'earLocate' && <button className="replay-note" onClick={() => playGuitar(questionPosition.string,questionPosition.fret)}><Volume2 size={13}/> 再听一次</button>}</div>}
        {appMode === 'training' && status === 'finished' && (
          <div className="result-summary">
            <strong>{score.toLocaleString()}</strong><span>分</span>
            <p>答对 {correct} 题 · 正确率 {accuracy}% · 最佳连击 {bestStreak}</p>
          </div>
        )}
      </section>}

      <section className={`game-wrap mode-${appMode} ${appMode === 'training' ? `training-${status}` : ''}`}>
        {appMode === 'assessment' && <AssessmentPage profile={practiceProfile} result={assessmentResult} onStart={startAssessment} onSkip={skipAssessment} onContinue={()=>{setAssessmentResult(null);setAppMode('daily');setStatus('idle')}}/>}
        {appMode === 'daily' && <DailyPracticePage stages={practiceProfile.dailyPlan} onStart={startDailyPractice}/>}
        {appMode === 'beginner' && beginnerLesson === 'anatomy' && <GuitarAnatomyPage onNext={()=>setBeginnerLesson('strings')}/>} 
        {appMode === 'beginner' && beginnerLesson === 'strings' && <GuitarStringsLessonPage onBack={()=>setBeginnerLesson('anatomy')} onNext={()=>setBeginnerLesson('notes')} onPlay={playGuitar} renderFretboard={(onStringSelect,activeString)=><Fretboard appMode="learning" status="idle" trainingType={trainingType} style={fretboardStyle} activeStrings={[true,true,true,true,true,true]} stringNames={STRING_NAMES} minFret={1} fretCount={5} activeFretRange={null} targetString={targetString} feedback={null} learningView="explore" learningScale={false} learningCaged={false} scaleRootNote="C" scaleNotes={new Set<string>()} scaleSequenceActive={false} scaleSequenceStep={0} orderedScaleSequence={[]} scalePlaybackPosition={null} scalePlaybackStart={null} liveFretboardMap={false} pitchStable={false} detectedMidi={null} openMidi={OPEN_MIDI} positionStats={positionStats} questionPosition={questionPosition} foundPositions={[]} learningEarRevealed={false} learningEarPosition={learningEarPosition} learningIntervalPair={null} cagedPositions={new Set<string>()} arpeggioPath={[]} arpeggioStep={0} noteAt={noteAt} onChoose={(string,fret)=>{onStringSelect(string);playGuitar(string,fret)}} onScaleClick={(string,fret)=>{onStringSelect(string);playGuitar(string,fret)}} onPlay={playGuitar} onSelectScaleStart={({string,fret})=>{onStringSelect(string);playGuitar(string,fret)}} highlightString={activeString}/>}/>} 
        {appMode === 'beginner' && beginnerLesson === 'notes' && <NoteNamesLessonPage onBack={()=>setBeginnerLesson('strings')} onNext={()=>setBeginnerLesson('tones')} onPlay={playGuitar}/>} 
        {appMode === 'beginner' && beginnerLesson === 'tones' && <ToneDistanceLessonPage onBack={()=>setBeginnerLesson('notes')} onNext={()=>setBeginnerLesson('frets')} onPlay={playGuitar} renderFretboard={<Fretboard appMode="learning" status="idle" trainingType={trainingType} style={fretboardStyle} activeStrings={[true,true,true,true,true,true]} stringNames={STRING_NAMES} minFret={1} fretCount={12} activeFretRange={null} targetString={targetString} feedback={null} learningView="explore" learningScale={false} learningCaged={false} scaleRootNote="C" scaleNotes={new Set<string>()} scaleSequenceActive={false} scaleSequenceStep={0} orderedScaleSequence={[]} scalePlaybackPosition={null} scalePlaybackStart={null} liveFretboardMap={false} pitchStable={false} detectedMidi={null} openMidi={OPEN_MIDI} positionStats={positionStats} questionPosition={questionPosition} foundPositions={[]} learningEarRevealed={false} learningEarPosition={learningEarPosition} learningIntervalPair={null} cagedPositions={new Set<string>()} arpeggioPath={[]} arpeggioStep={0} noteAt={noteAt} onChoose={playGuitar} onScaleClick={playGuitar} onPlay={playGuitar} onSelectScaleStart={({string,fret})=>playGuitar(string,fret)} lessonHighlights={HALF_STEP_LESSON_HIGHLIGHTS}/>}/>} 
        {appMode === 'beginner' && beginnerLesson === 'frets' && <FretPositionsLessonPage onBack={()=>setBeginnerLesson('tones')} onNext={()=>setBeginnerLesson('one-string')} onPlay={playGuitar} renderFretboard={(activeString,activeFret,onSelect)=><Fretboard appMode="learning" status="idle" trainingType={trainingType} style={fretboardStyle} activeStrings={[true,true,true,true,true,true]} stringNames={STRING_NAMES} minFret={1} fretCount={12} activeFretRange={null} targetString={targetString} feedback={null} learningView="fret-lesson" learningScale={false} learningCaged={false} scaleRootNote="C" scaleNotes={new Set<string>()} scaleSequenceActive={false} scaleSequenceStep={0} orderedScaleSequence={[]} scalePlaybackPosition={null} scalePlaybackStart={null} liveFretboardMap={false} pitchStable={false} detectedMidi={null} openMidi={OPEN_MIDI} positionStats={positionStats} questionPosition={questionPosition} foundPositions={[]} learningEarRevealed={false} learningEarPosition={learningEarPosition} learningIntervalPair={null} cagedPositions={new Set<string>()} arpeggioPath={[]} arpeggioStep={0} noteAt={noteAt} onChoose={onSelect} onScaleClick={onSelect} onPlay={playGuitar} onSelectScaleStart={({string,fret})=>onSelect(string,fret)} lessonActivePosition={{string:activeString,fret:activeFret}}/>}/>} 
        {appMode === 'beginner' && beginnerLesson === 'one-string' && <OneStringNotesLessonPage onBack={()=>setBeginnerLesson('frets')} onNext={()=>setBeginnerLesson('chromatic')} onPlay={playGuitar} renderFretboard={(activeFret,naturalFrets,onSelect)=><Fretboard appMode="learning" status="idle" trainingType={trainingType} style={fretboardStyle} activeStrings={[true,true,true,true,true,true]} stringNames={STRING_NAMES} minFret={1} fretCount={12} activeFretRange={null} targetString={targetString} feedback={null} learningView="one-string-lesson" learningScale={false} learningCaged={false} scaleRootNote="C" scaleNotes={new Set<string>()} scaleSequenceActive={false} scaleSequenceStep={0} orderedScaleSequence={[]} scalePlaybackPosition={null} scalePlaybackStart={null} liveFretboardMap={false} pitchStable={false} detectedMidi={null} openMidi={OPEN_MIDI} positionStats={positionStats} questionPosition={questionPosition} foundPositions={[]} learningEarRevealed={false} learningEarPosition={learningEarPosition} learningIntervalPair={null} cagedPositions={new Set<string>()} arpeggioPath={[]} arpeggioStep={0} noteAt={noteAt} onChoose={onSelect} onScaleClick={onSelect} onPlay={playGuitar} onSelectScaleStart={({string,fret})=>onSelect(string,fret)} highlightString={5} lessonActivePosition={{string:5,fret:activeFret}} lessonNaturalPositions={new Set(naturalFrets.map((fret)=>`5-${fret}`))}/>}/>} 
        {appMode === 'beginner' && beginnerLesson === 'chromatic' && <ChromaticNotesLessonPage onBack={()=>setBeginnerLesson('one-string')} onNext={()=>setBeginnerLesson('whole-board')} onPlay={playGuitar} renderFretboard={(activeFret,frets,onSelect)=><Fretboard appMode="learning" status="idle" trainingType={trainingType} style={fretboardStyle} activeStrings={[true,true,true,true,true,true]} stringNames={STRING_NAMES} minFret={1} fretCount={12} activeFretRange={null} targetString={targetString} feedback={null} learningView="chromatic-lesson" learningScale={false} learningCaged={false} scaleRootNote="C" scaleNotes={new Set<string>()} scaleSequenceActive={false} scaleSequenceStep={0} orderedScaleSequence={[]} scalePlaybackPosition={null} scalePlaybackStart={null} liveFretboardMap={false} pitchStable={false} detectedMidi={null} openMidi={OPEN_MIDI} positionStats={positionStats} questionPosition={questionPosition} foundPositions={[]} learningEarRevealed={false} learningEarPosition={learningEarPosition} learningIntervalPair={null} cagedPositions={new Set<string>()} arpeggioPath={[]} arpeggioStep={0} noteAt={noteAt} onChoose={onSelect} onScaleClick={onSelect} onPlay={playGuitar} onSelectScaleStart={({string,fret})=>onSelect(string,fret)} highlightString={5} lessonActivePosition={{string:5,fret:activeFret}} lessonNaturalPositions={new Set(frets.map((fret)=>`5-${fret}`))}/>}/>} 
        {appMode === 'beginner' && beginnerLesson === 'whole-board' && <WholeFretboardLessonPage onBack={()=>setBeginnerLesson('chromatic')} onNext={()=>setBeginnerLesson('melody')} onPlay={playGuitar} renderFretboard={(config,onSelect)=><Fretboard appMode="learning" status="idle" trainingType={trainingType} style={fretboardStyle} activeStrings={[true,true,true,true,true,true]} stringNames={STRING_NAMES} minFret={1} fretCount={12} activeFretRange={null} targetString={targetString} feedback={null} learningView="whole-board-lesson" learningScale={false} learningCaged={false} scaleRootNote="C" scaleNotes={new Set<string>()} scaleSequenceActive={false} scaleSequenceStep={0} orderedScaleSequence={[]} scalePlaybackPosition={null} scalePlaybackStart={null} liveFretboardMap={false} pitchStable={false} detectedMidi={null} openMidi={OPEN_MIDI} positionStats={positionStats} questionPosition={questionPosition} foundPositions={[]} learningEarRevealed={false} learningEarPosition={learningEarPosition} learningIntervalPair={null} cagedPositions={new Set<string>()} arpeggioPath={[]} arpeggioStep={0} noteAt={noteAt} onChoose={onSelect} onScaleClick={onSelect} onPlay={playGuitar} onSelectScaleStart={({string,fret})=>onSelect(string,fret)} highlightString={config.selectedString??undefined} lessonActivePosition={config.activePosition} lessonNaturalPositions={config.positions}/>}/>} 
        {appMode === 'beginner' && beginnerLesson === 'melody' && <FirstMelodyLessonPage onBack={()=>setBeginnerLesson('whole-board')} onNext={()=>setBeginnerLesson('first-chord')} onPlay={playGuitar} renderFretboard={(active,positions,onSelect)=><Fretboard appMode="learning" status="idle" trainingType={trainingType} style={fretboardStyle} activeStrings={[true,true,true,true,true,true]} stringNames={STRING_NAMES} minFret={1} fretCount={4} activeFretRange={null} targetString={targetString} feedback={null} learningView="melody-lesson" learningScale={false} learningCaged={false} scaleRootNote="C" scaleNotes={new Set<string>()} scaleSequenceActive={false} scaleSequenceStep={0} orderedScaleSequence={[]} scalePlaybackPosition={null} scalePlaybackStart={null} liveFretboardMap={false} pitchStable={false} detectedMidi={null} openMidi={OPEN_MIDI} positionStats={positionStats} questionPosition={questionPosition} foundPositions={[]} learningEarRevealed={false} learningEarPosition={learningEarPosition} learningIntervalPair={null} cagedPositions={new Set<string>()} arpeggioPath={[]} arpeggioStep={0} noteAt={noteAt} onChoose={onSelect} onScaleClick={onSelect} onPlay={playGuitar} onSelectScaleStart={({string,fret})=>onSelect(string,fret)} highlightStrings={new Set(positions.map(position=>position.string))} lessonActivePosition={active} lessonNaturalPositions={new Set(positions.map(position=>`${position.string}-${position.fret}`))}/>}/>} 
        {appMode === 'beginner' && beginnerLesson === 'first-chord' && <FirstChordLessonPage onBack={()=>setBeginnerLesson('melody')} onNext={()=>setBeginnerLesson('first-progression')} onPlay={playGuitar}/>} 
        {appMode === 'beginner' && beginnerLesson === 'first-progression' && <FirstChordProgressionLessonPage onBack={()=>setBeginnerLesson('first-chord')} onNext={()=>setBeginnerLesson('major-minor')} onPlay={playGuitar}/>} 
        {appMode === 'beginner' && beginnerLesson === 'major-minor' && <MajorMinorChordLessonPage onBack={()=>setBeginnerLesson('first-progression')} onNext={()=>setBeginnerLesson('melody-harmony')} onPlay={playGuitar}/>} 
        {appMode === 'beginner' && beginnerLesson === 'melody-harmony' && <MelodyHarmonyLessonPage onBack={()=>setBeginnerLesson('major-minor')} onNext={()=>setBeginnerLesson('accompaniment')} onPlay={playGuitar}/>} 
        {appMode === 'beginner' && beginnerLesson === 'accompaniment' && <MelodyAccompanimentLessonPage onBack={()=>setBeginnerLesson('melody-harmony')} onNext={()=>setAppMode('chords')} onPlay={playGuitar}/>} 
        {appMode === 'training' && status !== 'playing' && ['locate','stringLocate','adaptive'].includes(trainingType) && <section className="position-practice"><div><span>POSITION PRACTICE</span><strong>按把位练习</strong><small>固定手形覆盖一小段品位，强迫自己离开前五品。</small></div><div className="position-buttons">{FRET_POSITIONS.map((position)=><button key={position.label} className={minFret===position.start&&maxFret===position.end?'selected':''} onClick={()=>{setMinFret(position.start);setMaxFret(position.end)}}><strong>{position.label}</strong><small>{position.start}–{position.end} 品</small></button>)}<button className="position-custom" onClick={()=>setSettingsOpen(true)}><strong>自定义</strong><small>{minFret}–{maxFret} 品</small></button></div></section>}
        {appMode === 'training' && (status === 'playing' || focusTraining) && <div className="landscape-target-hud"><span>{status === 'finished' ? '训练完成' : '当前目标'}</span><strong>{status === 'finished' ? `${score} 分` : trainingType === 'identify' ? '识别高亮位置' : trainingType === 'earLocate' ? '听音找位置' : trainingType === 'octave' ? '8度' : trainingType === 'interval' ? INTERVALS.find((item)=>item[2]===targetInterval)?.[1] : trainingType === 'scaleDegree' ? `${([...SCALES[scaleType].intervals] as number[]).indexOf(trainingGoalOffset)+1}级 · ${target}` : trainingType === 'chordTone' ? `${target} · 和弦内音` : target}</strong><small>{status === 'finished' ? `${accuracy}%` : trainingType === 'stringLocate' || trainingType === 'adaptive' || trainingType === 'scaleDegree' || trainingType === 'chordTone' ? `第 ${targetString+1} 弦` : trainingType === 'arpeggio' ? `${arpeggioStep}/${arpeggioPath.length}` : `${timeLeft}秒`}</small>{focusTraining && <button onClick={exitFocusTraining} aria-label="退出全屏训练"><X size={15}/></button>}</div>}
        {appMode === 'training' && status === 'idle' && ['scaleDegree','chordTone','arpeggio'].includes(trainingType) && <div className="applied-training-controls">
          <span>训练内容</span><label>根音<select value={trainingType === 'scaleDegree' ? scaleRoot : chordRoot} onChange={(e)=>trainingType === 'scaleDegree' ? setScaleRoot(Number(e.target.value)) : setChordRoot(Number(e.target.value))}>{NOTES.map((note,index)=><option key={note} value={index}>{note}</option>)}</select></label>
          {trainingType === 'scaleDegree' ? <label>音阶<select value={scaleType} onChange={(e)=>setScaleType(e.target.value as ScaleType)}>{Object.entries(SCALES).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></label> : <label>和弦<select value={chordType} onChange={(e)=>setChordType(e.target.value as ChordType)}>{Object.entries(CHORD_TYPES).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></label>}
        </div>}
        {appMode === 'drums' && <DrumMachine bpm={drumBpm} drumPlaying={drumPlaying} drumStep={drumStep} metronomePlaying={metronomePlaying} metronomeBeat={metronomeBeat} pattern={drumPattern} onBpmChange={setDrumBpm} onDrumPlayingChange={setDrumPlaying} onMetronomePlayingChange={setMetronomePlaying} onPatternChange={setDrumPattern}/>} 
        {appMode === 'recorder' && <RecorderStudio inputState={inputState} devices={inputDevices} deviceId={deviceId} inputLevel={inputLevel} inputError={inputError} recordingState={recordingState} recordingUrl={recordingUrl} recordingSeconds={recordingSeconds} recordingMime={recordingMime} onSelectInput={selectInput} onDisconnect={disconnectInput} onStart={startRecording} onStop={stopRecording} onClear={clearRecording}/>} 
        {appMode === 'learning' && <LearningToolbar view={learningView} onChange={setLearningView}/>}
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
        {appMode === 'learning' && learningView === 'interval' && <IntervalLearningPanel intervals={INTERVALS} semitones={learningIntervalSemitones} anchorString={learningIntervalAnchorString} pair={learningIntervalPair} noteAt={noteAt} onSemitonesChange={setLearningIntervalSemitones} onAnchorStringChange={setLearningIntervalAnchorString} onPlay={playGuitar}/>}
        {appMode === 'learning' && learningView === 'caged' && <section className="caged-learning-panel"><div className="caged-intro"><span className="lesson-number">CAGED SYSTEM</span><h2>五个开放和弦，串起整块指板</h2><p>C、A、G、E、D 会沿着指板循环出现。先记住根音所在琴弦，再用横按把形状移动到任何调。</p></div><div className="caged-tabs">{(Object.keys(CAGED_SHAPES) as Array<keyof typeof CAGED_SHAPES>).map((shape)=><button key={shape} className={cagedShape===shape?'active':''} onClick={()=>setCagedShape(shape)}><strong>{shape}</strong><small>{NOTES[CAGED_SHAPES[shape].root]} 大和弦</small></button>)}</div><div className="caged-stage"><div className="caged-diagram"><svg viewBox="0 0 150 190">{Array.from({length:6},(_,i)=><line key={`s${i}`} x1={25+i*20} y1="35" x2={25+i*20} y2="155" className="diagram-string"/>)}{Array.from({length:5},(_,i)=><line key={`f${i}`} x1="25" y1={35+i*30} x2="125" y2={35+i*30} className={i===0?'diagram-nut':'diagram-fret'}/>)}{CAGED_SHAPES[cagedShape].frets.map((fret,i)=>fret===null?<text key={i} x={25+i*20} y="24" className="mute">×</text>:fret===0?<circle key={i} cx={25+i*20} cy="18" r="6" className="open-string"/>:<circle key={i} cx={25+i*20} cy={50+(fret-1)*30} r="8" className={(DIAGRAM_OPEN[i]+fret)%12===CAGED_SHAPES[cagedShape].root?'caged-root-dot':'finger-dot'}/>)}{CAGED_SHAPES[cagedShape].frets.map((fret,i)=>fret===null?null:<text key={`n${i}`} x={25+i*20} y="176" className={(DIAGRAM_OPEN[i]+fret)%12===CAGED_SHAPES[cagedShape].root?'root-name':'tone-name'}>{NOTES[(DIAGRAM_OPEN[i]+fret)%12]}</text>)}</svg></div><div className="caged-copy"><span>{cagedShape} SHAPE · {NOTES[CAGED_SHAPES[cagedShape].root]} MAJOR</span><h3>{NOTES[CAGED_SHAPES[cagedShape].root]} 大三和弦</h3><p>{CAGED_SHAPES[cagedShape].tip}</p><div className="caged-tones"><i>1</i><span>{NOTES[CAGED_SHAPES[cagedShape].root]}</span><i>3</i><span>{NOTES[(CAGED_SHAPES[cagedShape].root+4)%12]}</span><i>5</i><span>{NOTES[(CAGED_SHAPES[cagedShape].root+7)%12]}</span></div><button onClick={()=>CAGED_SHAPES[cagedShape].frets.forEach((fret,i)=>{if(fret!==null)window.setTimeout(()=>playGuitar(5-i,fret),i*42)})}><Play size={15}/> 试听 {NOTES[CAGED_SHAPES[cagedShape].root]} 和弦</button></div></div><div className="caged-flow"><strong>学习顺序</strong><span>开放形状</span><b>→</b><span>找根音</span><b>→</b><span>横按移动</span><b>→</b><span>连接相邻形状</span></div></section>}
        {appMode === 'learning' && learningView === 'caged' && <section className="caged-map-lesson"><div className="caged-map-head"><div><span>ONE CHORD · FIVE WINDOWS</span><h3>同一个 C 大和弦，沿指板有五个观察窗口</h3><p>切换上方形状，看亮点如何沿着指板移动。音名始终是 C、E、G，改变的只是你的手形与根音所在琴弦。</p></div><button onClick={()=>{const shape=CAGED_C_MAJOR[cagedShape];shape.frets.forEach((fret,i)=>{if(fret!==null)window.setTimeout(()=>playGuitar(5-i,fret),i*42)})}}><Play size={14}/> 试听此处 C</button></div><div className="caged-position-track">{(Object.keys(CAGED_C_MAJOR) as Array<keyof typeof CAGED_C_MAJOR>).map((shape,index)=><button key={shape} className={cagedShape===shape?'active':''} onClick={()=>setCagedShape(shape)} style={{'--shape-position':`${[2,22,42,62,82][index]}%`} as React.CSSProperties}><strong>{shape}</strong><small>{CAGED_C_MAJOR[shape].position}</small></button>)}</div><div className="caged-mini-board">{[5,4,3,2,1,0].map((string)=><div key={string} className="caged-mini-string"><span>{6-string} 弦</span>{Array.from({length:15},(_,index)=>{const fret=index+1;const active=CAGED_C_MAJOR[cagedShape].frets[5-string]===fret;const root=active&&(OPEN_MIDI[string]+fret)%12===0;return <i key={fret} className={`${active?'active':''} ${root?'root':''}`}>{active?NOTES[(OPEN_MIDI[string]+fret)%12]:''}</i>})}</div>)}</div><div className="caged-map-explain"><strong>{cagedShape} 形状 · {CAGED_C_MAJOR[cagedShape].position}</strong><span>在 {CAGED_C_MAJOR[cagedShape].rootString} 找到根音 C；其余按点围绕 C、E、G 展开。下一个形状会在更高把位重复同一组音。</span></div></section>}
        {learningCaged && <div className="caged-animation-guide"><div><span>ANIMATED WALKTHROUGH</span><strong>{cagedAnimating ? `正在移动：${cagedShape} 形 · ${CAGED_C_MAJOR[cagedShape].position}` : '播放路径，观察同一组音如何换形不换和弦'}</strong><small>{cagedAnimating ? `绿色根音保持为 C；蓝色 E、G 跟随手形移动。下一步会进入 ${(['C','A','G','E','D'] as Array<keyof typeof CAGED_C_MAJOR>)[((['C','A','G','E','D'] as Array<keyof typeof CAGED_C_MAJOR>).indexOf(cagedShape)+1)%5]} 形。` : '每 1.8 秒切换一个形状，真实指板会同步显示当前把位。'}</small></div><button className={cagedAnimating?'stop':'start'} onClick={()=>setCagedAnimating((value)=>!value)}>{cagedAnimating?<><Square size={14}/> 暂停动画</>:<><Play size={15}/> 播放 CAGED 路径</>}</button></div>}
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
        {learningScale && <ScaleControls notes={NOTES} root={scaleRoot} scales={Object.entries(SCALES).map(([value, scale]) => ({value,name:scale.name}))} scaleType={scaleType} playbackActive={scalePlaybackActive} bpm={scalePlaybackBpm} bpmDraft={scalePlaybackBpmDraft} metronome={scalePlaybackMetronome} focus={scaleFocus} sequenceActive={scaleSequenceActive} sequenceAvailable={Boolean(scaleSequence.length)} descending={scaleDescending} error={scalePlaybackError} onRootChange={(root) => {stopScalePlayback();setScalePlaybackStart(null);setScalePlaybackError('');setScaleRoot(root)}} onScaleTypeChange={(type) => setScaleType(type as ScaleType)} onTogglePlayback={scalePlaybackActive ? stopScalePlayback : playCurrentScale} onBpmDraftChange={setScalePlaybackBpmDraft} onBpmCommit={commitScalePlaybackBpm} onMetronomeChange={setScalePlaybackMetronome} onToggleFocus={scaleFocus ? exitScaleFocus : enterScaleFocus} onToggleSequence={() => {setScaleSequenceActive(!scaleSequenceActive);setScaleSequenceStep(0)}} onToggleDirection={() => {setScaleDescending(!scaleDescending);setScaleSequenceStep(0)}}/>}
        {appMode !== 'assessment' && appMode !== 'daily' && appMode !== 'beginner' && appMode !== 'theory' && !learningTheory && !learningCaged && appMode !== 'chords' && appMode !== 'recorder' && <AudioInputPanel state={inputState} devices={inputDevices} deviceId={deviceId} inputLevel={inputLevel} pitchStable={pitchStable} detectedNote={detectedNote} detectedHz={detectedHz} detectedCents={detectedCents} error={inputError} liveMap={liveFretboardMap} calibrationOpen={calibrationOpen} noiseGate={noiseGate} stability={stability} onConnect={selectInput} onDisconnect={disconnectInput} onLiveMapChange={setLiveFretboardMap} onCalibrationOpenChange={setCalibrationOpen} onNoiseGateChange={setNoiseGate} onStabilityChange={setStability}/>} 
        {appMode === 'training' && <TrainingStats timeLeft={timeLeft} score={score} streak={streak}/>}

        {appMode !== 'assessment' && appMode !== 'daily' && appMode !== 'beginner' && appMode !== 'theory' && !learningTheory && appMode !== 'chords' && appMode !== 'recorder' && appMode !== 'drums' && !(appMode === 'learning' && learningView === 'ear') && <Fretboard appMode={appMode} status={status} trainingType={trainingType} style={fretboardStyle} activeStrings={activeStrings} stringNames={STRING_NAMES} minFret={visibleMinFret} fretCount={visibleFretCount} activeFretRange={positionAssessmentActive?assessmentFretRange:null} targetString={targetString} feedback={feedback} learningView={learningView} learningScale={learningScale} learningCaged={learningCaged} scaleRootNote={NOTES[scaleRoot]} scaleNotes={scaleNotes} scaleSequenceActive={scaleSequenceActive} scaleSequenceStep={scaleSequenceStep} orderedScaleSequence={orderedScaleSequence} scalePlaybackPosition={scalePlaybackPosition} scalePlaybackStart={scalePlaybackStart} liveFretboardMap={liveFretboardMap} pitchStable={pitchStable} detectedMidi={detectedMidi} openMidi={OPEN_MIDI} positionStats={positionStats} questionPosition={questionPosition} foundPositions={foundPositions} learningEarRevealed={learningEarRevealed} learningEarPosition={learningEarPosition} learningIntervalPair={learningIntervalPair} cagedPositions={cagedPositions} arpeggioPath={arpeggioPath} arpeggioStep={arpeggioStep} noteAt={noteAt} onChoose={choose} onScaleClick={handleScaleSequenceClick} onPlay={playGuitar} onSelectScaleStart={({string,fret})=>{setScalePlaybackStart({string,fret});setScalePlaybackError('');stopScalePlayback()}}/>}

        {appMode === 'training' && status === 'playing' && trainingType === 'identify' && <div className="note-answers">{NOTES.map((note) => <button key={note} onClick={() => answerIdentification(note)}>{note}</button>)}</div>}

        {appMode === 'training' && status === 'finished' && <WeakReview positionStats={positionStats} noteAt={noteAt}/>}
        {appMode === 'training' && status === 'finished' && dailyStep !== null && <section className="daily-adjustment"><div><span>ADAPTIVE PLAN UPDATED</span><h3>下一次 10 分钟课程已经调整</h3><p>系统结合本次各阶段正确率、长期错误位置和反应速度，重新分配了练习时间。</p></div><div>{practiceProfile.dailyPlan.map((stage)=><span key={stage.type}><strong>{stage.title}</strong><b>{Number.isInteger(stage.minutes)?`${stage.minutes}:00`:`${Math.floor(stage.minutes)}:${String(Math.round(stage.minutes%1*60)).padStart(2,'0')}`}</b></span>)}</div></section>}

        {appMode !== 'assessment' && appMode !== 'daily' && appMode !== 'beginner' && appMode !== 'theory' && !learningTheory && !learningCaged && appMode !== 'chords' && appMode !== 'recorder' && appMode !== 'drums' && !(appMode === 'learning' && learningView === 'ear') && <div className="game-actions">
          {appMode === 'training' && status === 'idle' && <><button className="primary" onClick={startGame}>开始训练 <span>60 秒</span></button><button className="focus-launch" onClick={enterFocusTraining}>全屏训练</button></>}
          {appMode === 'training' && status === 'playing' && <><button className="quit" onClick={assessmentStep!==null?exitAssessment:()=>setStatus('finished')}>{assessmentStep!==null?'退出计划':'提前结束'}</button><button className="focus-launch" onClick={enterFocusTraining}>全屏训练</button></>}
          {appMode === 'training' && status === 'finished' && <button className="primary" onClick={dailyStep!==null?startDailyPractice:startGame}><RotateCcw size={18}/> {dailyStep!==null?'再练 10 分钟':'再来一局'}</button>}
          {appMode === 'learning' && !learningScale && <button className="primary" onClick={() => { setAppMode('training'); setStatus('idle') }}>去训练场检验记忆</button>}
          {learningScale && <button className="primary" onClick={() => {setScaleSequenceActive(true);setScaleSequenceStep(0)}}><Play size={17}/> 开始{scaleDescending?'下行':'上行'}顺序练习</button>}
          <p>{learningScale ? (scaleSequenceActive ? `请点击发光音符 · 第 ${scaleSequenceStep+1}/${orderedScaleSequence.length} 个` : '点击“顺序练习”，按上行或下行顺序完成一个八度') : appMode === 'learning' ? '相同音名使用相同颜色，帮助你识别八度与横向规律' : status === 'idle' ? '找出目标音符在指板上的任意正确位置' : status === 'playing' ? '答对得 100 分，连续答对还有额外加成' : '所有音符已显示，可以复盘这一局'}</p>
        </div>}
      </section>

      <footer><span>标准调弦 · E A D G B E</span><span>每天 10 分钟，你也能成为吉他大师</span></footer>

      {settingsOpen && <SettingsModal minFret={minFret} maxFret={maxFret} fretboardStyle={fretboardStyle} activeStrings={activeStrings} stringNames={STRING_NAMES} onMinFretChange={setMinFret} onMaxFretChange={setMaxFret} onFretboardStyleChange={setFretboardStyle} onToggleString={(index) => {if(activeStrings.filter(Boolean).length===1&&activeStrings[index])return;setActiveStrings((all)=>all.map((value,current)=>current===index?!value:value))}} onClearCache={() => {clearLearningData();localStorage.removeItem(PRACTICE_PROFILE_KEY);window.location.reload()}} onClose={() => setSettingsOpen(false)}/>} 
    </main>
  )
}

export default App
