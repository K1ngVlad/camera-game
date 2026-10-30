// Music clock — pure functions, no Web Audio dependencies

export interface MusicConfig {
  bpm: number
  beatsPerBar: number
  bars: number
}

// Extended timing for tracks with optional intro (loopStartBar > 0)
export interface TrackTiming {
  bpm: number
  beatsPerBar: number
  bars: number
  loopStartBar?: number  // default 0 — no intro
  loopEndBar?: number    // default bars
}

/**
 * Convert elapsed playback time to position in seconds within the audio file,
 * accounting for a one-shot intro and a repeating loop section.
 *
 * If loopStartBar == 0 the entire file loops from the beginning.
 */
export function trackTime(elapsed: number, timing: TrackTiming): number {
  const { bpm, beatsPerBar } = timing
  const barDuration = (beatsPerBar * 60) / bpm
  const loopStart = (timing.loopStartBar ?? 0) * barDuration
  const loopEnd = (timing.loopEndBar ?? timing.bars) * barDuration
  const loopDuration = loopEnd - loopStart

  if (loopDuration <= 0) return 0
  if (elapsed < loopStart) return elapsed  // still in intro
  return loopStart + ((elapsed - loopStart) % loopDuration)
}

/**
 * Compute musical bar/beat position from elapsed time, using TrackTiming.
 * Returns position within the loop section (after intro).
 */
export function trackPosition(elapsed: number, timing: TrackTiming): MusicPosition {
  const { bpm, beatsPerBar } = timing
  const secPerBeat = 60 / bpm
  const loopTime = trackTime(elapsed, timing)
  const totalBeats = loopTime / secPerBeat
  const beat = Math.floor(totalBeats) % beatsPerBar
  const bar = Math.floor(totalBeats / beatsPerBar)
  const beatPhase = totalBeats - Math.floor(totalBeats)
  const barDuration = (beatsPerBar * 60) / bpm
  const loopEnd = (timing.loopEndBar ?? timing.bars) * barDuration
  const loopPhase = loopEnd > 0 ? loopTime / loopEnd : 0
  return { loopTime, bar, beat, beatPhase, loopPhase }
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
