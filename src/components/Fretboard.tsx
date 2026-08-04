import type { AppMode, Feedback, FretboardStyle, PositionStats, Status, TrainingType } from '../types'
import type { FretPosition } from '../lib/scaleFingering'
import { formatActiveNote } from '../lib/noteNotation'

type IntervalPair = { anchor:FretPosition; target:FretPosition } | null

type FretboardProps = {
  appMode: AppMode
  status: Status
  trainingType: TrainingType
  style: FretboardStyle
  activeStrings: boolean[]
  stringNames: readonly string[]
  minFret: number
  fretCount: number
  activeFretRange?: {min:number;max:number} | null
  targetString: number
  feedback: Feedback
  learningView: string
  learningScale: boolean
  learningCaged: boolean
  scaleRootNote: string
  scaleNotes: Set<string>
  scaleSequenceActive: boolean
  scaleSequenceStep: number
  orderedScaleSequence: Array<FretPosition>
  scalePlaybackPosition: FretPosition | null
  scalePlaybackStart: FretPosition | null
  liveFretboardMap: boolean
  pitchStable: boolean
  detectedMidi: number | null
  openMidi: readonly number[]
  positionStats: PositionStats
  questionPosition: FretPosition
  foundPositions: string[]
  learningEarRevealed: boolean
  learningEarPosition: FretPosition
  learningIntervalPair: IntervalPair
  cagedPositions: Set<string>
  arpeggioPath: Array<FretPosition>
  arpeggioStep: number
  noteAt: (string:number,fret:number) => string
  onChoose: (string:number,fret:number) => void
  onScaleClick: (string:number,fret:number) => void
  onPlay: (string:number,fret:number) => void
  onSelectScaleStart: (position:FretPosition) => void
  highlightString?: number
  highlightStrings?: Set<number>
  lessonHighlights?: Record<string, 'ef' | 'bc'>
  lessonActivePosition?: FretPosition | null
  lessonNaturalPositions?: Set<string>
  lessonDegreeLabels?: Record<string, string>
  lessonChordFrets?: Array<number | null>
  lessonChordDegreeByPitch?: Record<number, string>
}

const MARKERS = new Set([3,5,7,9,12])

function QuestionMarkIcon() {
  return <svg className="question-mark-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M8.25 8.35C8.55 5.95 10.15 4.6 12.35 4.6c2.25 0 3.95 1.43 3.95 3.55 0 1.56-.72 2.54-2.28 3.55-1.3.84-1.67 1.35-1.67 2.55v.43" />
    <path d="M12.35 18.35h.01" />
  </svg>
}

