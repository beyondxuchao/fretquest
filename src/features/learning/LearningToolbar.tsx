import type { LearningView } from '../../types'

const VIEWS: Array<{value:LearningView;label:string}> = [
  {value:'explore',label:'指板探索'},
  {value:'interval',label:'音程形状'},
  {value:'caged',label:'CAGED'},
  {value:'scales',label:'音阶'},
  {value:'theory',label:'基础乐理'},
  {value:'ear',label:'听音学习'},
]

type Props={view:LearningView;onChange:(view:LearningView)=>void}

export function LearningToolbar({view,onChange}:Props){
  return <div className="learning-toolbar">
    <div className="learning-view-switch">{VIEWS.map((item)=><button key={item.value} className={view===item.value?'active':''} onClick={()=>onChange(item.value)}>{item.label}</button>)}</div>
    {view==='ear'&&<span className="learning-method">熟悉音色 → 参照对比 → 跨八度识别 → 进入测试</span>}
  </div>
}
