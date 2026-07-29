import { ArrowLeft, Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from 'react'

const MELODY = [
  {note:'E',string:3,fret:2,beats:1},{note:'E',string:3,fret:2,beats:1},{note:'F',string:3,fret:3,beats:1},{note:'G',string:2,fret:0,beats:1},
  {note:'G',string:2,fret:0,beats:1},{note:'F',string:3,fret:3,beats:1},{note:'E',string:3,fret:2,beats:1},{note:'D',string:3,fret:0,beats:1},
  {note:'C',string:4,fret:3,beats:1},{note:'C',string:4,fret:3,beats:1},{note:'D',string:3,fret:0,beats:1},{note:'E',string:3,fret:2,beats:1},
  {note:'E',string:3,fret:2,beats:1.5},{note:'D',string:3,fret:0,beats:.5},{note:'D',string:3,fret:0,beats:2},
]

type Position={string:number;fret:number}
type Props={onBack?:()=>void;onNext?:()=>void;onPlay:(string:number,fret:number)=>void;renderFretboard:(active:Position,positions:Position[],onSelect:(string:number,fret:number)=>void)=>ReactNode}

export function FirstMelodyLessonPage({onBack,onNext,onPlay,renderFretboard}:Props){
  const [step,setStep]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [bpm,setBpm]=useState(80)
  const [practiceStarted,setPracticeStarted]=useState(false)
  const [mistake,setMistake]=useState(false)
  const [completed,setCompleted]=useState(false)
  const [phase,setPhase]=useState<'position'|'melody'>('position')
  const [positionExample,setPositionExample]=useState(1)
  const timerRef=useRef<number|null>(null)
  const current=MELODY[step]
  const positions=useMemo(()=>Array.from(new Map(MELODY.map(item=>[`${item.string}-${item.fret}`,{string:item.string,fret:item.fret}])).values()),[])

  useEffect(()=>()=>{if(timerRef.current)window.clearTimeout(timerRef.current)},[])
  useEffect(()=>{if(!playing)return;onPlay(current.string,current.fret);timerRef.current=window.setTimeout(()=>{if(step===MELODY.length-1){setPlaying(false);setStep(0)}else setStep(value=>value+1)},(60000/bpm)*current.beats);return()=>{if(timerRef.current)window.clearTimeout(timerRef.current)}},[bpm,current,onPlay,playing,step])

  const resetPractice=()=>{setStep(0);setPracticeStarted(true);setMistake(false);setCompleted(false);setPlaying(false)}
  const choose=(string:number,fret:number)=>{onPlay(string,fret);if(!practiceStarted||completed)return;if(string===current.string&&fret===current.fret){setMistake(false);if(step===MELODY.length-1){setCompleted(true);setPracticeStarted(false);window.setTimeout(()=>onNext?.(),1000)}else setStep(value=>value+1)}else setMistake(true)}
  const positionFrets=Array.from({length:4},(_,index)=>positionExample+index)
  const positionBoardSource=renderFretboard({string:5,fret:positionExample},positionFrets.map(fret=>({string:5,fret})),(string,fret)=>{onPlay(string,fret);if(fret>=1&&fret<=9)setPositionExample(fret)})
  const positionBoard=isValidElement(positionBoardSource)?cloneElement(positionBoardSource as ReactElement<Record<string,unknown>>,{minFret:1,fretCount:12,highlightString:undefined,highlightStrings:new Set([0,1,2,3,4,5]),lessonActivePosition:null,lessonNaturalPositions:new Set([0,1,2,3,4,5].flatMap(string=>positionFrets.map(fret=>`${string}-${fret}`)))}):positionBoardSource

  if(phase==='position')return <section className="first-melody-lesson position-only-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：认识整块指板</button>
    <div className="strings-lesson-heading"><div><span>LESSON 09 · PART 1</span><h2>先认识什么是把位</h2><p>把位不是某一个品，而是左手在琴颈上保持不动时能够覆盖的一片区域。</p></div><div className="lesson-progress-number"><b>09</b><small>/ 12</small></div></div>
    <div className="position-definition position-definition-copy"><div><span>第一步 · 看完整琴颈</span><h3>把位是一扇能沿琴颈移动的“四品窗口”</h3><p>左手手掌暂时不左右移动时，四根手指通常覆盖连续四个品。整只手向琴身方向移动，这扇窗口也会一起移动，于是进入另一个把位。</p></div><div><strong>当前：第 {positionExample} 把位</strong><small>覆盖第 {positionExample}–{positionExample+3} 品 · 横跨六根弦</small></div></div>
    <div className="position-map-selector"><div><span>移动左手位置</span><h3>看看不同把位覆盖哪里</h3><p>点击一个把位，绿色区域会沿琴颈移动。</p></div><div>{[1,3,5,7,9].map(position=><button key={position} className={positionExample===position?'active':''} onClick={()=>setPositionExample(position)}><strong>第 {position} 把位</strong><small>{position}–{position+3} 品</small></button>)}</div></div>
    <div className="position-real-fretboard"><div><span>六根弦 · 1–12 品</span><h3>绿色区域就是左手当前覆盖的把位</h3><p>同一把位不属于某一根弦，而是横跨六根弦的一整片区域。点击指板上的品位也可以移动窗口并试听。</p></div>{positionBoard}</div>
    <div className="position-name-rule"><div><b>{positionExample}</b><span>食指所在的起始品</span></div><i>→</i><div><strong>第 {positionExample} 把位</strong><span>通常覆盖 {positionExample}–{positionExample+3} 品</span></div><p>入门时，可以先用“食指负责哪一品”来给把位命名。真实演奏中会有伸指、缩指和换把，但左手的主要停留区域仍然是判断把位的核心。</p></div>
    <div className="position-fingers"><div><b>食指</b><strong>{positionExample} 品</strong><span>决定当前把位的起点</span></div><div><b>中指</b><strong>{positionExample+1} 品</strong><span>手掌保持在同一区域</span></div><div><b>无名指</b><strong>{positionExample+2} 品</strong><span>继续向琴身方向</span></div><div><b>小指</b><strong>{positionExample+3} 品</strong><span>覆盖这扇窗口的末端</span></div></div>
    <div className="position-six-strings"><div><span>第二步 · 看覆盖范围</span><h3>同一个把位横跨六根琴弦</h3><p>把位限制的是左手沿琴颈左右移动的范围，不是只能使用某一根弦。手掌不移动时，手指可以在六根弦之间上下切换。</p></div><div className="position-string-grid">{[1,2,3,4,5,6].map(string=><span key={string}>{string} 弦<i/><b>1</b><b>2</b><b>3</b><b>4</b></span>)}</div></div>
    <div className="same-note-positions"><div><span>为什么需要多个把位？</span><h3>同一个 C，可以在琴颈不同地方找到</h3><p>音名没有改变，但使用的琴弦、音色和前后能连接的音会变化。选择把位，就是选择一块更方便完成当前音乐的区域。</p></div><div><button onClick={()=>onPlay(4,3)}><Volume2 size={14}/><strong>C</strong><span>第 5 弦 3 品 · 第一把位</span></button><button onClick={()=>onPlay(3,10)}><Volume2 size={14}/><strong>C</strong><span>第 4 弦 10 品 · 较高把位</span></button><button onClick={()=>onPlay(0,8)}><Volume2 size={14}/><strong>C</strong><span>第 1 弦 8 品 · 另一种音色</span></button></div></div>
    <div className="position-name-reveal"><span>现在回到本课要使用的区域</span><h3>为什么《欢乐颂》选择第一把位？</h3><p>第一把位靠近琴头，能利用空弦和 1–4 品。这里需要的 C、D、E、F、G 可以在第 3、4、5 弦之间完成，左手不用中途换把，所以最适合第一次演奏完整旋律。</p></div>
    <button className="position-start-melody" onClick={()=>setPhase('melody')}>我理解了，在第一把位演奏旋律</button>
  </section>

  return <section className="first-melody-lesson">
    <button className="lesson-back" onClick={()=>setPhase('position')}><ArrowLeft size={16}/>上一部分：什么是把位</button>
    <div className="strings-lesson-heading"><div><span>LESSON 09 · PART 2</span><h2>在第一把位演奏《欢乐颂》</h2><p>左手不离开 1–4 品，在第 3、4、5 弦之间切换。</p></div><div className="lesson-progress-number"><b>09</b><small>/ 12</small></div></div>

    <div className="melody-overview"><div><span>使用琴弦</span><strong>第 3、4、5 弦</strong></div><i/><div><span>使用的音</span><strong>C · D · E · F · G</strong></div><i/><div><span>左手范围</span><strong>空弦与 2–3 品</strong></div></div>
    <div className="melody-sequence">{MELODY.map((item,index)=><button key={index} className={`${index===step?'active':''} ${practiceStarted&&index<step?'done':''}`} onClick={()=>{setStep(index);onPlay(item.string,item.fret)}}><small>{index+1}</small><strong>{item.note}</strong><span>{item.string+1}弦 · {item.fret===0?'空弦':`${item.fret}品`}</span><i>{item.beats===2?'—':item.beats===1.5?'·—':''}</i></button>)}</div>
    <div className="melody-player"><button className="melody-main-play" onClick={()=>{setPracticeStarted(false);setPlaying(value=>!value)}}>{playing?<><Pause size={17}/>暂停</>:<><Play size={17}/>播放完整旋律</>}</button><div className="melody-tempo"><span>速度</span><input type="range" min="55" max="120" value={bpm} onChange={event=>setBpm(Number(event.target.value))}/><b>{bpm} BPM</b></div><button onClick={()=>onPlay(current.string,current.fret)}><Volume2 size={15}/>当前音</button></div>

    <div className="melody-practice-head"><div><span>轮到你了 · {practiceStarted||completed?`${Math.min(step+1,15)} / 15`:'尚未开始'}</span><h3>{completed?'完整演奏成功，正在进入下一课':practiceStarted?`请点击第 ${current.string+1} 弦 ${current.fret===0?'空弦':`${current.fret} 品`} · ${current.note}`:'按顺序完成 15 个音'}</h3><p>{completed?'你已经在第一把位完成了一段跨弦旋律。':mistake?'位置不对，观察绿色目标圆点所在的琴弦和品位。':step===13?'最后两个音都是第 4 弦空弦 D，需要连续拨两次。':'绿色亮点是下一步；换弦时，右手拨相邻琴弦。'}</p></div><button onClick={resetPractice}><RotateCcw size={15}/>{practiceStarted?'重新开始':'开始跟练'}</button></div>
    <div className={`melody-fretboard ${mistake?'mistake':''}`}>{renderFretboard({string:current.string,fret:current.fret},positions,choose)}</div>
    <div className="melody-complete"><strong>{completed?'本课完成':'完成条件'}</strong><span>{completed?'你已经在第一把位内跨三根弦完成旋律，1 秒后自动进入下一课。':'保持左手位置，在第 3、4、5 弦上完成全部 15 个音。'}</span><button className="strings-next-lesson" disabled={!completed} onClick={onNext}>立即进入：什么是和弦</button></div>
  </section>
}
