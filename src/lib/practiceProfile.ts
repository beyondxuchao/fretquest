import type { PositionStats, TrainingType } from '../types'
import type { DailyStage } from '../features/daily/DailyPracticePage'

export const PRACTICE_PROFILE_KEY='fretquest.practiceProfile.v1'

export type StageResult={type:TrainingType;correct:number;attempts:number;accuracy:number;mastery?:number;slowCorrect?:number;timeouts?:number;wrongClicks?:number;averageResponseMs?:number}
export type PracticeSession={kind:'assessment'|'daily';completedAt:number;score:number;accuracy:number;stages:StageResult[]}
export type PracticeProfile={assessmentCompleted:boolean;weakness:Partial<Record<TrainingType,number>>;dailyPlan:DailyStage[];history:PracticeSession[]}

const DETAILS:Record<TrainingType,{title:string;description:string}>={
  locate:{title:'薄弱位置复习',description:'优先复习错误多、反应慢的位置'},identify:{title:'反向识别',description:'看到位置后快速说出音名'},stringLocate:{title:'指定弦定位',description:'强化单根琴弦上的音名定位'},positionAssessment:{title:'把位覆盖',description:'分别考核前、中、高把位定位'},allNotes:{title:'同名音全搜',description:'连接整块指板上的相同音名'},octave:{title:'八度关系',description:'用形状连接不同弦上的同名音'},interval:{title:'音程定位',description:'从根音定位指定音程'},intervalShape:{title:'音程形状',description:'记忆相邻弦之间的空间关系'},earLocate:{title:'听音找指板',description:'连接耳朵、指板位置和手指'},adaptive:{title:'薄弱位置复习',description:'优先复习错误多、反应慢的位置'},scaleDegree:{title:'音阶音级',description:'把音名放进真实的音阶结构'},chordTone:{title:'和弦内音',description:'定位根音、三音、五音与七音'},arpeggio:{title:'琶音路径',description:'按顺序连接可演奏的和弦音'},
}

export const ASSESSMENT_STAGES:DailyStage[]=[
  {type:'locate',...DETAILS.locate,minutes:1},
  {type:'identify',...DETAILS.identify,minutes:1},
  {type:'stringLocate',...DETAILS.stringLocate,minutes:1},
  {type:'positionAssessment',...DETAILS.positionAssessment,minutes:1},
  {type:'octave',...DETAILS.octave,minutes:1},
  {type:'interval',...DETAILS.interval,minutes:1},
  {type:'earLocate',...DETAILS.earLocate,minutes:1},
]

export const DEFAULT_DAILY_PLAN:DailyStage[]=[
  {type:'adaptive',...DETAILS.adaptive,minutes:2},
  {type:'stringLocate',...DETAILS.stringLocate,minutes:2},
  {type:'octave',...DETAILS.octave,minutes:2},
  {type:'interval',...DETAILS.interval,minutes:1},
  {type:'scaleDegree',...DETAILS.scaleDegree,minutes:1.5},
  {type:'earLocate',...DETAILS.earLocate,minutes:1.5},
]

export function loadPracticeProfile():PracticeProfile{
  try{const parsed=JSON.parse(localStorage.getItem(PRACTICE_PROFILE_KEY)||'null') as PracticeProfile|null;if(parsed?.dailyPlan?.length)return parsed}catch{/* use defaults */}
  return {assessmentCompleted:false,weakness:{},dailyPlan:DEFAULT_DAILY_PLAN,history:[]}
}

function normalizeWeakness(results:StageResult[],previous:PracticeProfile['weakness']){
  const next={...previous}
  results.forEach((result)=>{const error=result.mastery===undefined?(result.attempts?1-result.correct/result.attempts:.7):1-result.mastery/100;const old=next[result.type];next[result.type]=old===undefined?error:old*.65+error*.35})
  return next
}

export function buildDailyPlan(weakness:PracticeProfile['weakness'],positionStats:PositionStats):DailyStage[]{
  const positionValues=Object.values(positionStats)
  const positionAttempts=positionValues.reduce((sum,item)=>sum+item.correct+item.wrong,0)
  const positionError=positionAttempts?positionValues.reduce((sum,item)=>sum+item.wrong,0)/positionAttempts:.5
  const slowScore=positionValues.length?positionValues.reduce((sum,item)=>sum+Math.min(1,(item.averageMs||2500)/5000),0)/positionValues.length:.5
  const types:TrainingType[]=['adaptive','stringLocate','octave','interval','scaleDegree','earLocate']
  const weights=types.map((type)=>{
    if(type==='adaptive')return Math.max(.15,(weakness.adaptive??weakness.positionAssessment??weakness.locate??.45)*.35+(weakness.identify||.45)*.15+(weakness.positionAssessment||.45)*.15+positionError*.2+slowScore*.15)
    return Math.max(.15,weakness[type]??.45)
  })
  const flexibleSeconds=240,totalWeight=weights.reduce((sum,value)=>sum+value,0)
  const seconds=weights.map((weight)=>60+Math.round((flexibleSeconds*weight/totalWeight)/15)*15)
  let difference=600-seconds.reduce((sum,value)=>sum+value,0)
  while(difference!==0){const index=difference>0?weights.indexOf(Math.max(...weights)):seconds.indexOf(Math.max(...seconds));const change=Math.sign(difference)*Math.min(15,Math.abs(difference));seconds[index]+=change;difference-=change}
  return types.map((type,index)=>({type,...DETAILS[type],minutes:seconds[index]/60}))
}

export function updatePracticeProfile(profile:PracticeProfile,session:PracticeSession,positionStats:PositionStats):PracticeProfile{
  const weakness=normalizeWeakness(session.stages,profile.weakness)
  return {assessmentCompleted:profile.assessmentCompleted||session.kind==='assessment',weakness,dailyPlan:buildDailyPlan(weakness,positionStats),history:[session,...profile.history].slice(0,30)}
}