export function Fretboard(props: FretboardProps) {
  const { appMode, status, trainingType, style, activeStrings, stringNames, minFret, fretCount, activeFretRange, targetString, feedback, learningView, learningScale, learningCaged, scaleRootNote, scaleNotes, scaleSequenceActive, scaleSequenceStep, orderedScaleSequence, scalePlaybackPosition, scalePlaybackStart, liveFretboardMap, pitchStable, detectedMidi, openMidi, positionStats, questionPosition, foundPositions, learningEarRevealed, learningEarPosition, learningIntervalPair, cagedPositions, arpeggioPath, arpeggioStep, noteAt, onChoose, onScaleClick, onPlay, onSelectScaleStart, highlightString, highlightStrings, lessonHighlights, lessonActivePosition, lessonNaturalPositions, lessonDegreeLabels, lessonChordFrets, lessonChordDegreeByPitch } = props
  const chordLessonMode = appMode === 'learning' && learningView === 'chords'
  const gridTemplateColumns = `var(--fret-label-width, 62px) repeat(${fretCount}, minmax(var(--fret-cell-min, 54px), 1fr))`
  const boardClasses = `fretboard ${style} ${status === 'finished' ? 'review' : ''} ${appMode === 'learning' && learningView === 'explore' ? 'learning' : ''} ${appMode === 'learning' && learningView === 'interval' ? 'interval-learning' : ''} ${appMode === 'learning' && learningView === 'chords' ? 'chord-learning' : ''} ${learningCaged ? 'caged-learning' : ''} ${appMode === 'learning' && learningView === 'ear' ? 'ear-learning' : ''} ${learningScale ? 'scale-mode' : ''}`

  return <div className={`fretboard-scroll ${activeFretRange?'assessment-fret-range':''}`}>
    {activeFretRange&&<div className="assessment-range-label"><span>当前考核范围</span><strong>{activeFretRange.min}–{activeFretRange.max} 品</strong><small>范围外已锁定</small></div>}
    <div className="fret-numbers" style={{gridTemplateColumns}}><span/>{Array.from({length:fretCount},(_,index)=><span key={minFret+index}>{minFret+index}</span>)}</div>
    <div className={boardClasses}>
      {activeStrings.map((active,string) => {
        const enabled = active || appMode === 'learning'
        const stringClass = appMode === 'training' && status === 'playing' && ['stringLocate','adaptive','scaleDegree','chordTone'].includes(trainingType) ? (string === targetString ? 'target-string' : 'non-target-string') : ''
        const openNote = noteAt(string,0)
        const openDisplayNote = formatActiveNote(openNote)
        const openHit = feedback?.string === string && feedback.fret === 0
        const openFoundClass = trainingType==='allNotes'&&foundPositions.includes(`${string}-0`)?'found-position':''
        const openScaleClass = learningScale && scaleNotes.has(openNote) ? (openNote === scaleRootNote ? 'scale-root' : 'scale-note') : ''
        const openLiveClass = liveFretboardMap && pitchStable && detectedMidi === openMidi[string] ? 'live-pitch-position' : ''
        const openPlaybackClass = scalePlaybackPosition?.string === string && scalePlaybackPosition.fret === 0 ? 'scale-playing' : ''
        const openStartClass = learningScale && openNote === scaleRootNote && scalePlaybackStart?.string === string && scalePlaybackStart.fret === 0 ? 'scale-start' : ''
        const filteredExplore = appMode === 'learning' && learningView === 'explore' && Boolean(lessonNaturalPositions)
        const openLessonVisible = lessonActivePosition?.string===string&&lessonActivePosition.fret===0 || lessonNaturalPositions?.has(`${string}-0`)
        const openDegreeLabel = lessonDegreeLabels?.[`${string}-0`]
        const chordFret = chordLessonMode ? lessonChordFrets?.[string] : undefined
        const chordSoundNote = typeof chordFret === 'number' ? formatActiveNote(noteAt(string,chordFret)) : null
        const chordSoundDegree = typeof chordFret === 'number' ? lessonChordDegreeByPitch?.[(openMidi[string]+chordFret)%12] : null
        return <div className={`string-row ${!enabled?'disabled':''} ${stringClass} ${highlightString===string||highlightStrings?.has(string)?'lesson-highlight-string':''}`} key={string} style={{gridTemplateColumns}}>
          <button className={`string-label ${openHit?(feedback.correct?'correct':'wrong'):''} ${openFoundClass} ${openScaleClass} ${openLiveClass} ${openPlaybackClass} ${openStartClass} ${lessonHighlights?.[`${string}-0`]?`lesson-${lessonHighlights[`${string}-0`]}`:''} ${lessonActivePosition?.string===string&&lessonActivePosition.fret===0?'lesson-active-position':''}`} disabled={!enabled||Boolean(activeFretRange)} onClick={() => learningScale ? (openNote === scaleRootNote ? onSelectScaleStart({string,fret:0}) : onPlay(string,0)) : onChoose(string,0)} title={`${stringNames[string]} 空弦`}><span className="string-number-label">{string+1}弦</span>{chordLessonMode ? <span className={`open-note-label chord-string-sound ${chordFret===0?'open-sound':chordFret===null?'muted-sound':'fretted-sound'}`}><strong>{chordFret===null?'×':chordSoundNote}</strong>{chordSoundDegree&&<small>{chordSoundDegree}</small>}</span> : <span className="open-note-label">{openDisplayNote}</span>}<b className={`${openDegreeLabel?'lesson-degree-note':lessonHighlights?.[`${string}-0`]?'lesson-note-highlight':lessonActivePosition?.string===string&&lessonActivePosition.fret===0?'lesson-active-dot':lessonNaturalPositions?.has(`${string}-0`)?'lesson-natural-note':''} ${openDegreeLabel==='1'?'lesson-chord-root':''}`}>{openDegreeLabel || (filteredExplore ? (openLessonVisible ? openDisplayNote : '') : appMode === 'learning'||status==='finished'||openScaleClass||openLiveClass||openFoundClass?openDisplayNote:'')}</b></button>
          {Array.from({length:fretCount},(_,index) => {
            const fret=minFret+index
            const inActiveRange=!activeFretRange||(fret>=activeFretRange.min&&fret<=activeFretRange.max)
            const hit=feedback?.string===string&&feedback.fret===fret
            const currentNote=noteAt(string,fret)
            const currentDisplayNote=formatActiveNote(currentNote)
            const scaleClass=learningScale&&scaleNotes.has(currentNote)?(currentNote===scaleRootNote?'scale-root':'scale-note'):''
            const scalePlaybackClass=scalePlaybackPosition?.string===string&&scalePlaybackPosition.fret===fret?'scale-playing':''
            const history=positionStats[`${string}-${fret}`]
            const historyTotal=history?history.correct+history.wrong:0
            const historyRate=historyTotal?history.correct/historyTotal:1
            const heatClass=status==='finished'&&historyTotal>=2?(historyRate<.5?'heat-weak':historyRate<.8?'heat-warn':'heat-strong'):''
            const questionClass=appMode==='training'&&status==='playing'&&['identify','octave','interval','intervalShape'].includes(trainingType)&&questionPosition.string===string&&questionPosition.fret===fret?'question-position':''
            const foundClass=trainingType==='allNotes'&&foundPositions.includes(`${string}-${fret}`)?'found-position':''
            const sequenceIndex=learningScale?orderedScaleSequence.findIndex((position)=>position.string===string&&position.fret===fret):-1
            const sequenceClass=scaleSequenceActive&&sequenceIndex===scaleSequenceStep?'sequence-next':scaleSequenceActive&&sequenceIndex>-1&&sequenceIndex<scaleSequenceStep?'sequence-done':''
            const earRevealClass=appMode==='learning'&&learningView==='ear'&&learningEarRevealed&&openMidi[string]+fret===openMidi[learningEarPosition.string]+learningEarPosition.fret?'ear-revealed-position':''
            const intervalAnchorClass=appMode==='learning'&&learningView==='interval'&&learningIntervalPair?.anchor.string===string&&learningIntervalPair.anchor.fret===fret?'interval-anchor-position':''
            const intervalTargetClass=appMode==='learning'&&learningView==='interval'&&learningIntervalPair?.target.string===string&&learningIntervalPair.target.fret===fret?'interval-target-position':''
            const cagedShapeClass=learningCaged&&cagedPositions.has(`${string}-${fret}`)?((openMidi[string]+fret)%12===0?'caged-root-position':'caged-shape-position'):''
            const livePitchClass=liveFretboardMap&&pitchStable&&detectedMidi===openMidi[string]+fret?'live-pitch-position':''
            const arpeggioIndex=trainingType==='arpeggio'?arpeggioPath.findIndex((position)=>position.string===string&&position.fret===fret):-1
            const arpeggioClass=arpeggioIndex>-1?(arpeggioIndex<arpeggioStep?'path-done':arpeggioIndex===arpeggioStep?'path-next':'path-future'):''
            const scaleStartClass=learningScale&&currentNote===scaleRootNote&&scalePlaybackStart?.string===string&&scalePlaybackStart.fret===fret?'scale-start':''
            const degreeLabel = lessonDegreeLabels?.[`${string}-${fret}`]
            return <button key={fret} onClick={() => learningScale ? (currentNote===scaleRootNote?onSelectScaleStart({string,fret}):onScaleClick(string,fret)) : onChoose(string,fret)} disabled={!enabled||!inActiveRange} className={`${activeFretRange&&fret===activeFretRange.min?'assessment-range-start':''} ${activeFretRange&&fret===activeFretRange.max?'assessment-range-end':''} ${activeFretRange&&!inActiveRange?'outside-assessment-range':''} ${hit?(feedback.correct?'correct':'wrong'):''} ${scaleClass} ${scalePlaybackClass} ${scaleStartClass} ${heatClass} ${questionClass} ${foundClass} ${sequenceClass} ${earRevealClass} ${intervalAnchorClass} ${intervalTargetClass} ${cagedShapeClass} ${livePitchClass} ${arpeggioClass} ${lessonHighlights?.[`${string}-${fret}`]?`lesson-${lessonHighlights[`${string}-${fret}`]}`:''} ${lessonActivePosition?.string===string&&lessonActivePosition.fret===fret?'lesson-active-position':''}`}><span className="string-wire" style={{height:`${1+string*.45}px`}}/><b className={`${questionClass?'question-mark-dot':''} ${degreeLabel?'lesson-degree-note':lessonHighlights?.[`${string}-${fret}`]?'lesson-note-highlight':lessonActivePosition?.string===string&&lessonActivePosition.fret===fret?'lesson-active-dot':lessonNaturalPositions?.has(`${string}-${fret}`)?'lesson-natural-note':''} ${degreeLabel==='1'?'lesson-chord-root':''}`}>{degreeLabel || (lessonActivePosition?.string===string&&lessonActivePosition.fret===fret||lessonNaturalPositions?.has(`${string}-${fret}`)?currentDisplayNote:questionClass?<QuestionMarkIcon/>:arpeggioIndex>-1&&arpeggioIndex<=arpeggioStep?arpeggioIndex+1:filteredExplore?'':(appMode==='learning'&&(learningView==='explore'||learningView==='interval'))||status==='finished'||hit||scaleClass||scalePlaybackClass||earRevealClass||intervalAnchorClass||intervalTargetClass||cagedShapeClass||livePitchClass?currentDisplayNote:'')}</b></button>
          })}
        </div>
      })}
      <div className="markers" style={{gridTemplateColumns}}><span/>{Array.from({length:fretCount},(_,index)=>{const fret=minFret+index;return <span key={fret}>{MARKERS.has(fret)&&<i className={fret===12?'double':''}/>}</span>})}</div>
    </div>
  </div>
}
