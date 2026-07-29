import { ArrowLeft, Check, Play, Volume2 } from 'lucide-react'
import { useState } from 'react'

const NOTE_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']
const OPEN_NOTES=[4,11,7,2,9,4]
const OPEN_CHORDS:Record<string,Array<number|null>>={C:[0,1,0,2,3,null],G:[3,0,0,0,2,3],D:[2,3,2,0,null,null],A:[0,2,2,2,0,null],E:[0,0,1,2,2,0],Am:[0,1,2,2,0,null],Dm:[1,3,2,0,null,null],Em:[0,0,0,2,2,0]}
type Props={onBack?:()=>void;onNext?:()=>void;onPlay:(string:number,fret:number)=>void}

export function FirstChordLessonPage({onBack,onNext,onPlay}:Props){
  const [stage,setStage]=useState(0)
  const [quizAnswer,setQuizAnswer]=useState<string|null>(null)
  const [chordInput,setChordInput]=useState('C')
  const match=chordInput.trim().match(/^([A-Ga-g])(m?)$/)
  const customName=match?`${match[1].toUpperCase()}${match[2]}`:'C'
  const customRoot=NOTE_NAMES.indexOf(customName[0])
  const customMinor=customName.endsWith('m')
  const customIntervals=customMinor?[0,3,7]:[0,4,7]
  const customTones=customIntervals.map(interval=>NOTE_NAMES[(customRoot+interval)%12])
  const customShape=OPEN_CHORDS[customName]
  const qualityName=customMinor?'小三和弦':'大三和弦'
  const thirdRole=customMinor?'小三音':'大三音'
  const correctAnswer=customTones.join(' ')
  const shapeNotes=customShape?.map((fret,string)=>fret===null?null:NOTE_NAMES[(OPEN_NOTES[string]+fret)%12])
  const pressedStrings=customShape?.flatMap((fret,string)=>fret&&fret>0?[`${string+1} 弦 ${fret} 品`]:[])??[]
  const playSingle=()=>onPlay(5,(customRoot-OPEN_NOTES[5]+12)%12)
  const playTones=()=>customIntervals.forEach((interval,index)=>window.setTimeout(()=>onPlay(5,(customRoot-OPEN_NOTES[5]+12)%12+interval),index*420))
  const playChord=()=>customShape?[5,4,3,2,1,0].forEach((string,index)=>{const fret=customShape[string];if(fret!==null)window.setTimeout(()=>onPlay(string,fret),index*55)}):playTones()
  const selectChord=(name:string)=>{setChordInput(name);setStage(0);setQuizAnswer(null)}

  return <section className="first-chord-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：第一把位旋律</button>
    <div className="strings-lesson-heading"><div><span>LESSON 10 · FIRST CHORD</span><h2>什么是和弦？</h2><p>旋律把音一个接一个演奏；和弦让多个不同的音在同一时刻共同发声。</p></div><div className="lesson-progress-number"><b>10</b><small>/ 12</small></div></div>

    <div className="beginner-chord-selector">
      <div className="chord-lab-head"><div><span>选择本课要学习的和弦</span><h3>当前和弦：{customName}</h3><p>输入大写根音；加上小写 m 就变成小和弦。下面整页讲解都会跟随这里变化。</p></div><div><input value={chordInput} maxLength={2} onChange={event=>selectChord(event.target.value)} aria-label="输入和弦名称"/><button onClick={playChord}><Play size={15}/>试听</button></div></div>
      <div className="chord-preset-row">{['C','G','D','A','E','Am','Dm','Em'].map(name=><button key={name} className={customName===name?'active':''} onClick={()=>selectChord(name)}>{name}</button>)}</div>
      {!match&&<p className="chord-input-error">请输入 C、G、D、A、E、Am、Dm 或 Em 这样的和弦名称。</p>}
    </div>

    <div className="chord-sound-compare">
      <div><span>一个音</span><div className="single-note-visual"><i>{customTones[0]}</i></div><h3>单音 · Note</h3><p>一次只听见一个明确的音高。</p><button onClick={playSingle}><Volume2 size={15}/>听一个 {customTones[0]}</button></div>
      <b>对比</b>
      <div><span>多个不同的音</span><div className="chord-note-visual">{customTones.map(tone=><i key={tone}>{tone}</i>)}</div><h3>和弦 · Chord</h3><p>不同音同时发声，形成完整的色彩。</p><button onClick={playChord}><Volume2 size={15}/>听 {customName} 和弦</button></div>
    </div>

    <div className="chord-definition"><strong>和弦</strong><span>两个或更多不同音按照一定关系结合；入门阶段先学习最常见的<strong>三和弦</strong>，也就是以三个不同音为核心。</span></div>

    <div className="chord-build-section">
      <div className="chord-build-copy"><span>从一个根音开始</span><h3>{customName[0]} {qualityName} · {customName}</h3><p>和弦名称中的 {customName[0]} 告诉我们根音是 {customName[0]}；{customMinor?'小写 m 表示它是小和弦。':'没有 m 表示它是大和弦。'}{customName} 的三个核心音是 {customTones.join('、')}。</p><div className="chord-tone-roles"><div><b>1</b><strong>{customTones[0]}</strong><small>根音 · 和弦身份</small></div><i>+</i><div><b>{customMinor?'♭3':'3'}</b><strong>{customTones[1]}</strong><small>{thirdRole} · 决定色彩</small></div><i>+</i><div><b>5</b><strong>{customTones[2]}</strong><small>五音 · 提供支撑</small></div></div></div>
      <div className="em-name-card"><small>CHORD NAME</small><strong>{customName[0]}<span>{customMinor?'m':''}</span></strong><p>{customName[0]} 根音 · {qualityName}</p><button onClick={playTones}><Play size={14}/>依次听 {customTones.join('、')}</button></div>
    </div>

    <div className="why-c-chord">
      <div><span>为什么 {customName} 和弦是 {customTones.join('、')}？</span><h3>不是随便挑三个音，而是从根音按固定距离取音</h3><p>先把 {customTones[0]} 当作第 1 个音。{qualityName}从根音向上取{customMinor?'降第 3 音':'第 3 音'}和第 5 音；用半音计算，就是根音上方的 {customIntervals[1]} 个半音与 7 个半音。</p></div>
      <div className="c-chord-distance"><div><small>根音 · 0 半音</small><strong>{customTones[0]}</strong><b>1</b></div><i>向上 {customIntervals[1]} 个半音</i><div><small>{thirdRole}</small><strong>{customTones[1]}</strong><b>{customMinor?'♭3':'3'}</b></div><i>距根音 7 个半音</i><div><small>五音</small><strong>{customTones[2]}</strong><b>5</b></div></div>
      <div className="major-minor-rule"><div><span>大三和弦</span><strong>1 · 3 · 5</strong><small>0、4、7 半音 · 例如 C = C E G</small></div><div><span>小三和弦</span><strong>1 · ♭3 · 5</strong><small>0、3、7 半音 · 例如 Em = E G B</small></div></div>
    </div>

    <div className="beginner-chord-lab">
      <div className="chord-lab-result">
        <div className="custom-chord-name"><small>{customMinor?'MINOR CHORD':'MAJOR CHORD'}</small><strong>{customName}</strong><span>{customMinor?'1 · ♭3 · 5':'1 · 3 · 5'}</span></div>
        <div className="custom-chord-tones">{customTones.map((tone,index)=><div key={tone}><small>{customMinor&&index===1?'♭3':index===0?'1':index===1?'3':'5'}</small><strong>{tone}</strong></div>)}</div>
        <div className="custom-chord-shape"><span>六根弦指法 · 1 弦到 6 弦</span>{customShape?<div>{customShape.map((fret,string)=><button key={string} onClick={()=>{if(fret!==null)onPlay(string,fret)}} className={fret===null?'muted':fret===0?'open':'pressed'}><small>{string+1}弦</small><strong>{fret===null?'×':fret===0?'○':fret}</strong><b>{fret===null?'不弹':NOTE_NAMES[(OPEN_NOTES[string]+fret)%12]}</b></button>)}</div>:<p>这个和弦暂未提供开放指法，但仍可试听三个组成音。</p>}</div>
      </div>
    </div>

    <div className="em-fingering-section">
      <div><span>把三个音放到吉他上</span><h3>{customName} 的开放指法</h3><p>{customShape?`${pressedStrings.length?`需要按住 ${pressedStrings.join('、')}。`:'不需要按品，直接弹空弦。'}各弦的音虽然可能重复，但都属于 ${customTones.join('、')}。`:`${customName} 暂时没有收录适合本课的开放指法，先听清它的三个核心音。`}</p></div>
      <div className="em-diagram-and-list">
        <div className="em-chord-diagram"><div className="diagram-open-row">{(customShape??Array(6).fill(null)).map((fret,index)=><span key={index}>{fret===null?'×':fret===0?'○':''}</span>)}</div><div className="diagram-grid">{Array.from({length:6},(_,string)=><i key={`s${string}`} style={{left:`${10+string*16}%`}}/>)}{Array.from({length:5},(_,fret)=><b key={`f${fret}`} style={{top:`${fret*25}%`}}/>)}{customShape?.map((fret,string)=>fret&&fret>0?<span key={string} className="em-dot" style={{left:`calc(${10+string*16}% - 12px)`,top:`calc(${(fret-.5)*25}% - 12px)`}}>{fret}</span>:null)}</div><div className="diagram-string-row">{[1,2,3,4,5,6].map(n=><span key={n}>{n}</span>)}</div></div>
        <div className="em-string-list">{customShape?.map((fret,string)=><button key={string} disabled={fret===null} className={fret&&fret>0?'pressed':''} onClick={()=>fret!==null&&onPlay(string,fret)}><span>{string+1} 弦</span><strong>{fret===null?'不弹':fret===0?'空弦':`${fret} 品`}</strong><b>{shapeNotes?.[string]??'×'}</b>{fret!==null&&<Volume2 size={13}/>}</button>)??<p>仍可使用上方按钮依次试听三个组成音。</p>}</div>
      </div>
      <button className="em-strum-button" onClick={playChord}><Play size={17}/>{customShape?`从低音弦向第 1 弦扫过，试听 ${customName}`:`依次试听 ${customName} 的三个组成音`}</button>
    </div>

    <div className="em-practice-steps"><button className={stage>=0?'done':''} onClick={()=>setStage(1)}><b>{stage>0?<Check size={14}/>:1}</b><span>{pressedStrings.length?`找到要按的琴弦：${pressedStrings.join('、')}`:'确认这个和弦的三个核心音'}</span></button><button className={stage>=1?'done':''} onClick={()=>setStage(2)}><b>{stage>1?<Check size={14}/>:2}</b><span>{customShape?'逐弦弹奏，检查每根弦':'依次听清根音、三音和五音'}</span></button><button className={stage>=2?'done':''} onClick={()=>{setStage(3);playChord()}}><b>{stage>2?<Check size={14}/>:3}</b><span>完整弹响 {customName}</span></button></div>

    <div className="note-name-quiz chord-intro-quiz"><div><span>一分钟检查</span><h3>{customName} 的三个核心组成音是什么？</h3></div><div>{[correctAnswer,`${customTones[0]} ${NOTE_NAMES[(customRoot+5)%12]} ${customTones[2]}`,`${customTones[0]} ${customTones[1]} ${NOTE_NAMES[(customRoot+8)%12]}`].map(answer=><button key={answer} className={quizAnswer===answer?(answer===correctAnswer?'correct':'wrong'):''} onClick={()=>setQuizAnswer(answer)}>{answer}</button>)}</div>{quizAnswer&&<p>{quizAnswer===correctAnswer?`正确：${customName} 由 ${customTones.join('、')} 三个不同的音构成。`:`回看组成图：根音 ${customTones[0]}、${thirdRole} ${customTones[1]}、五音 ${customTones[2]}。`}</p>}<button className="strings-next-lesson" disabled={quizAnswer!==correctAnswer||stage<3} onClick={onNext}>完成本课，学习更多基础和弦</button></div>
  </section>
}
