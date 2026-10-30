import type { HintState } from './types'

const HINT_SWITCH_THRESHOLD = 15
const HINT_TIME_THRESHOLD = 120 // seconds

export function initHint(): HintState {
  return { level: 0, switches: 0, since: 0 }
}

export function tickHint(hint: HintState, now: number): HintState {
  if (hint.level >= 2) return hint
  const elapsed = now - hint.since
  if (elapsed >= HINT_TIME_THRESHOLD) {
    return {
      level: Math.min(2, hint.level + 1) as 0 | 1 | 2,
      switches: 0,
      since: now,
    }
  }
  return hint
}

export function onCameraSwitch(hint: HintState, now: number): HintState {
  if (hint.level >= 2) return hint
  const newSwitches = hint.switches + 1
  if (newSwitches >= HINT_SWITCH_THRESHOLD) {
    return {
      level: Math.min(2, hint.level + 1) as 0 | 1 | 2,
      switches: 0,
      since: now,
    }
  }
  return { ...hint, switches: newSwitches }
}

export function resetHint(now: number): HintState {
  return { level: 0, switches: 0, since: now }
}
