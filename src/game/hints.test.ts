import { describe, it, expect } from 'vitest'
import { initHint, tickHint, onCameraSwitch, resetHint } from './hints'

describe('hints', () => {
  it('starts at level 0', () => {
    expect(initHint().level).toBe(0)
  })

  it('advances level after 120s', () => {
    const h = { level: 0 as const, switches: 0, since: 0 }
    const h1 = tickHint(h, 121)
    expect(h1.level).toBe(1)
  })

  it('does not advance before 120s', () => {
    const h = { level: 0 as const, switches: 0, since: 0 }
    const h1 = tickHint(h, 50)
    expect(h1.level).toBe(0)
  })

  it('does not advance beyond 2', () => {
    const h = { level: 2 as const, switches: 0, since: 0 }
    const h1 = tickHint(h, 999)
    expect(h1.level).toBe(2)
  })

  it('advances after 15 camera switches', () => {
    let h = initHint()
    for (let i = 0; i < 14; i++) h = onCameraSwitch(h, 0)
    expect(h.level).toBe(0)
    h = onCameraSwitch(h, 0)
    expect(h.level).toBe(1)
  })

  it('resets hint state', () => {
    const r = resetHint(200)
    expect(r.level).toBe(0)
    expect(r.switches).toBe(0)
    expect(r.since).toBe(200)
  })
})
