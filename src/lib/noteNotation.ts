import type { NoteNotation } from '../types'

const NOTE_NUMBERS: Record<string, string> = {
  C: '1', 'C♯': '♯1', D: '2', 'D♯': '♯2', E: '3', F: '4',
  'F♯': '♯4', G: '5', 'G♯': '♯5', A: '6', 'A♯': '♯6', B: '7',
}

let activeNotation: NoteNotation = 'letter'

export function setActiveNoteNotation(notation: NoteNotation): void {
  activeNotation = notation
}

export function formatActiveNote(note: string): string {
  return formatNote(note, activeNotation)
}

export function formatNote(note: string, notation: NoteNotation): string {
  return notation === 'number' ? NOTE_NUMBERS[note] ?? note : note
}
