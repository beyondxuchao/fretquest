import { useCallback, useEffect, useRef } from 'react'
import { NOTES, OPEN_MIDI, SAMPLE_NOTE_NAMES } from '../../lib/musicTheory'

function getAudioContextClass() {
  return window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
}

let guitarSoundfontPromise: Promise<Record<string, string> | null> | null = null

function getGuitarSoundfont() {
  return (window as unknown as { MIDI?: { Soundfont?: { acoustic_guitar_steel?: Record<string, string> } } }).MIDI?.Soundfont?.acoustic_guitar_steel
}

function loadGuitarSoundfont() {
  const loaded = getGuitarSoundfont()
  if (loaded) return Promise.resolve(loaded)
  if (guitarSoundfontPromise) return guitarSoundfontPromise
  guitarSoundfontPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = `${import.meta.env.BASE_URL}audio/fluidr3-acoustic-guitar-steel.js`
    script.async = true
    script.onload = () => resolve(getGuitarSoundfont() ?? null)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return guitarSoundfontPromise
}

function playSynthGuitar(ctx: AudioContext, midi: number) {
  const frequency = 440 * Math.pow(2, (midi - 69) / 12)
  const duration = Math.max(1.3, 2.7 - frequency / 700)
  const frameCount = Math.ceil(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  const period = Math.max(2, Math.round(ctx.sampleRate / frequency))
  const delayLine = new Float32Array(period)
  for (let i = 0; i < period; i++) {
    const pickPosition = i / period
    const envelope = Math.sin(Math.PI * Math.min(1, pickPosition * 3.2))
    delayLine[i] = (Math.random() * 2 - 1) * envelope
  }
  let previous = 0
  for (let i = 0; i < frameCount; i++) {
    const index = i % period
    const current = delayLine[index]
    const next = delayLine[(index + 1) % period]
    const filtered = .996 * (current + next) * .5
    delayLine[index] = filtered
    previous = previous * .08 + current * .92
    data[i] = previous * Math.exp(-i / (ctx.sampleRate * duration * .72))
  }
  const source = ctx.createBufferSource()
  const body = ctx.createBiquadFilter()
  const warmth = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  body.type = 'peaking'; body.frequency.value = 190; body.Q.value = 1.1; body.gain.value = 5
  warmth.type = 'lowpass'; warmth.frequency.value = 3600; warmth.Q.value = .45
  gain.gain.setValueAtTime(.18, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration)
  source.buffer = buffer
  source.connect(body).connect(warmth).connect(gain).connect(ctx.destination)
  source.start(); source.stop(ctx.currentTime + duration)
}

export function useGuitarAudio(soundOn: boolean) {
  const playbackContextRef = useRef<AudioContext | null>(null)
  const guitarSampleCache = useRef(new Map<number, AudioBuffer>())
  const guitarSamplePromises = useRef(new Map<number, Promise<AudioBuffer | null>>())

  useEffect(() => {
    void loadGuitarSoundfont()
  }, [])

  const playTone = useCallback((note: string, good: boolean) => {
    if (!soundOn) return
    const AudioContextClass = getAudioContextClass()
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const semitone = NOTES.indexOf(note)
    osc.frequency.value = 261.63 * Math.pow(2, semitone / 12)
    osc.type = good ? 'sine' : 'triangle'
    gain.gain.setValueAtTime(good ? 0.09 : 0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (good ? 0.22 : 0.12))
    osc.connect(gain).connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.24)
  }, [soundOn])

  const playGuitar = useCallback((string: number, fret: number) => {
    if (!soundOn) return
    const AudioContextClass = getAudioContextClass()
    const midi = OPEN_MIDI[string] + fret
    const sampleKey = `${SAMPLE_NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
    const ctx = playbackContextRef.current || new AudioContextClass()
    playbackContextRef.current = ctx
    if (ctx.state === 'suspended') void ctx.resume()

    const playSample = (buffer: AudioBuffer) => {
      const source = ctx.createBufferSource()
      const gain = ctx.createGain()
      source.buffer = buffer
      gain.gain.setValueAtTime(.42, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + Math.min(buffer.duration, 4.5))
      source.connect(gain).connect(ctx.destination)
      source.start()
    }
    const cached = guitarSampleCache.current.get(midi)
    if (cached) { playSample(cached); return }
    const loadSample = () => loadGuitarSoundfont().then((soundfont) => {
      const sampleUri = soundfont?.[sampleKey]
      if (!sampleUri) return null
      return fetch(sampleUri)
        .then((response) => response.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => {
          guitarSampleCache.current.set(midi, buffer)
          return buffer
        })
    }).catch(() => null)
    const pending = guitarSamplePromises.current.get(midi) ?? loadSample()
    guitarSamplePromises.current.set(midi, pending)
    void pending.then((buffer) => {
      guitarSamplePromises.current.delete(midi)
      if (buffer) playSample(buffer)
      else playSynthGuitar(ctx, midi)
    })
  }, [soundOn])

  return { playGuitar, playTone }
}
