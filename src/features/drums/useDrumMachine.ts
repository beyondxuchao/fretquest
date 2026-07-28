import { useCallback, useEffect, useRef, useState } from 'react'
import type { DrumPattern } from './DrumMachine'

const DEFAULT_PATTERN: DrumPattern = {
  kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  hat: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  return new AudioContextClass()
}

export function useDrumMachine() {
  const [bpm, setBpm] = useState(96)
  const [drumPlaying, setDrumPlaying] = useState(false)
  const [metronomePlaying, setMetronomePlaying] = useState(false)
  const [metronomeBeat, setMetronomeBeat] = useState(0)
  const [drumStep, setDrumStep] = useState(-1)
  const [pattern, setPattern] = useState<DrumPattern>(DEFAULT_PATTERN)
  const audioContextRef = useRef<AudioContext | null>(null)
  const drumTimerRef = useRef<number | null>(null)
  const metronomeTimerRef = useRef<number | null>(null)

  const getAudioContext = useCallback(() => {
    const context = audioContextRef.current || createAudioContext()
    audioContextRef.current = context
    if (context.state === 'suspended') void context.resume()
    return context
  }, [])

  const playDrumHit = useCallback((kind: 'kick' | 'snare' | 'hat') => {
    const context = getAudioContext()
    const now = context.currentTime
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
      if (pattern.kick[next]) playDrumHit('kick')
      if (pattern.snare[next]) playDrumHit('snare')
      if (pattern.hat[next]) playDrumHit('hat')
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
