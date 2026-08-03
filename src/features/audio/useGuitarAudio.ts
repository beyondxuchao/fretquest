import { useCallback, useRef } from 'react'
import { NOTES, OPEN_MIDI, SAMPLE_NOTE_NAMES } from '../../lib/musicTheory'

function getAudioContextClass() {
  return window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
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
    const soundfont = (window as unknown as { MIDI?: { Soundfont?: { acoustic_guitar_steel?: Record<string, string> } } }).MIDI?.Soundfont?.acoustic_guitar_steel
    const sampleKey = `${SAMPLE_NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
    const sampleUri = soundfont?.[sampleKey]
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
    if (sampleUri) {
      void fetch(sampleUri).then((response) => response.arrayBuffer()).then((data) => ctx.decodeAudioData(data)).then((buffer) => {
        guitarSampleCache.current.set(midi, buffer); playSample(buffer)
      }).catch(() => playSynthGuitar(ctx, midi))
      return
    }
    playSynthGuitar(ctx, midi)
  }, [soundOn])

  return { playGuitar, playTone }
}
