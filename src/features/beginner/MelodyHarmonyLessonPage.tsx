import { ArrowLeft, Check, Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type ChordName='C'|'G'|'Am'|'Em'
const SHAPES:Record<ChordName,Array<number|null>>={C:[0,1,0,2,3,null],G:[3,0,0,0,2,3],Am:[0,1,2,2,0,null],Em:[0,0,0,2,2,0]}
const TONES:Record<ChordName,string[]>={C:['C','E','G'],G:['G','B','D'],Am:['A','C','E'],Em:['E','G','B']}
const MELODY=[
  {note:'E',string:3,fret:2},{note:'E',string:3,fret:2},{note:'F',string:3,fret:3},{note:'G',string:2,fret:0},
  {note:'G',string:2,fret:0},{note:'F',string:3,fret:3},{note:'E',string:3,fret:2},{note:'D',string:3,fret:0},
  {note:'C',string:4,fret:3},{note:'C',string:4,fret:3},{note:'D',string:3,fret:0},{note:'E',string:3,fret:2},
  {note:'E',string:3,fret:2},{note:'D',string:3,fret:0},{note:'D',string:3,fret:0},
]
const PHRASES=[
  {chord:'C' as ChordName,start:0,end:3,notes:['E','F','G'],reason:'E、G 都是 C 和弦内音，先建立稳定感。'},
  {chord:'G' as ChordName,start:4,end:7,notes:['G','F','E','D'],reason:'G、D 是 G 和弦内音，D 让乐句产生向前推动。'},
  {chord:'C' as ChordName,start:8,end:11,notes:['C','D','E'],reason:'C、E 回到 C 和弦，旋律重新获得稳定感。'},
  {chord:'G' as ChordName,start:12,end:14,notes:['E','D'],reason:'结尾先用 G 保留张力，之后可以再回到 C。'},
]

type Props={onBack?:()=>void;onNext?:()=>void;onPlay:(string:number,fret:number)=>void}

export function MelodyHarmonyLessonPage({onBack,onNext,onPlay}:Props){
  const [activePhrase,setActivePhrase]=useState(0)
  const [melodyStep,setMelodyStep]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [practiceStep,setPracticeStep]=useState(0)
  const [mistake,setMistake]=useState(false)
  const timerRef=useRef<number|null>(null)
  const phrase=PHRASES[activePhrase]
  const completed=practiceStep===PHRASES.length

  const playChord=(name:ChordName)=>[5,4,3,2,1,0].forEach((string,index)=>{const fret=SHAPES[name][string];if(fret!==null)window.setTimeout(()=>onPlay(string,fret),index*50)})
  const playPhrase=(index:number)=>{setActivePhrase(index);setMelodyStep(PHRASES[index].start);setPlaying(true)}
  useEffect(()=>{if(!playing)return;const item=MELODY[melodyStep];onPlay(item.string,item.fret);timerRef.current=window.setTimeout(()=>{if(melodyStep>=PHRASES[activePhrase].end)setPlaying(false);else setMelodyStep(value=>value+1)},500);return()=>{if(timerRef.current)window.clearTimeout(timerRef.current)}},[activePhrase,melodyStep,onPlay,playing])
  const chooseChord=(name:ChordName)=>{playChord(name);if(completed)return;const correct=PHRASES[practiceStep].chord;if(name===correct){setMistake(false);setPracticeStep(value=>value+1);if(practiceStep<PHRASES.length-1)playPhrase(practiceStep+1)}else setMistake(true)}
  const playComplete=()=>PHRASES.forEach((item,index)=>{window.setTimeout(()=>playChord(item.chord),index*2200);MELODY.slice(item.start,item.end+1).forEach((note,noteIndex)=>window.setTimeout(()=>onPlay(note.string,note.fret),index*2200+350+noteIndex*420))})

  return <section className="melody-harmony-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：大和弦与小和弦</button>
    <div className="strings-lesson-heading"><div><span>LESSON 13 · MELODY & HARMONY</span><h2>给《欢乐颂》配上和弦</h2><p>先观察每段旋律的重要音，再选择包含这些音、并符合前后方向的和弦。</p></div><div className="lesson-progress-number"><b>13</b><small>/ 14</small></div></div>

    <div className="harmony-principle"><div><span>旋律</span><strong>一个接一个的音</strong></div><i>+</i><div><span>和弦</span><strong>同时提供声音背景</strong></div><i>=</i><div><span>配和弦</span><strong>让重要旋律音与背景互相支持</strong></div></div>

    <div className="harmony-phrase-tabs">{PHRASES.map((item,index)=><button key={index} className={activePhrase===index?'active':''} onClick={()=>{setActivePhrase(index);setMelodyStep(item.start);setPlaying(false)}}><small>乐句 {index+1}</small><strong>{item.chord}</strong><span>{item.start+1}–{item.end+1} 音</span></button>)}</div>

    <div className="harmony-analysis">
      <div className="phrase-melody"><div><span>这段旋律</span><button onClick={()=>playing?setPlaying(false):playPhrase(activePhrase)}>{playing?<Pause size={14}/>:<Play size={14}/>}试听旋律</button></div><div>{MELODY.slice(phrase.start,phrase.end+1).map((item,index)=><b key={index} className={melodyStep===phrase.start+index&&playing?'active':''}>{item.note}</b>)}</div></div>
      <div className="phrase-match"><span>选择 {phrase.chord} 和弦</span><h3>{TONES[phrase.chord].join(' · ')}</h3><div>{phrase.notes.map(note=><b key={note} className={TONES[phrase.chord].includes(note)?'inside':'passing'}>{note}<small>{TONES[phrase.chord].includes(note)?'和弦内音':'经过音'}</small></b>)}</div><p>{phrase.reason}</p><button onClick={()=>playChord(phrase.chord)}><Volume2 size={14}/>旋律后听 {phrase.chord}</button></div>
    </div>

    <div className="passing-note-tip"><strong>经过音不需要全部属于和弦</strong><span>配和弦不是要求每一个旋律音都在和弦里。短暂经过的 F 或 D 可以制造流动；更重要的是重拍、停留较久的音以及乐句方向。</span></div>

    <div className={`harmony-practice ${mistake?'mistake':''}`}>
      <div className="progression-practice-head"><div><span>系统弹旋律，你来选择背景</span><h3>{completed?'四个乐句都配好了':`为第 ${practiceStep+1} 乐句选择和弦`}</h3><p>{completed?'现在可以听旋律与和弦完整合在一起。':'先播放当前旋律，再从四个和弦中选择最合适的一个。'}</p></div><button onClick={()=>{setPracticeStep(0);setMistake(false);playPhrase(0)}}><RotateCcw size={14}/>重来</button></div>
      <div className="harmony-practice-track">{PHRASES.map((item,index)=><div key={index} className={index<practiceStep?'done':index===practiceStep?'current':''}><b>{index<practiceStep?<Check size={14}/>:index+1}</b><strong>{index<practiceStep?item.chord:'?'}</strong><small>乐句 {index+1}</small></div>)}</div>
      <div className="harmony-choice-row">{(['C','G','Am','Em'] as ChordName[]).map(name=><button key={name} onClick={()=>chooseChord(name)}><Play size={14}/>{name}<small>{TONES[name].join(' ')}</small></button>)}</div>
      {mistake&&<p>这个和弦与当前重要旋律音的重合较少，再观察上方音名。</p>}
      {completed&&<button className="complete-arrangement-play" onClick={playComplete}><Play size={16}/>播放旋律与和弦完整示范</button>}
    </div>

    <div className="melody-complete"><strong>{completed?'本课完成':'完成条件'}</strong><span>{completed?'你已经理解了配和弦的第一条路径：观察重要旋律音，同时听和弦的方向。':'依次为四个乐句选择 C、G、C、G。'}</span><button className="strings-next-lesson" disabled={!completed} onClick={onNext}>下一课：旋律与伴奏合练</button></div>
  </section>
}
