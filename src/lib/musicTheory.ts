export const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
export const OPEN_NOTES = [4, 11, 7, 2, 9, 4] // high E → low E
export const OPEN_MIDI = [64, 59, 55, 50, 45, 40] // E4 → E2
export const NATURAL_PITCHES = new Set([0, 2, 4, 5, 7, 9, 11])
export const HALF_STEP_LESSON_HIGHLIGHTS = Object.fromEntries(OPEN_MIDI.flatMap((midi,string)=>Array.from({length:13},(_,fret)=>{
  const pitch=(midi+fret)%12
  return pitch===4||pitch===5?[`${string}-${fret}`,'ef' as const]:pitch===11||pitch===0?[`${string}-${fret}`,'bc' as const]:null
}).filter((entry):entry is [string,'ef'|'bc']=>entry!==null)))
export const SAMPLE_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
export const STRING_NAMES = ['1弦 E', '2弦 B', '3弦 G', '4弦 D', '5弦 A', '6弦 E']

export const SCALES = {
  major: { name: '大调音阶', intervals: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: '自然小调', intervals: [0, 2, 3, 5, 7, 8, 10] },
  majorPentatonic: { name: '大调五声音阶', intervals: [0, 2, 4, 7, 9] },
  minorPentatonic: { name: '小调五声音阶', intervals: [0, 3, 5, 7, 10] },
  blues: { name: '布鲁斯音阶', intervals: [0, 3, 5, 6, 7, 10] },
} satisfies Record<string, { name: string; intervals: number[] }>
export type ScaleType = keyof typeof SCALES

export const CHORD_TYPES = {
  major: { name: '大三和弦', suffix: '', formula: '1 · 3 · 5', intervals: [0, 4, 7] },
  minor: { name: '小三和弦', suffix: 'm', formula: '1 · ♭3 · 5', intervals: [0, 3, 7] },
  diminished: { name: '减三和弦', suffix: 'dim', formula: '1 · ♭3 · ♭5', intervals: [0, 3, 6] },
  augmented: { name: '增三和弦', suffix: 'aug', formula: '1 · 3 · ♯5', intervals: [0, 4, 8] },
  power5: { name: '强力和弦', suffix: '5', formula: '1 · 5', intervals: [0, 7] },
  sus2: { name: '挂二和弦', suffix: 'sus2', formula: '1 · 2 · 5', intervals: [0, 2, 7] },
  sus4: { name: '挂四和弦', suffix: 'sus4', formula: '1 · 4 · 5', intervals: [0, 5, 7] },
  add9: { name: '加九和弦', suffix: 'add9', formula: '1 · 3 · 5 · 9', intervals: [0, 4, 7, 2] },
  minorAdd9: { name: '小加九和弦', suffix: 'madd9', formula: '1 · ♭3 · 5 · 9', intervals: [0, 3, 7, 2] },
  major6: { name: '大六和弦', suffix: '6', formula: '1 · 3 · 5 · 6', intervals: [0, 4, 7, 9] },
  minor6: { name: '小六和弦', suffix: 'm6', formula: '1 · ♭3 · 5 · 6', intervals: [0, 3, 7, 9] },
  dominant7: { name: '属七和弦', suffix: '7', formula: '1 · 3 · 5 · ♭7', intervals: [0, 4, 7, 10] },
  major7: { name: '大七和弦', suffix: 'maj7', formula: '1 · 3 · 5 · 7', intervals: [0, 4, 7, 11] },
  minor7: { name: '小七和弦', suffix: 'm7', formula: '1 · ♭3 · 5 · ♭7', intervals: [0, 3, 7, 10] },
  minorMajor7: { name: '小大七和弦', suffix: 'mMaj7', formula: '1 · ♭3 · 5 · 7', intervals: [0, 3, 7, 11] },
  diminished7: { name: '减七和弦', suffix: 'dim7', formula: '1 · ♭3 · ♭5 · 𝄫7', intervals: [0, 3, 6, 9] },
  halfDiminished7: { name: '半减七和弦', suffix: 'm7♭5', formula: '1 · ♭3 · ♭5 · ♭7', intervals: [0, 3, 6, 10] },
  augmented7: { name: '增属七和弦', suffix: 'aug7', formula: '1 · 3 · ♯5 · ♭7', intervals: [0, 4, 8, 10] },
  dominant9: { name: '属九和弦', suffix: '9', formula: '1 · 3 · 5 · ♭7 · 9', intervals: [0, 4, 7, 10, 2] },
  major9: { name: '大九和弦', suffix: 'maj9', formula: '1 · 3 · 5 · 7 · 9', intervals: [0, 4, 7, 11, 2] },
  minor9: { name: '小九和弦', suffix: 'm9', formula: '1 · ♭3 · 5 · ♭7 · 9', intervals: [0, 3, 7, 10, 2] },
} as const
export type ChordType = keyof typeof CHORD_TYPES

