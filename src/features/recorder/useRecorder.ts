import { useCallback, useEffect, useRef, useState } from 'react'

export type RecordingState = 'idle' | 'recording' | 'ready'

export function useRecorder(stream: MediaStream | null) {
  const [state,setState]=useState<RecordingState>('idle')
  const [url,setUrl]=useState('')
  const [seconds,setSeconds]=useState(0)
  const [mime,setMime]=useState('audio/webm')
  const recorderRef=useRef<MediaRecorder|null>(null)
  const chunksRef=useRef<Blob[]>([])
  const timerRef=useRef<number|null>(null)

  const clear=useCallback(()=>{setUrl((current)=>{if(current)URL.revokeObjectURL(current);return ''});setSeconds(0);setState('idle')},[])
  const stop=useCallback(()=>{if(timerRef.current){window.clearInterval(timerRef.current);timerRef.current=null}if(recorderRef.current?.state==='recording')recorderRef.current.stop()},[])
  const start=useCallback(()=>{
    if(!stream||typeof MediaRecorder==='undefined')return
    setUrl((current)=>{if(current)URL.revokeObjectURL(current);return ''})
    const candidates=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4']
    const mimeType=candidates.find((type)=>MediaRecorder.isTypeSupported(type))||''
    const recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);chunksRef.current=[]
    recorder.ondataavailable=(event)=>{if(event.data.size)chunksRef.current.push(event.data)}
    recorder.onstop=()=>{const finalMime=recorder.mimeType||mimeType||'audio/webm';setMime(finalMime);setUrl(URL.createObjectURL(new Blob(chunksRef.current,{type:finalMime})));setState('ready');recorderRef.current=null}
    recorderRef.current=recorder;setSeconds(0);setState('recording');recorder.start(250);timerRef.current=window.setInterval(()=>setSeconds((value)=>value+1),1000)
  },[stream])
  useEffect(()=>()=>{stop();setUrl((current)=>{if(current)URL.revokeObjectURL(current);return ''})},[stop])
  return {state,url,seconds,mime,start,stop,clear}
}
