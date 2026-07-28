import { useCallback, useEffect, useRef, useState } from 'react'
import type { DrumPattern } from './DrumMachine'

const DEFAULT_PATTERN: DrumPattern = {
  kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  hat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
  openHat: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false],
  crash: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  ride: Array(16).fill(false),
}

type DrumKind = 'kick' | 'snare' | 'hat' | 'openHat' | 'crash' | 'ride'
type SampleLevel = 'soft' | 'medium' | 'hard'

const SAMPLE_FILES: Record<DrumKind, Record<SampleLevel, string>> = {
  kick: {soft:'kick-soft.wav',medium:'kick-medium.wav',hard:'kick-hard.wav'},
  snare: {soft:'snare-soft.wav',medium:'snare-medium.wav',hard:'snare-hard.wav'},
  hat: {soft:'hihat-closed-soft.wav',medium:'hihat-closed-medium.wav',hard:'hihat-closed-hard.wav'},
  openHat: {soft:'hihat-open-soft.wav',medium:'hihat-open-medium.wav',hard:'hihat-open-hard.wav'},
  crash: {soft:'crash-soft.wav',medium:'crash-medium.wav',hard:'crash-hard.wav'},
  ride: {soft:'ride-soft.wav',medium:'ride-medium.wav',hard:'ride-hard.wav'},
}

const SAMPLE_BASE_URL = `${import.meta.env.BASE_URL}audio/drums/avl-black-pearl/`

function createAudioContext() {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  return new AudioContextClass()
}