export const DIAGRAM_OPEN = [4, 9, 2, 7, 11, 4] // low E → high E
export const CAGED_SHAPES = {
  C: { root: 0, frets: [null, 3, 2, 0, 1, 0], tip: '根音在第 5 弦；向上移动时，以横按替代开放弦。' },
  A: { root: 9, frets: [null, 0, 2, 2, 2, 0], tip: '根音在第 5 弦；是最容易连接横按和弦的形状。' },
  G: { root: 7, frets: [3, 2, 0, 0, 0, 3], tip: '覆盖六根弦，适合认识低音根音与高音重复根音。' },
  E: { root: 4, frets: [0, 2, 2, 1, 0, 0], tip: '根音在第 6 弦；向上移动后就是常用的大横按形状。' },
  D: { root: 2, frets: [null, null, 0, 2, 3, 2], tip: '高音区形状，根音在第 4 弦，适合连接旋律与和弦。' },
} as const
export const CAGED_C_MAJOR = {
  C: { shift: 0, frets: [null, 3, 2, 0, 1, 0], position: '开放位', rootString: '5 弦 3 品' },
  A: { shift: 3, frets: [null, 3, 5, 5, 5, 3], position: '第 3 把位', rootString: '5 弦 3 品' },
  G: { shift: 5, frets: [8, 7, 5, 5, 5, 8], position: '第 5 把位', rootString: '6 弦 8 品' },
  E: { shift: 8, frets: [8, 10, 10, 9, 8, 8], position: '第 8 把位', rootString: '6 弦 8 品' },
  D: { shift: 10, frets: [null, null, 10, 12, 13, 12], position: '第 10 把位', rootString: '4 弦 10 品' },
} as const
export const DEGREE_PITCH = [0, 0, 2, 4, 5, 7, 9, 11, 12, 14]
const NOTE_NAME_PITCHES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1,
  D: 2, 'D#': 3, Eb: 3,
  E: 4,
  F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10,
  B: 11,
}
const CHORD_SUFFIX_ALIASES: Record<string, ChordType> = {
  '': 'major',
  M: 'major',
  maj: 'major',
  m: 'minor',
  min: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  '+': 'augmented',
  '5': 'power5',
  sus2: 'sus2',
  sus4: 'sus4',
  add9: 'add9',
  madd9: 'minorAdd9',
  m6: 'minor6',
  '6': 'major6',
  '7': 'dominant7',
  maj7: 'major7',
  M7: 'major7',
  m7: 'minor7',
  mMaj7: 'minorMajor7',
  dim7: 'diminished7',
  m7b5: 'halfDiminished7',
  'm7♭5': 'halfDiminished7',
  aug7: 'augmented7',
  '9': 'dominant9',
  maj9: 'major9',
  m9: 'minor9',
}
export const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]
export const PROGRESSIONS = [
  { label: '流行', formula: 'I–V–vi–IV', degrees: [0, 4, 5, 3] },
  { label: '经典', formula: 'I–vi–IV–V', degrees: [0, 5, 3, 4] },
  { label: '爵士', formula: 'ii–V–I', degrees: [1, 4, 0] },
  { label: '民谣', formula: 'I–IV–V–I', degrees: [0, 3, 4, 0] },
]
export const FRET_POSITIONS = [
  { label: '开放', start: 1, end: 4 },
  { label: '3 把', start: 3, end: 6 },
  { label: '5 把', start: 5, end: 8 },
  { label: '7 把', start: 7, end: 10 },
  { label: '9 把', start: 9, end: 12 },
  { label: '12 把', start: 12, end: 15 },
]

