import { useMemo } from 'react'
import type { PositionStats } from '../../types'

type Props={positionStats:PositionStats;noteAt:(string:number,fret:number)=>string}

export function WeakReview({positionStats,noteAt}:Props){
  const weakPositions=useMemo(()=>Object.entries(positionStats).map(([key,value])=>{
    const [string,fret]=key.split('-').map(Number)
    const total=value.correct+value.wrong
    return {string,fret,...value,total,accuracy:total?Math.round(value.correct/total*100):0}
  }).filter((item)=>item.total>=2).sort((a,b)=>a.accuracy-b.accuracy||b.total-a.total).slice(0,5),[positionStats])
  return <section className="weak-review">
    <div className="weak-review-head"><div><span>长期学习记录</span><h3>薄弱位置</h3></div><div className="heat-legend"><span><i className="good"/>熟练</span><span><i className="medium"/>待加强</span><span><i className="weak"/>薄弱</span></div></div>
    {weakPositions.length?<div className="weak-list">{weakPositions.map((item,index)=><div key={`${item.string}-${item.fret}`}><strong>#{index+1}</strong><span>{item.string+1}弦 · {item.fret===0?'空弦':`${item.fret}品`}</span><b>{noteAt(item.string,item.fret)}</b><em>{item.accuracy}%</em><small>{item.correct} 对 / {item.wrong} 错 · {item.averageMs?`${(item.averageMs/1000).toFixed(1)}秒`:'待测速'}</small></div>)}</div>:<p className="no-history">继续完成几次训练后，这里会显示你最容易出错的指板位置。</p>}
  </section>
}
