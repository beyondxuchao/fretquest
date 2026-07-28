import { Flame, Timer, Trophy } from 'lucide-react'

type Props={timeLeft:number;score:number;streak:number}

export function TrainingStats({timeLeft,score,streak}:Props){
  return <div className="stats">
    <div><Timer size={17}/><span>剩余时间</span><strong className={timeLeft<=10?'danger':''}>{timeLeft}<small>秒</small></strong></div>
    <i/>
    <div><Trophy size={17}/><span>得分</span><strong>{score.toLocaleString()}</strong></div>
    <i/>
    <div><Flame size={17}/><span>连击</span><strong>{streak}<small>x</small></strong></div>
  </div>
}