export function parseChordDegrees(input: string) {
  const normalized = input.replace(/♭/g, 'b').replace(/♯/g, '#').replace(/[，,·\s]/g, '')
  const noteTokens: string[] = []
  let noteCursor = 0
  while (noteCursor < normalized.length && /[A-Ga-g]/.test(normalized[noteCursor])) {
    const letter = normalized[noteCursor++].toUpperCase()
    const accidental = normalized[noteCursor] === 'b' || normalized[noteCursor] === '#' ? normalized[noteCursor++] : ''
    noteTokens.push(`${letter}${accidental}`)
  }
  if (noteCursor === normalized.length && noteTokens.length >= 2 && noteTokens.length <= 5) {
    const pitches = noteTokens.map((token) => NOTE_NAME_PITCHES[token])
    if (pitches.some((pitch) => pitch === undefined) || new Set(pitches).size !== pitches.length) return null
    const root = pitches[0]
    const intervals = pitches.map((pitch) => (pitch - root + 12) % 12)
    const match = Object.entries(CHORD_TYPES).find(([, value]) => value.intervals.length === intervals.length && value.intervals.every((interval, index) => interval === intervals[index]))
    return { tokens: noteTokens, pitches, root, intervals, matchedType: match?.[0] as ChordType | undefined, source: 'notes' as const }
  }
  const tokens: string[] = []
  let cursor = 0
  while (cursor < normalized.length) {
    const prefix = normalized[cursor] === 'b' || normalized[cursor] === '#' ? normalized[cursor++] : ''
    const degree = normalized[cursor]
    if (!degree || !/[1-9]/.test(degree)) return null
    cursor += 1
    const suffix = !prefix && (normalized[cursor] === 'b' || normalized[cursor] === '#') ? normalized[cursor++] : ''
    tokens.push(`${prefix || suffix}${degree}`)
  }
  if (tokens.length < 2 || tokens.length > 5) return null
  const pitches = tokens.map((token) => {
    const degree = Number(token[token.length - 1])
    const alteration = token.startsWith('#') ? 1 : token.startsWith('b') ? -1 : 0
    return (DEGREE_PITCH[degree] + alteration + 12) % 12
  })
  const root = pitches[0]
  const intervals = pitches.map((pitch) => (pitch - root + 12) % 12)
  if (new Set(pitches).size !== pitches.length) return null
  const match = Object.entries(CHORD_TYPES).find(([, value]) => value.intervals.length === intervals.length && value.intervals.every((interval, index) => interval === intervals[index]))
  return { tokens, pitches, root, intervals, matchedType: match?.[0] as ChordType | undefined, source: 'degrees' as const }
}

export function parseChordInput(input: string) {
  const compact = input.trim().replace(/\s+/g, '').replace(/♭/g, 'b').replace(/♯/g, '#')
  const symbol = compact.match(/^([A-Ga-g])([#b]?)(.*)$/)
  if (symbol) {
    const rootName = `${symbol[1].toUpperCase()}${symbol[2]}`
    const root = NOTE_NAME_PITCHES[rootName]
    const type = CHORD_SUFFIX_ALIASES[symbol[3]]
    if (root !== undefined && type) {
      const chord = CHORD_TYPES[type]
      const pitches = chord.intervals.map((interval) => (root + interval) % 12)
      return { tokens: chord.formula.split(' · '), pitches, root, intervals: [...chord.intervals], matchedType: type, source: 'symbol' as const }
    }
  }
  return parseChordDegrees(input)
}

export function intervalDegreeLabel(interval: number) {
  const normalized = ((interval % 12) + 12) % 12
  return ({0:'1',1:'♭2',2:'2/9',3:'♭3',4:'3',5:'4',6:'♭5',7:'5',8:'♯5',9:'6',10:'♭7',11:'7'} as Record<number,string>)[normalized] || `${normalized}`
}

export function deriveVoicings(root: number, intervals: readonly number[]) {
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
        if (sounding.length < Math.min(4, tones.size)) return
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
  return results.sort((a, b) => voicingPreferenceScore(a) - voicingPreferenceScore(b))
}

function voicingPreferenceScore(shape: Array<number | null>) {
  const sounding = shape.flatMap((fret, string) => fret === null ? [] : [{ fret, string }])
  const pressed = sounding.filter(({ fret }) => fret > 0).map(({ fret }) => fret)
  const firstString = sounding[0]?.string ?? 6
  const lastString = sounding.at(-1)?.string ?? -1
  const internalMutes = shape.slice(firstString, lastString + 1).filter((fret) => fret === null).length
  const minPressed = pressed.length ? Math.min(...pressed) : 0
  const maxPressed = pressed.length ? Math.max(...pressed) : 0
  const span = pressed.length ? maxPressed - minPressed : 0
  const openStrings = sounding.filter(({ fret }) => fret === 0).length

  return maxPressed * 5
    + span * 8
    + internalMutes * 30
    + (6 - sounding.length) * 14
    - openStrings * 4
}

export const INTERVALS = [
  ['纯一度', 'P1', 0], ['小二度', 'm2', 1], ['大二度', 'M2', 2], ['小三度', 'm3', 3],
  ['大三度', 'M3', 4], ['纯四度', 'P4', 5], ['增四度', 'TT', 6], ['纯五度', 'P5', 7],
  ['小六度', 'm6', 8], ['大六度', 'M6', 9], ['小七度', 'm7', 10], ['大七度', 'M7', 11], ['纯八度', 'P8', 12],
] as const
export const SOLFEGE = [
  { note: 'C', number: '1', name: 'Do', noteIndex: 0 }, { note: 'D', number: '2', name: 'Re', noteIndex: 2 },
  { note: 'E', number: '3', name: 'Mi', noteIndex: 4 }, { note: 'F', number: '4', name: 'Fa', noteIndex: 5 },
  { note: 'G', number: '5', name: 'Sol', noteIndex: 7 }, { note: 'A', number: '6', name: 'La', noteIndex: 9 },
  { note: 'B', number: '7', name: 'Si', noteIndex: 11 },
] as const

export function noteAt(string: number, fret: number) {
  return NOTES[(OPEN_NOTES[string] + fret) % 12]
}
