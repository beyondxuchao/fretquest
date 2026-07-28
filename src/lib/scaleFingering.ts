export type FretPosition = { string: number; fret: number }

type MidiPosition = FretPosition & { midi: number }
type Route = {
  position: MidiPosition
  notesOnString: number
  cost: number
  path: MidiPosition[]
}

type ScaleFingeringOptions = {
  start: FretPosition
  intervals: readonly number[]
  openMidi: readonly number[]
  maxFret?: number
  maxNotesPerString?: number
}

export function findScaleFingering({
  start,
  intervals,
  openMidi,
  maxFret = 15,
  maxNotesPerString = 3,
}: ScaleFingeringOptions): FretPosition[] | null {
  const startMidi = openMidi[start.string] + start.fret
  const preferOpenPosition = start.fret <= 3
  const all = openMidi.flatMap((open, string) =>
    Array.from({ length: maxFret + 1 }, (_, fret) => ({ string, fret, midi: open + fret })),
  )
  let routes: Route[] = [{
    position: { ...start, midi: startMidi },
    notesOnString: 1,
    cost: 0,
    path: [{ ...start, midi: startMidi }],
  }]

  for (const interval of [...intervals, 12].slice(1)) {
    const candidates = all.filter((position) => position.midi === startMidi + interval)
    const nextRoutes: Route[] = []

    for (const route of routes) {
      for (const candidate of candidates) {
        const sameString = candidate.string === route.position.string
        if (candidate.string > route.position.string || (sameString && route.notesOnString >= maxNotesPerString)) continue

        const stringDistance = route.position.string - candidate.string
        const openStringBonus = preferOpenPosition && candidate.fret === 0 ? 7 : 0
        const transitionCost = Math.abs(candidate.fret - route.position.fret)
          + (sameString ? 0 : 1 + stringDistance)
          - openStringBonus
        nextRoutes.push({
          position: candidate,
          notesOnString: sameString ? route.notesOnString + 1 : 1,
          cost: route.cost + transitionCost,
          path: [...route.path, candidate],
        })
      }
    }

    if (!nextRoutes.length) return null
    const bestByState = new Map<string, Route>()
    for (const route of nextRoutes) {
      const key = `${route.position.string}-${route.position.fret}-${route.notesOnString}`
      const previous = bestByState.get(key)
      if (!previous || previous.cost > route.cost) bestByState.set(key, route)
    }
    routes = [...bestByState.values()]
  }

  const best = routes.sort((a, b) => a.cost - b.cost)[0]
  return best?.path.map(({ string, fret }) => ({ string, fret })) ?? null
}
