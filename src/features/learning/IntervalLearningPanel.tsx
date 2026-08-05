import { Play } from 'lucide-react'

type Position={string:number;fret:number}
type Interval=readonly [name:string,symbol:string,semitones:number]
type Props={
  intervals:readonly Interval[]
  semitones:number
  anchorString:number
  pair:{anchor:Position;target:Position}|null
  noteAt:(string:number,fret:number)=>string
  onSemitonesChange:(semitones:number)=>void
  onAnchorStringChange:(string:number)=>void
  onPlay:(string:number,fret:number)=>void
}

export function IntervalLearningPanel({intervals,semitones,anchorString,pair,noteAt,onSemitonesChange,onAnchorStringChange,onPlay}:Props){
  const currentInterval=intervals.find((item)=>item[2]===semitones)
  const tuningGap=anchorString===2?4:5
  const fretShift=semitones-tuningGap
  return <section className="interval-learning-panel">
    <div className="interval-lesson-copy"><span className="lesson-number">FRETBOARD SHAPES</span><h2>从根音出发，记住目标音的落点</h2><p>绿色是根音，蓝色是目标音。保持手形不变，换到不同把位和音名时，音程关系仍然成立。</p></div>
    <div className="interval-lesson-controls"><div><span>选择音程</span><div className="interval-choice-grid">{intervals.filter((item)=>[3,4,5,7,10,12].includes(item[2])).map(([name,,value])=><button key={name} className={semitones===value?'active':''} onClick={()=>onSemitonesChange(value)}><b>{name}</b><small>{value} 半音</small></button>)}</div></div><div><span>相邻弦组合</span><div className="string-pair-choice">{[5,4,3,2,1].map((string)=><button key={string} className={anchorString===string?'active':''} onClick={()=>onAnchorStringChange(string)}>{string+1} 弦 → {string} 弦</button>)}</div></div></div>
    {pair&&<div className="interval-explanation"><div><span>当前形状</span><strong>{noteAt(pair.anchor.string,pair.anchor.fret)} → {noteAt(pair.target.string,pair.target.fret)}</strong><small>{currentInterval?.[0]} · {semitones} 半音</small></div><p>从第 {anchorString+1} 弦根音到第 {anchorString} 弦目标音：向高音弦移动 <b>{pair.target.fret-pair.anchor.fret>0?'+':''}{pair.target.fret-pair.anchor.fret}</b> 品。{anchorString===2?'注意：3→2 弦是大三度调弦，形状会比其他相邻弦偏移 1 品。':'其余相邻弦之间是纯四度调弦，可复用同一套形状。'}</p><button onClick={()=>{onPlay(pair.anchor.string,pair.anchor.fret);window.setTimeout(()=>onPlay(pair.target.string,pair.target.fret),600)}}><Play size={14}/> 试听两个音</button></div>}
    {pair&&<div className="interval-memory-guide"><span>形状规律</span><h3>{currentInterval?.[0]}：跨到相邻高音弦，再{fretShift===0?'保持同一品':`向${fretShift>0?'右':'左'}移动 ${Math.abs(fretShift)} 品`}，就是目标音。</h3><p>口诀：普通跨弦减 5，三弦到二弦减 4。{anchorString===2?'当前经过 3→2 弦，需要比普通形状向右补 1 品。':''}</p></div>}
  </section>
}
