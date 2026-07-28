export type Status = 'idle' | 'playing' | 'finished'
export type Feedback = { string: number; fret: number; correct: boolean } | null
export type InputState = 'off' | 'requesting' | 'listening' | 'error'
export type FretboardStyle = 'practice' | 'realistic' | 'ebony' | 'maple'
export type AppMode = 'assessment' | 'daily' | 'training' | 'learning' | 'scales' | 'theory' | 'chords' | 'recorder' | 'drums'
export type TrainingType = 'locate' | 'identify' | 'stringLocate' | 'allNotes' | 'octave' | 'interval' | 'intervalShape' | 'earLocate' | 'adaptive' | 'scaleDegree' | 'chordTone' | 'arpeggio'
export type LearningView = 'explore' | 'ear' | 'interval' | 'scales' | 'theory' | 'caged'
export type SolfegeDirection = 'noteToNumber' | 'numberToNote' | 'noteToName' | 'nameToNote' | 'numberToName' | 'nameToNumber'
export type KeyMode = 'major' | 'minor'

export type PositionStats = Record<string, {
  correct: number
  wrong: number
  averageMs?: number
  lastSeen?: number
}>

export type Preferences = {
  minFret: number
  maxFret: number
  activeStrings: boolean[]
  fretboardStyle: FretboardStyle
  soundOn: boolean
  noiseGate: number
  stability: number
}