export function useDrumMachine() {
  const [bpm, setBpm] = useState(96)
  const [drumPlaying, setDrumPlayingState] = useState(false)
  const [metronomePlaying, setMetronomePlayingState] = useState(false)
  const [metronomeBeat, setMetronomeBeat] = useState(0)
  const [drumStep, setDrumStep] = useState(-1)
  const [pattern, setPattern] = useState<DrumPattern>(DEFAULT_PATTERN)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sampleBuffersRef = useRef(new Map<string, AudioBuffer>())
  const sampleDataRef = useRef(new Map<string, ArrayBuffer>())
  const samplesDecodingRef = useRef(false)
  const openHatSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const drumTimerRef = useRef<number | null>(null)
  const metronomeTimerRef = useRef<number | null>(null)

  const getAudioContext = useCallback(() => {
    const context = audioContextRef.current || createAudioContext()
    audioContextRef.current = context
    if (context.state === 'suspended') void context.resume()
    return context
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const loadSamples = async () => {
      const entries = Object.entries(SAMPLE_FILES).flatMap(([kind, levels]) =>
        Object.entries(levels).map(([level, file]) => [`${kind}-${level}`, file] as const),
      )
      await Promise.all(entries.map(async ([key, file]) => {
        try {
          const response = await fetch(`${SAMPLE_BASE_URL}${file}`, {signal:controller.signal})
          if (!response.ok) throw new Error(`Unable to load ${file}`)
          const data = await response.arrayBuffer()
          sampleDataRef.current.set(key, data)
          const context = audioContextRef.current
          if (context && !sampleBuffersRef.current.has(key)) {
            const buffer = await context.decodeAudioData(data.slice(0))
            sampleBuffersRef.current.set(key, buffer)
          }
        } catch (error) {
          if (!controller.signal.aborted) console.warn('[drums] AVL sample unavailable, using synth fallback:', error)
        }
      }))
    }
    void loadSamples()
    return () => controller.abort()
  }, [])

  const decodeSamples = useCallback((context: AudioContext) => {
    if (samplesDecodingRef.current || sampleBuffersRef.current.size === Object.keys(SAMPLE_FILES).length * 3) return
    samplesDecodingRef.current = true
    void Promise.all([...sampleDataRef.current.entries()].map(async ([key, data]) => {
      try {
        sampleBuffersRef.current.set(key, await context.decodeAudioData(data.slice(0)))
      } catch (error) {
        console.warn('[drums] Unable to decode AVL sample:', error)
      }
    })).finally(() => { samplesDecodingRef.current = false })
  }, [])

  const unlockAudio = useCallback(() => {
    const context = getAudioContext()
    if (context.state === 'suspended') void context.resume()
    decodeSamples(context)
  }, [decodeSamples, getAudioContext])

  const setDrumPlaying = useCallback((playing: boolean) => {
    if (playing) unlockAudio()
    if (playing) setMetronomePlayingState(false)
    setDrumPlayingState(playing)
  }, [unlockAudio])

  const setMetronomePlaying = useCallback((playing: boolean) => {
    if (playing) unlockAudio()
    if (playing) setDrumPlayingState(false)
    setMetronomePlayingState(playing)
  }, [unlockAudio])

  const playDrumHit = useCallback((kind: DrumKind, accent = false) => {
    const context = getAudioContext()
    const now = context.currentTime
    const level: SampleLevel = accent ? 'hard' : Math.random() < 0.35 ? 'soft' : 'medium'
    const sample = sampleBuffersRef.current.get(`${kind}-${level}`)
    if (sample) {
      if (kind === 'hat' && openHatSourceRef.current) {
        try { openHatSourceRef.current.stop(now) } catch { /* source already ended */ }
        openHatSourceRef.current = null
      }
      const source = context.createBufferSource()
      const gain = context.createGain()
      const filter = context.createBiquadFilter()
      source.buffer = sample
      source.playbackRate.value = 1
      filter.type = 'lowpass'
      filter.frequency.value = kind === 'hat' || kind === 'openHat' ? 8500 : kind === 'crash' || kind === 'ride' ? 10500 : 18000
      filter.Q.value = 0.35
      gain.gain.value = kind === 'hat' ? 0.3 : kind === 'openHat' ? 0.28 : kind === 'crash' ? 0.24 : kind === 'ride' ? 0.27 : kind === 'snare' ? 0.66 : 0.78
      source.connect(filter).connect(gain).connect(context.destination)
      if (kind === 'openHat') { openHatSourceRef.current=source; source.onended=()=>{if(openHatSourceRef.current===source)openHatSourceRef.current=null} }
      source.start(now)
      return
    }
    if (sampleDataRef.current.has(`${kind}-${level}`)) return
    if (kind === 'kick') {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(150, now)
      oscillator.frequency.exponentialRampToValueAtTime(48, now + 0.13)
      gain.gain.setValueAtTime(0.55, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(now)
      oscillator.stop(now + 0.19)
      return
    }
    const length = kind === 'snare' ? 0.16 : 0.055
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length)
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    filter.type = 'highpass'
    filter.frequency.value = kind === 'snare' ? 1200 : 6500
    gain.gain.setValueAtTime(kind === 'snare' ? 0.24 : 0.11, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + length)
    source.buffer = buffer
    source.connect(filter).connect(gain).connect(context.destination)
    source.start(now)
  }, [getAudioContext])

  const playMetronomeClick = useCallback((accent: boolean) => {
    const context = getAudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    oscillator.type = 'square'
    oscillator.frequency.value = accent ? 1760 : 1120
    gain.gain.setValueAtTime(accent ? 0.22 : 0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.05)
  }, [getAudioContext])

  useEffect(() => {
    if (!drumPlaying) {
      if (drumTimerRef.current !== null) window.clearInterval(drumTimerRef.current)
      drumTimerRef.current = null
      setDrumStep(-1)
      return
    }
    const tick = () => setDrumStep((previous) => {
      const next = (previous + 1) % 16
      const accent = next === 0
      if (pattern.kick[next]) playDrumHit('kick', accent)
      if (pattern.snare[next]) playDrumHit('snare', accent)
      if (pattern.hat[next]) playDrumHit('hat', accent)
      if (pattern.openHat[next]) playDrumHit('openHat', accent)
      if (pattern.crash[next]) playDrumHit('crash', accent)
      if (pattern.ride[next]) playDrumHit('ride', accent)
      return next
    })
    tick()
    drumTimerRef.current = window.setInterval(tick, 60000 / bpm / 4)
    return () => {
      if (drumTimerRef.current !== null) window.clearInterval(drumTimerRef.current)
      drumTimerRef.current = null
    }
  }, [bpm, drumPlaying, pattern, playDrumHit])

  useEffect(() => {
    if (!metronomePlaying) {
      if (metronomeTimerRef.current !== null) window.clearInterval(metronomeTimerRef.current)
      metronomeTimerRef.current = null
      setMetronomeBeat(0)
      return
    }
    const tick = () => setMetronomeBeat((beat) => {
      const next = (beat + 1) % 4
      playMetronomeClick(next === 0)
      return next
    })
    playMetronomeClick(true)
    metronomeTimerRef.current = window.setInterval(tick, 60000 / bpm)
    return () => {
      if (metronomeTimerRef.current !== null) window.clearInterval(metronomeTimerRef.current)
      metronomeTimerRef.current = null
    }
  }, [bpm, metronomePlaying, playMetronomeClick])

  useEffect(() => () => {
    if (drumTimerRef.current !== null) window.clearInterval(drumTimerRef.current)
    if (metronomeTimerRef.current !== null) window.clearInterval(metronomeTimerRef.current)
    if (audioContextRef.current) void audioContextRef.current.close()
  }, [])

  return {
    bpm, setBpm, drumPlaying, setDrumPlaying, drumStep,
    metronomePlaying, setMetronomePlaying, metronomeBeat,
    pattern, setPattern, playMetronomeClick,
  }
}
