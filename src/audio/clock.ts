// Music clock — pure functions, no Web Audio dependencies

export interface MusicConfig {
  bpm: number
  beatsPerBar: number
  bars: number
}

export interface MusicPosition {
  loopTime: number
  bar: number
  beat: number
  beatPhase: number
  loopPhase: number
}

/** Compute musical position for a given elapsed time (seconds). */
export function positionAt(elapsed: number, config: MusicConfig): MusicPosition {
  const { bpm, beatsPerBar, bars } = config
  const secPerBeat = 60 / bpm
  const loopDuration = bars * beatsPerBar * secPerBeat
  const loopTime = ((elapsed % loopDuration) + loopDuration) % loopDuration
  const totalBeats = loopTime / secPerBeat
  const beat = Math.floor(totalBeats) % beatsPerBar
  const bar = Math.floor(totalBeats / beatsPerBar)
  const beatPhase = totalBeats - Math.floor(totalBeats)
  const loopPhase = loopTime / loopDuration
  return { loopTime, bar, beat, beatPhase, loopPhase }
}

export interface BeatDetector {
  /** Call each frame with current elapsed time. Returns events that fired. */
  update(elapsed: number): { beat?: MusicPosition; bar?: MusicPosition }
}

/** Create a stateful beat/bar event detector. */
export function createBeatDetector(config: MusicConfig): BeatDetector {
  const { bpm, beatsPerBar, bars } = config
  const secPerBeat = 60 / bpm
  const totalBeatsInLoop = bars * beatsPerBar

  let prevBeatIndex = -1

  return {
    update(elapsed: number) {
      const pos = positionAt(elapsed, config)
      const loopTime = pos.loopTime
      const currentBeatIndex = Math.floor(loopTime / secPerBeat) % totalBeatsInLoop

      const result: { beat?: MusicPosition; bar?: MusicPosition } = {}

      if (prevBeatIndex !== currentBeatIndex) {
        result.beat = pos
        // Bar fires on beat 0 of any bar
        if (pos.beat === 0) {
          result.bar = pos
        }
        prevBeatIndex = currentBeatIndex
      }

      return result
    },
  }
}
