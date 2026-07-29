import { ArrowLeft, Check, Play, RotateCcw, Volume2 } from 'lucide-react'
import { useState } from 'react'

type ChordName='C'|'G'|'E'|'Am'|'Em'
const SHAPES:Record<ChordName,Array<number|null>>={C:[0,1,0,2,3,null],G:[3,0,0,0,2,3],E:[0,0,1,2,2,0],Am:[0,1,2,2,0,null],Em:[0,0,0,2,2,0]}
const TONES:Record<ChordName,string[]>={C:['C','E','G'],G:['G','B','D'],E:['E','G♯','B'],Am:['A','C','E'],Em:['E','G','B']}
const PROGRESSION:ChordName[]=['C','G','Am','Em']

type Props={onBack?:()=>void;onNext?:()=>void;onPlay:(string:number,fret:number)=>void}

export function MajorMinorChordLessonPage({onBack,onNext,onPlay}:Props){
  const [activeChord,setActiveChord]=useState<ChordName>('E')
  const [answer,setAnswer]=useState<'major'|'minor'|null>(null)
  const [question,setQuestion]=useState<'E'|'Em'>('Em')
  const [step,setStep]=useState(0)
  const [mistake,setMistake]=useState(false)
  const completed=step===PROGRESSION.length

  const playChord=(name:ChordName)=>{setActiveChord(name);[5,4,3,2,1,0].forEach((string,index)=>{const fret=SHAPES[name][string];if(fret!==null)window.setTimeout(()=>onPlay(string,fret),index*55)})}
  const compare=()=>{playChord('E');window.setTimeout(()=>playChord('Em'),900)}
  const ask=()=>{const next=Math.random()>.5?'E':'Em';setQuestion(next);setAnswer(null);playChord(next)}
  const choose=(name:ChordName)=>{playChord(name);if(completed)return;if(name===PROGRESSION[step]){setMistake(false);setStep(value=>value+1)}else setMistake(true)}
  const correctAnswer=question==='E'?'major':'minor'
  const shapeName=activeChord==='Am'?'Am':'Em'

  return <section className="major-minor-lesson">
    <button className="lesson-back" onClick={onBack}><ArrowLeft size={16}/>上一课：第一个和弦进行</button>
    <div className="strings-lesson-heading"><div><span>LESSON 12 · MAJOR & MINOR</span><h2>为什么和弦有明暗变化？</h2><p>保持根音和五音不动，只把中间的三音移动一品，和弦的色彩就会改变。</p></div><div className="lesson-progress-number"><b>12</b><small>/ 14</small></div></div>

    <div className="major-minor-compare">
      <button className={activeChord==='E'?'active':''} onClick={()=>playChord('E')}><small>大三和弦</small><strong>E</strong><span>E · G♯ · B</span><b>1 · 3 · 5</b></button>
      <div><span>只移动中间的音</span><strong>G♯ <i>→</i> G</strong><small>降低 1 个半音 · 吉他上移动 1 品</small><button onClick={compare}><Volume2 size={14}/>连续对比</button></div>
      <button className={activeChord==='Em'?'active':''} onClick={()=>playChord('Em')}><small>小三和弦</small><strong>Em</strong><span>E · G · B</span><b>1 · ♭3 · 5</b></button>
    </div>

    <div className="third-distance-rule"><article><span>大三和弦</span><strong>0 · 4 · 7</strong><p>三音距离根音 4 个半音，通常更明亮、坚定。</p></article><i>三音降低半音</i><article><span>小三和弦</span><strong>0 · 3 · 7</strong><p>三音距离根音 3 个半音，通常更柔和、偏暗。</p></article></div>

    <div className="minor-shape-lab">
      <div><span>把小和弦放到吉他上</span><h3>学习 Am 与 Em 两个开放指法</h3><p>先点击和弦，再逐弦检查。数字是品位，○ 是空弦，× 表示不弹。</p></div>
      <div className="minor-shape-tabs">{(['Am','Em'] as const).map(name=><button key={name} className={shapeName===name?'active':''} onClick={()=>playChord(name)}><strong>{name}</strong><span>{TONES[name].join(' · ')}</span><Play size={14}/></button>)}</div>
      <div className="minor-string-grid">{SHAPES[shapeName].map((fret,string)=><button key={string} disabled={fret===null} className={fret===null?'muted':fret===0?'open':'pressed'} onClick={()=>fret!==null&&onPlay(string,fret)}><small>{string+1} 弦</small><strong>{fret===null?'×':fret===0?'○':fret}</strong><span>{fret===null?'不弹':fret===0?'空弦':`${fret} 品`}</span></button>)}</div>
    </div>

    <div className="major-minor-ear-quiz">
      <div><span>先用耳朵判断</span><h3>刚才播放的是大和弦还是小和弦？</h3><p>不要猜和弦名称，只判断中间三音带来的明暗色彩。</p></div>
      <button className="ear-replay" onClick={()=>playChord(question)}><Volume2 size={15}/>再听一次</button>
      <div><button className={answer==='major'?(correctAnswer==='major'?'correct':'wrong'):''} onClick={()=>setAnswer('major')}>大和弦</button><button className={answer==='minor'?(correctAnswer==='minor'?'correct':'wrong'):''} onClick={()=>setAnswer('minor')}>小和弦</button></div>
      {answer&&<p>{answer===correctAnswer?`正确：这是 ${question}，三音是 ${TONES[question][1]}。`:`再听中间的三音：${question} 的三音是 ${TONES[question][1]}。`}</p>}
      <button className="ear-next" onClick={ask}>换一道</button>
    </div>

    <div className={`four-chord-practice ${mistake?'mistake':''}`}>
      <div className="progression-practice-head"><div><span>把明暗放进进行</span><h3>{completed?'第一个四和弦循环完成':`现在弹：${PROGRESSION[step]}`}</h3><p>C 建立稳定，G 推动，Am 转暗，Em 保留一点悬念。</p></div><button onClick={()=>{setStep(0);setMistake(false)}}><RotateCcw size={14}/>重来</button></div>
      <div className="four-chord-track">{PROGRESSION.map((name,index)=><div key={name} className={index<step?'done':index===step?'current':''}><b>{index<step?<Check size={14}/>:index+1}</b><strong>{name}</strong><small>{index===0?'稳定':index===1?'推动':index===2?'转暗':'悬念'}</small></div>)}</div>
      <div className="four-chord-actions">{PROGRESSION.map(name=><button key={name} onClick={()=>choose(name)}><Play size={14}/>{name}</button>)}</div>
      {mistake&&<p>先弹当前发光的和弦，再继续下一步。</p>}
    </div>

    <div className="melody-complete"><strong>{completed?'本课完成':'完成条件'}</strong><span>{completed?'你已经能让大、小和弦出现在同一个进行中。下一课将把和弦配到《欢乐颂》。':'按照顺序完成 C、G、Am、Em。'}</span><button className="strings-next-lesson" disabled={!completed} onClick={onNext}>下一课：给旋律配和弦</button></div>
  </section>
}
