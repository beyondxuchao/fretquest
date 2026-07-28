import { Cable, Mic, MicOff } from 'lucide-react'
import type { InputState } from '../../types'

type AudioInputPanelProps = {
  state: InputState
  devices: MediaDeviceInfo[]
  deviceId: string
  inputLevel: number
  pitchStable: boolean
  detectedNote: string | null
  detectedHz: number
  detectedCents: number
  error: string
  liveMap: boolean
  calibrationOpen: boolean
  noiseGate: number
  stability: number
  onConnect: (deviceId?: string) => void
  onDisconnect: () => void
  onLiveMapChange: (enabled:boolean) => void
  onCalibrationOpenChange: (open:boolean) => void
  onNoiseGateChange: (value:number) => void
  onStabilityChange: (value:number) => void
}

export function AudioInputPanel({ state, devices, deviceId, inputLevel, pitchStable, detectedNote, detectedHz, detectedCents, error, liveMap, calibrationOpen, noiseGate, stability, onConnect, onDisconnect, onLiveMapChange, onCalibrationOpenChange, onNoiseGateChange, onStabilityChange }: AudioInputPanelProps) {
  const listening = state === 'listening'
  return <div className={`input-panel input-float ${listening?'connected':''} ${calibrationOpen?'expanded':''}`}>
    <div className="input-symbol">{listening?<Mic size={19}/>:<Cable size={19}/>}</div>
    <div className="input-copy"><strong>{listening?'吉他输入已连接':'使用真实吉他作答'}</strong><span>{listening?(liveMap?'实时显示正在弹奏的实际音高位置':'弹出目标音符即可自动作答'):'连接 USB 声卡或使用设备麦克风'}</span></div>
    {listening&&<div className="pitch-monitor"><div className="level"><i style={{width:`${inputLevel*100}%`}}/></div><strong className={pitchStable?'stable':''}>{detectedNote||'—'}</strong><span>{detectedHz?`${detectedCents>0?'+':''}${detectedCents} cent`:'等待声音'}</span></div>}
    {listening&&devices.length>1&&<select value={deviceId} onChange={(event)=>onConnect(event.target.value)} aria-label="输入设备">{devices.map((device,index)=><option value={device.deviceId} key={device.deviceId}>{device.label||`音频输入 ${index+1}`}</option>)}</select>}
    <button className="connect-btn" disabled={state==='requesting'} onClick={listening?onDisconnect:()=>onConnect()}>{listening?<><MicOff size={16}/> 断开</>:<><Mic size={16}/> {state==='requesting'?'连接中…':'连接输入'}</>}</button>
    {listening&&<button className={`live-map-btn ${liveMap?'active':''}`} onClick={()=>onLiveMapChange(!liveMap)}>{liveMap?'关闭实时地图':'开启实时地图'}</button>}
    {listening&&<button className="calibrate-btn" onClick={()=>onCalibrationOpenChange(!calibrationOpen)}>{calibrationOpen?'收起':'校准'}</button>}
    {state==='error'&&<p className="input-error">{error}</p>}
    {listening&&calibrationOpen&&<div className="calibration">
      <div className="tuner"><span>♭</span><div className="tuner-track"><i className="tuner-center"/><b style={{left:`${Math.max(2,Math.min(98,50+detectedCents))}%`}}/></div><span>♯</span><strong>{detectedNote?(Math.abs(detectedCents)<=5?'音准正确':detectedCents<0?'音偏低':'音偏高'):'弹奏一个单音进行测试'}</strong><small>{detectedHz?`${detectedHz.toFixed(1)} Hz · ${pitchStable?'音高稳定':'正在确认音高'}`:'建议使用干净音色，并逐根弦拨奏'}</small></div>
      <label><span>输入灵敏度 <em>{noiseGate<=7?'高':noiseGate<=14?'中':'低'}</em></span><input type="range" min="3" max="25" value={noiseGate} onChange={(event)=>onNoiseGateChange(Number(event.target.value))}/><small>环境嘈杂或出现误触时向右调</small></label>
      <label><span>识别稳定度 <em>{stability<=5?'快速':stability<=9?'均衡':'稳定'}</em></span><input type="range" min="4" max="14" value={stability} onChange={(event)=>onStabilityChange(Number(event.target.value))}/><small>误判较多时向右调，响应会稍慢</small></label>
    </div>}
  </div>
}
