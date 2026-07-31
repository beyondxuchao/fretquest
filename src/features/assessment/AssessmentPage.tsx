import { BarChart3, Brain, Headphones, MapPin, Play, RotateCcw } from 'lucide-react'
import type { PracticeProfile, StageResult } from '../../lib/practiceProfile'

type Props={profile:PracticeProfile;result:StageResult[]|null;onStart:()=>void;onContinue:()=>void;onSkip:()=>void}
const LABELS:Record<string,string>={locate:'音名定位',identify:'反向识别',stringLocate:'指定弦定位',positionAssessment:'把位覆盖',octave:'八度关系',interval:'核心音程',earLocate:'听音定位'}

export function AssessmentPage({profile,result,onStart,onContinue,onSkip}:Props){
  if(result){
    const sorted=[...result].sort((a,b)=>(a.mastery??a.accuracy)-(b.mastery??b.accuracy))
    const accuracy=Math.round(result.reduce((sum,item)=>sum+item.correct,0)/Math.max(1,result.reduce((sum,item)=>sum+item.attempts,0))*100)
    return <section className="assessment-page result">
      <div className="assessment-result-head"><BarChart3 size={28}/><span>诊断完成</span><h2>正确率 {accuracy}% · 综合掌握度 {Math.round(result.reduce((sum,item)=>sum+(item.mastery??item.accuracy),0)/Math.max(1,result.length))}%</h2><p>掌握度综合考虑速度、误触、最终答对和超时，课程已据此重新安排。</p></div>
      <div className="assessment-results">{sorted.map((item)=><div key={item.type}><strong>{item.mastery??item.accuracy}%</strong><span>{LABELS[item.type]||item.type}</span><small>掌握度 · 正确率 {item.accuracy}%</small><small>{item.wrongClicks||0} 次误触 · {item.timeouts||0} 次超时</small></div>)}</div>
      <div className="assessment-analysis"><strong>主要薄弱项</strong><span>{sorted.slice(0,2).map((item)=>LABELS[item.type]||item.type).join('、')}</span><p>这些内容会在下一套每日 10 分钟中获得更多练习时间。以后每次完成每日训练，课程还会继续调整。</p></div>
      <button className="assessment-primary" onClick={onContinue}>查看我的 10 分钟课程</button>
    </section>
  }
  return <section className="assessment-page">
    <div className="assessment-intro"><span>SKILL CHECK</span><h2>{profile.assessmentCompleted?'重新进行能力诊断':'用 35 道题了解你的当前水平'}</h2><p>七项测试每项固定 5 题，答完再进入下一项。把位测试会覆盖前、中、高三个区域。</p></div>
    <div className="assessment-features"><div><MapPin/><strong>视觉与把位定位</strong><span>音名、指定琴弦与 1–12 品覆盖</span></div><div><Brain/><strong>关系理解</strong><span>八度形状与二度、三度、五度、八度</span></div><div><Headphones/><strong>听觉映射</strong><span>听到声音后找到实际位置</span></div></div>
    <div className="assessment-notice"><RotateCcw size={17}/><span>清除本地缓存后会重新进入本次诊断，因为原有学习档案也会被删除。</span></div>
    <div className="assessment-actions"><button className="assessment-primary" onClick={onStart}><Play size={17}/> 开始 35 题诊断</button><button className="assessment-skip" onClick={onSkip}>我是纯新手，先去学习</button></div>
  </section>
}
