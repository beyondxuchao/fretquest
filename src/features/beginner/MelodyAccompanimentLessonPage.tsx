import { ArrowLeft, Check, Play, RotateCcw, Volume2 } from 'lucide-react'
import { useState } from 'react'

type ChordName='C'|'G'
const SHAPES:Record<ChordName,Array<number|null>>={C:[0,1,0,2,3,null],G:[3,0,0,0,2,3]}
const MELODY=[
  {note:'E',string:3,fret:2},{note:'E',string:3,fret:2},{note:'F',string:3,fret:3},{note:'G',string:2,fret:0},
  {note:'G',string:2,fret:0},{note:'F',string:3,fret:3},{note:'E',string:3,fret:2},{note:'D',string:3,fret:0},
  {note:'C',string:4,fret:3},{note:'C',string:4,fret:3},{note:'D',string:3,fret:0},{note:'E',string:3,fret:2},
  {note:'E',string:3,fret:2},{note:'D',string:3,fret:0},{note:'D',string:3,fret:0},
]
const PHRASES=[{chord:'C' as ChordName,start:0,end:3},{chord:'G' as ChordName,start:4,end:7},{chord:'C' as ChordName,start:8,end:11},{chord:'G' as ChordName,start:12,end:14}]
type Mode='melody'|'chords'|'complete'
type Props={onBack?:()=>void;onNext?:()=>void;onPlay:(string:number,fret:number)=>void}

