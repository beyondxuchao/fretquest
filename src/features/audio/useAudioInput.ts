import { useCallback, useEffect, useRef, useState } from 'react'
import type { InputState, Status } from '../../types'

type AudioInputOptions = {
  notes: readonly string[]
  noiseGate: number
  stability: number
  status: Status
  onStableNote: (note:string) => void
}

export function useAudioInput({ notes, noiseGate, stability, status, onStableNote }: AudioInputOptions) {
  const [state,setState]=useState<InputState>('off')
  const [devices,setDevices]=useState<MediaDeviceInfo[]>([])
  const [deviceId,setDeviceId]=useState('')
  const [detectedNote,setDetectedNote]=useState<string|null>(null)
  const [detectedMidi,setDetectedMidi]=useState<number|null>(null)
  const [detectedHz,setDetectedHz]=useState(0)
  const [detectedCents,setDetectedCents]=useState(0)
  const [pitchStable,setPitchStable]=useState(false)
  const [inputLevel,setInputLevel]=useState(0)
  const [error,setError]=useState('')
  const audioRef=useRef<{context:AudioContext;stream:MediaStream;raf:number}|null>(null)
  const noiseGateRef=useRef(noiseGate)
  const stabilityRef=useRef(stability)
  const statusRef=useRef(status)
  const onStableNoteRef=useRef(onStableNote)
  noiseGateRef.current=noiseGate;stabilityRef.current=stability;statusRef.current=status;onStableNoteRef.current=onStableNote

  const stop=useCallback(()=>{
    const audio=audioRef.current
    if(audio){cancelAnimationFrame(audio.raf);audio.stream.getTracks().forEach((track)=>track.stop());void audio.context.close();audioRef.current=null}
    setState('off');setDetectedNote(null);setDetectedMidi(null);setDetectedHz(0);setDetectedCents(0);setPitchStable(false);setInputLevel(0)
  },[])

  const connect=useCallback(async(selectedId?:string)=>{
    stop();setState('requesting');setError('')
    try{
      const mediaStream=await navigator.mediaDevices.getUserMedia({audio:{deviceId:selectedId?{exact:selectedId}:undefined,echoCancellation:false,noiseSuppression:false,autoGainControl:false}})
      const available=(await navigator.mediaDevices.enumerateDevices()).filter((device)=>device.kind==='audioinput')
      setDevices(available);setDeviceId(mediaStream.getAudioTracks()[0]?.getSettings().deviceId||selectedId||'')
      const context=new AudioContext(),source=context.createMediaStreamSource(mediaStream),analyser=context.createAnalyser()
      analyser.fftSize=4096;analyser.smoothingTimeConstant=0;source.connect(analyser)
      const samples=new Float32Array(analyser.fftSize)
      let lastNote='',stableFrames=0,lastSubmitted='',quietFrames=0
      const detectPitch=()=>{
        analyser.getFloatTimeDomainData(samples)
        let rms=0;for(const sample of samples)rms+=sample*sample;rms=Math.sqrt(rms/samples.length);setInputLevel(Math.min(1,rms*14))
        let frequency=0
        if(rms>noiseGateRef.current/1000){const minLag=Math.floor(context.sampleRate/1050),maxLag=Math.min(Math.floor(context.sampleRate/65),samples.length/2);let bestLag=-1,bestCorrelation=0;for(let lag=minLag;lag<=maxLag;lag++){let correlation=0;for(let index=0;index<samples.length-lag;index++)correlation+=samples[index]*samples[index+lag];if(correlation>bestCorrelation){bestCorrelation=correlation;bestLag=lag}}if(bestLag>0)frequency=context.sampleRate/bestLag}
        if(frequency){const midi=Math.round(69+12*Math.log2(frequency/440)),note=notes[((midi%12)+12)%12],exactFrequency=440*Math.pow(2,(midi-69)/12),cents=Math.round(1200*Math.log2(frequency/exactFrequency));setDetectedNote(note);setDetectedMidi(midi);setDetectedHz(frequency);setDetectedCents(cents);quietFrames=0;if(note===lastNote)stableFrames++;else{lastNote=note;stableFrames=1}setPitchStable(stableFrames>=stabilityRef.current);if(stableFrames>=stabilityRef.current&&Math.abs(cents)<=35&&note!==lastSubmitted&&statusRef.current==='playing'){lastSubmitted=note;onStableNoteRef.current(note)}}else{quietFrames++;if(quietFrames>5){setDetectedNote(null);setDetectedMidi(null);setDetectedHz(0);setDetectedCents(0);setPitchStable(false);lastSubmitted='';stableFrames=0}}
        if(audioRef.current)audioRef.current.raf=requestAnimationFrame(detectPitch)
      }
      audioRef.current={context,stream:mediaStream,raf:requestAnimationFrame(detectPitch)};setState('listening')
    }catch(reason){setState('error');setError(reason instanceof DOMException&&reason.name==='NotAllowedError'?'没有麦克风权限，请在浏览器地址栏中允许访问。':'无法打开音频输入，请确认设备已连接且未被其他程序占用。')}
  },[notes,stop])

  useEffect(()=>()=>stop(),[stop])
  return {state,devices,deviceId,detectedNote,detectedMidi,detectedHz,detectedCents,pitchStable,inputLevel,error,connect,stop}
}
