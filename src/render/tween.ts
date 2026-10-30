export function easeInQuad(t: number): number {
  return t * t
}

export function easeOutQuad(t: number): number {
  return t * (2 - t)
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export interface Tween {
  /** Advance tween by dt seconds. Returns true while still running. */
  update(dtSec: number): boolean
  /** Current eased value 0..1 */
  readonly value: number
  /** True when tween has reached its end */
  readonly done: boolean
}

export function createTween(
  durationSec: number,
  easing: (t: number) => number = easeOutQuad,
): Tween {
  let elapsed = 0
  let _value = 0
  let _done = false

  return {
    update(dtSec: number): boolean {
      if (_done) return false
      elapsed = Math.min(elapsed + dtSec, durationSec)
      const t = durationSec > 0 ? elapsed / durationSec : 1
      _value = easing(Math.min(t, 1))
      _done = elapsed >= durationSec
      return !_done
    },
    get value() { return _value },
    get done() { return _done },
  }
}