export function MelodyAccompanimentLessonPage({onBack,onNext,onPlay}:Props){
  const [mode,setMode]=useState<Mode>('melody')
  const [melodyStep,setMelodyStep]=useState(0)
  const [chordStep,setChordStep]=useState(0)
  const [melodyDone,setMelodyDone]=useState(false)
  const [chordsDone,setChordsDone]=useState(false)
  const [mistake,setMistake]=useState(false)
  const completed=melodyDone&&chordsDone

  const playChord=(name:ChordName,delay=0)=>[5,4,3,2,1,0].forEach((string,index)=>{const fret=SHAPES[name][string];if(fret!==null)window.setTimeout(()=>onPlay(string,fret),delay+index*50)})
  const playPhrase=(index:number)=>MELODY.slice(PHRASES[index].start,PHRASES[index].end+1).forEach((item,noteIndex)=>window.setTimeout(()=>onPlay(item.string,item.fret),noteIndex*430))
  const startMelodyRound=()=>{setMode('melody');setMelodyStep(0);setMistake(false);playChord('C')}
  const playMelodyNote=(index:number)=>{const item=MELODY[index];onPlay(item.string,item.fret);if(mode!=='melody'||melodyDone)return;if(index!==melodyStep){setMistake(true);return}setMistake(false);const next=index+1;if(next===MELODY.length){setMelodyDone(true);setMode('chords');setChordStep(0);window.setTimeout(()=>playPhrase(0),500);return}setMelodyStep(next);const nextPhrase=PHRASES.find(item=>item.start===next);if(nextPhrase)playChord(nextPhrase.chord)}
  const chooseChord=(name:ChordName)=>{playChord(name);if(mode!=='chords'||chordsDone)return;const expected=PHRASES[chordStep].chord;if(name!==expected){setMistake(true);return}setMistake(false);const next=chordStep+1;if(next===PHRASES.length){setChordsDone(true);setMode('complete')}else{setChordStep(next);window.setTimeout(()=>playPhrase(next),500)}}
  const playComplete=()=>{setMode('complete');PHRASES.forEach((phrase,index)=>{const base=index*2200;playChord(phrase.chord,base);MELODY.slice(phrase.start,phrase.end+1).forEach((note,noteIndex)=>window.setTimeout(()=>onPlay(note.string,note.fret),base+350+noteIndex*430))})}
  const reset=()=>{setMelodyStep(0);setChordStep(0);setMelodyDone(false);setChordsDone(false);setMistake(false);setMode('melody')}

  return <section className="accompaniment-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：给旋律配和弦</button>
    <div className="strings-lesson-heading"><div><span>LESSON 14 · PLAY TOGETHER</span><h2>旋律与伴奏合练</h2><p>旋律和和弦是两个声部。先让系统承担一个声部，你只专注完成另一个。</p></div><div className="lesson-progress-number"><b>14</b><small>/ 14</small></div></div>

    <div className="two-part-explain"><article><span>旋律声部</span><strong>E E F G...</strong><p>负责乐曲中可以唱出来的线条。</p></article><i>同时发生</i><article><span>和弦声部</span><strong>C → G → C → G</strong><p>在每个乐句开始时提供背景与方向。</p></article></div>
    <div className="accompaniment-mode-tabs"><button className={mode==='melody'?'active':''} onClick={startMelodyRound}><b>{melodyDone?<Check size={14}/>:1}</b><strong>你弹旋律</strong><span>系统播放和弦</span></button><button disabled={!melodyDone} className={mode==='chords'?'active':''} onClick={()=>{setMode('chords');setChordStep(0);setMistake(false);playPhrase(0)}}><b>{chordsDone?<Check size={14}/>:2}</b><strong>你弹和弦</strong><span>系统播放旋律</span></button><button disabled={!completed} className={mode==='complete'?'active':''} onClick={playComplete}><b>3</b><strong>完整示范</strong><span>两个声部合在一起</span></button></div>

    {mode==='melody'&&<div className={`melody-accompaniment-round ${mistake?'mistake':''}`}><div className="round-heading"><div><span>ROUND 1 · 当前伴奏 {PHRASES.find(item=>melodyStep>=item.start&&melodyStep<=item.end)?.chord}</span><h3>{melodyDone?'旋律轮完成':`请弹第 ${melodyStep+1} 个音：${MELODY[melodyStep].note}`}</h3><p>乐句开始时系统会先扫一次和弦。按照发光顺序点击旋律音。</p></div><button onClick={()=>playChord(PHRASES.find(item=>melodyStep>=item.start&&melodyStep<=item.end)?.chord??'C')}><Volume2 size={14}/>再听伴奏</button></div><div className="accompaniment-melody-track">{MELODY.map((item,index)=><button key={index} className={index<melodyStep?'done':index===melodyStep?'current':''} onClick={()=>playMelodyNote(index)}><small>{index+1}</small><strong>{item.note}</strong><span>{item.string+1}弦 {item.fret===0?'空弦':`${item.fret}品`}</span></button>)}</div>{mistake&&<p className="round-error">请按顺序点击当前发光的音。</p>}</div>}

    {mode==='chords'&&<div className={`chord-accompaniment-round ${mistake?'mistake':''}`}><div className="round-heading"><div><span>ROUND 2 · 乐句 {chordStep+1} / 4</span><h3>{chordsDone?'和弦轮完成':'听完旋律开头，选择当前和弦'}</h3><p>每个乐句只扫一次和弦，不需要同时弹奏旋律。</p></div><button onClick={()=>playPhrase(Math.min(chordStep,3))}><Volume2 size={14}/>再听乐句</button></div><div className="accompaniment-chord-track">{PHRASES.map((item,index)=><div className={index<chordStep?'done':index===chordStep?'current':''} key={index}><b>{index<chordStep?<Check size={14}/>:index+1}</b><strong>{index<chordStep?item.chord:'?'}</strong><span>乐句 {index+1}</span></div>)}</div><div className="accompaniment-chord-actions"><button onClick={()=>chooseChord('C')}><Play size={15}/>C</button><button onClick={()=>chooseChord('G')}><Play size={15}/>G</button></div>{mistake&&<p className="round-error">再听重要旋律音，判断现在更接近 C 还是 G。</p>}</div>}

    {mode==='complete'&&<div className="complete-ensemble"><div><span>FULL ENSEMBLE</span><h3>把两个声部放在一起听</h3><p>系统先扫和弦，随后播放该乐句的旋律。这是合奏关系的示范，不要求新手用一把吉他同时完成。</p></div><button onClick={playComplete}><Play size={17}/>播放完整合奏</button></div>}

    <div className="accompaniment-footer"><button onClick={reset}><RotateCcw size={14}/>重新完成两轮</button><div><strong>{completed?'零基础阶段完成':'课程完成条件'}</strong><span>{completed?'你已经从认识吉他走到能理解旋律与和弦如何合作。':'分别完成旋律轮与和弦轮。'}</span></div><button className="strings-next-lesson" disabled={!completed} onClick={onNext}>完成零基础课程</button></div>
  </section>
}
