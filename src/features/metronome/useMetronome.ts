import { useCallback, useEffect, useRef, useState } from 'react'

const SAMPLE_BASE_URL = `${import.meta.env.BASE_URL}audio/metronome/`
const METRONOME_FILES = { tick: 'sidestick-soft.wav', accent: 'sidestick-hard.wav' } as const

function createAudioContext() {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  return new AudioContextClass()
}

export function useMetronome() {
  const [bpm, setBpm] = useState(96)
  const [playing, setPlayingState] = useState(false)
  const [beat, setBeat] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sampleBuffersRef = useRef(new Map<string, AudioBuffer>())
  const sampleDataRef = useRef(new Map<string, ArrayBuffer>())
  const samplesDecodingRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  const getAudioContext = useCallback(() => {
    const context = audioContextRef.current || createAudioContext()
    audioContextRef.current = context
    if (context.state === 'suspended') void context.resume()
    return context
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const loadSamples = async () => {
      await Promise.all(Object.entries(METRONOME_FILES).map(async ([key, file]) => {
        try {
          const response = await fetch(`${SAMPLE_BASE_URL}${file}`, { signal: controller.signal })
          if (!response.ok) throw new Error(`Unable to load ${file}`)
          const data = await response.arrayBuffer()
          sampleDataRef.current.set(key, data)
          const context = audioContextRef.current
          if (context && !sampleBuffersRef.current.has(key)) sampleBuffersRef.current.set(key, await context.decodeAudioData(data.slice(0)))
        } catch (error) {
          if (!controller.signal.aborted) console.warn('[metronome] sample unavailable, using synth fallback:', error)
        }
      }))
    }
    void loadSamples()
    return () => controller.abort()
  }, [])

  const decodeSamples = useCallback((context: AudioContext) => {
    if (samplesDecodingRef.current || sampleBuffersRef.current.size === Object.keys(METRONOME_FILES).length) return
    samplesDecodingRef.current = true
    void Promise.all([...sampleDataRef.current.entries()].map(async ([key, data]) => {
      try {
        sampleBuffersRef.current.set(key, await context.decodeAudioData(data.slice(0)))
      } catch (error) {
        console.warn('[metronome] unable to decode sample:', error)
      }
    })).finally(() => { samplesDecodingRef.current = false })
  }, [])

  const unlockAudio = useCallback(() => {
    const context = getAudioContext()
    if (context.state === 'suspended') void context.resume()
    decodeSamples(context)
  }, [decodeSamples, getAudioContext])

  const setPlaying = useCallback((next: boolean) => {
    if (next) unlockAudio()
    setPlayingState(next)
  }, [unlockAudio])

  const playMetronomeClick = useCallback((accent: boolean) => {
    const context = getAudioContext()
    const now = context.currentTime
    const sample = sampleBuffersRef.current.get(accent ? 'accent' : 'tick')
    if (sample) {
      const source = context.createBufferSource()
      const filter = context.createBiquadFilter()
      const gain = context.createGain()
      source.buffer = sample
      filter.type = 'bandpass'
      filter.frequency.value = accent ? 1450 : 1850
      filter.Q.value = .7
      gain.gain.value = accent ? .38 : .25
      source.connect(filter).connect(gain).connect(context.destination)
      source.start(now)
      return
    }
    const length = .035
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * Math.exp(-index / (data.length * .16))
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    source.buffer = buffer
    filter.type = 'bandpass'
    filter.frequency.value = accent ? 1500 : 2050
    filter.Q.value = 1.5
    gain.gain.value = accent ? .32 : .2
    source.connect(filter).connect(gain).connect(context.destination)
    source.start(now)
  }, [getAudioContext])

  useEffect(() => {
    if (!playing) {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      timerRef.current = null
      setBeat(0)
      return
    }
    const tick = () => setBeat((current) => {
      const next = (current + 1) % 4
      playMetronomeClick(next === 0)
      return next
    })
    playMetronomeClick(true)
    timerRef.current = window.setInterval(tick, 60000 / bpm)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [bpm, playing, playMetronomeClick])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    if (audioContextRef.current) void audioContextRef.current.close()
  }, [])

  return { bpm, setBpm, playing, setPlaying, beat, playMetronomeClick }
}
