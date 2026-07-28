import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Status, TrainingType } from '../../types'

type Menu = 'basic' | 'relation' | 'applied'
type TrainingOption = readonly [TrainingType, string, string]

const GROUPS: Array<{id: Menu; title: string; options: readonly TrainingOption[]}> = [
  {id:'basic',title:'基础定位',options:[['locate','音名定位','看到音名，寻找指板位置'],['identify','反向识别','看到位置，选择正确音名'],['stringLocate','指定弦定位','只在指定弦上寻找目标音']]},
  {id:'relation',title:'关系训练',options:[['allNotes','同名音全搜','找齐范围内全部同名音'],['octave','八度形状','寻找上方一个八度位置'],['interval','音程定位','从根音寻找指定音程'],['intervalShape','音程形状','固定在相邻高音弦上找目标'],['earLocate','听音找指板','聆听真实吉他音，寻找相同音高']]},
  {id:'applied',title:'应用训练',options:[['adaptive','自适应复习','根据错误率与反应时间安排薄弱位置'],['scaleDegree','音阶音级','在指定弦寻找当前音阶的目标级数'],['chordTone','和弦内音','寻找根音、三音、五音与七音'],['arpeggio','琶音路径','按音高顺序完成和弦琶音']]},
]

const NAMES: Record<TrainingType,string> = {locate:'音名定位',identify:'反向识别',stringLocate:'指定弦定位',allNotes:'同名音全搜',octave:'八度形状',interval:'音程定位',intervalShape:'音程形状',earLocate:'听音找指板',adaptive:'自适应复习',scaleDegree:'音阶音级',chordTone:'和弦内音',arpeggio:'琶音路径'}
const DESCRIPTIONS: Record<TrainingType,string> = {locate:'看到音名，在整块指板上寻找位置',identify:'看到高亮位置，从十二个音名中选择',stringLocate:'只在指定的一根弦上寻找目标音',allNotes:'找齐当前范围内所有相同音名',octave:'从根音寻找上方一个八度的位置',interval:'从根音寻找指定的音程距离',intervalShape:'从根音到指定相邻高音弦，复现音程手形',earLocate:'聆听单音，在指板上找到相同实际音高',adaptive:'优先复习错误多、反应慢和长期未练的位置',scaleDegree:'把音阶级数映射到指定琴弦',chordTone:'识别并定位当前和弦的组成音',arpeggio:'按顺序连接和弦音，建立可演奏路径'}

type Props = {trainingType:TrainingType;status:Status;onSelect:(type:TrainingType)=>void}

export function TrainingNavigation({trainingType,status,onSelect}:Props) {
  const [openMenu,setOpenMenu]=useState<Menu|null>(null)
  return <div className="training-subnav">
    <div className="current-training"><span>当前训练</span><strong>{NAMES[trainingType]}</strong></div>
    <div className="training-menus">{GROUPS.map((group,groupIndex)=><div className="training-menu-wrap" key={group.id}>
      <button className={group.options.some(([type])=>type===trainingType)?'active':''} disabled={status==='playing'} onClick={()=>setOpenMenu(openMenu===group.id?null:group.id)}>{group.title} <ChevronDown size={13}/></button>
      {openMenu===group.id&&<div className="training-popover">{group.options.map(([value,title,description],optionIndex)=>{const optionNumber=GROUPS.slice(0,groupIndex).reduce((total,item)=>total+item.options.length,0)+optionIndex+1;return <button className={trainingType===value?'selected':''} key={value} onClick={()=>{onSelect(value);setOpenMenu(null)}}><i>{String(optionNumber).padStart(2,'0')}</i><span><strong>{title}</strong><small>{description}</small></span></button>})}</div>}
    </div>)}</div>
    <div className="training-description"><span>{DESCRIPTIONS[trainingType]}</span></div>
    <div className={`training-status ${status}`}><i/>{status==='playing'?'训练进行中':status==='finished'?'本局已完成':'等待开始'}</div>
  </div>
}
