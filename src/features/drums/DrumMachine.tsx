import type { CSSProperties } from 'react'
import { Play, Square } from 'lucide-react'

export type DrumVoice='kick'|'snare'|'hat'|'openHat'|'crash'|'ride'
export type DrumPattern=Record<DrumVoice,boolean[]>
type Props={bpm:number;drumPlaying:boolean;drumStep:number;metronomePlaying:boolean;metronomeBeat:number;pattern:DrumPattern;onBpmChange:(bpm:number)=>void;onDrumPlayingChange:(playing:boolean)=>void;onMetronomePlayingChange:(playing:boolean)=>void;onPatternChange:(pattern:DrumPattern)=>void}

const PRESETS:Record<string,DrumPattern>={
  '基础 Rock':{kick:[true,false,false,false,true,false,false,false,true,false,false,false,true,false,false,false],snare:[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],hat:[true,false,true,false,true,false,true,false,true,false,true,false,true,false,false,false],openHat:[false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,false],crash:[true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],ride:Array(16).fill(false)},
  '8 Beat':{kick:[true,false,false,true,false,false,true,false,true,false,false,true,false,false,true,false],snare:[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],hat:Array(16).fill(true),openHat:Array(16).fill(false),crash:[true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],ride:Array(16).fill(false)},
  'Funk':{kick:[true,false,true,false,false,false,true,false,true,false,false,true,false,true,false,false],snare:[false,false,false,false,true,false,false,false,false,false,false,false,true,false,false,false],hat:[true,false,true,true,true,false,true,true,true,false,true,true,true,false,false,true],openHat:[false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,false],crash:Array(16).fill(false),ride:Array(16).fill(false)},
}

export function DrumMachine({bpm,drumPlaying,drumStep,metronomePlaying,metronomeBeat,pattern,onBpmChange,onDrumPlayingChange,onMetronomePlayingChange,onPatternChange}:Props){
  return <section className="drum-machine">
    <div className="drum-head"><div><span>GUITAR PRACTICE GROOVE</span><h2>16 步节奏编排</h2><p>点击格子编辑节奏，用稳定的四分音符与十六分律动练习扫弦、节拍和即兴。</p></div><div className="drum-transport"><button onClick={()=>onBpmChange(Math.max(40,bpm-5))}>−</button><strong>{bpm}<small>BPM</small></strong><button onClick={()=>onBpmChange(Math.min(240,bpm+5))}>+</button><button className={drumPlaying?'stop':'start'} onClick={()=>onDrumPlayingChange(!drumPlaying)}>{drumPlaying?<><Square size={14}/> 停止</>:<><Play size={15}/> 播放</>}</button></div></div>
    <div className="metronome-card"><div className={`metronome-body ${metronomePlaying?'swinging':''}`} style={{'--swing-duration':`${60/bpm}s`} as CSSProperties}><i/><b/><em/></div><div><span>TRADITIONAL METRONOME</span><h3>传统节拍器 · {bpm} BPM</h3><p>每小节第一拍为重音；摆锤左右各一次正好是一拍。</p><div className="metro-beats">{[0,1,2,3].map((beat)=><i key={beat} className={metronomePlaying&&metronomeBeat===beat?'active':''}>{beat+1}</i>)}</div></div><button className={metronomePlaying?'metro-stop':'metro-start'} onClick={()=>onMetronomePlayingChange(!metronomePlaying)}>{metronomePlaying?<><Square size={14}/> 停止</>:<><Play size={15}/> 开始节拍</>}</button></div>
    <div className="drum-presets"><span>快速节奏</span>{Object.entries(PRESETS).map(([name,preset])=><button key={name} onClick={()=>onPatternChange(preset)}>{name}</button>)}</div>
    <div className="drum-grid">{(['kick','snare','hat','openHat','crash','ride'] as const).map((row)=><div className="drum-row" key={row}><strong>{{kick:'底鼓',snare:'军鼓',hat:'闭镲',openHat:'开镲',crash:'吊镲',ride:'叮叮镲'}[row]}</strong>{pattern[row].map((on,index)=><button key={index} aria-label={`${row} 第 ${index+1} 步`} className={`${on?'on':''} ${drumStep===index?'playing':''} ${index%4===0?'beat':''}`} onClick={()=>onPatternChange({...pattern,[row]:pattern[row].map((value,step)=>step===index?!value:value)})}>{index%4===0?index/4+1:''}</button>)}</div>)}</div>
    <div className="drum-tip"><strong>练琴建议</strong><span>从 70 BPM 开始，每次连续稳定演奏 4 小节后再提升 5 BPM。可保持本页播放鼓机，同时切到录音机录下练习。</span></div>
  </section>
}
