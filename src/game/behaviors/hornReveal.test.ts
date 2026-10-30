import { describe, it, expect } from 'vitest'
import { hornRevealBehavior } from './hornReveal'
import type { CatConfig } from '../../data/cats'

const mockCat: CatConfig = {
  id: 'longcat',
  name: 'Long Cat',
  anim: { squash: 0.2, axis: 'y', frameMode: 'none', frames: ['body'] },
  display: { camera: 220, stage: 200 },
  tint: '#E9A15B',
  camera: 6,
  behavior: { type: 'hornReveal' },
  unlocks: { cameras: [], tools: [] },
  stagePos: { x: 0.44, y: 0.78 },
  enabled: true,
}

const ctx = { screen: 'cameras' as const, camera: 6, uv: false }

describe('hornRevealBehavior', () => {
  it('init starts in hidden state', () => {
    const state = hornRevealBehavior.init(mockCat, { type: 'hornReveal' })
    expect(state.catState).toBe('hidden')
    expect(state.camera).toBe(6)
  })

  it('view in hidden: not clickable, bin shown', () => {
    const state = hornRevealBehavior.init(mockCat, { type: 'hornReveal' })
    const view = hornRevealBehavior.view(state, ctx)
    expect(view.catState).toBe('hidden')
    expect(view.clickable).toBe(false)
    expect(view.props.bin).toBe('shown')
  })

  it('horn on cat camera transitions hidden → revealed', () => {
    const state = hornRevealBehavior.init(mockCat, { type: 'hornReveal' })
    const after = hornRevealBehavior.on(state, { type: 'horn', camera: 6 }, ctx)
    expect(after.catState).toBe('revealed')
  })

  it('view in revealed: clickable, bin hidden', () => {
    const state = hornRevealBehavior.init(mockCat, { type: 'hornReveal' })
    const revealed = hornRevealBehavior.on(state, { type: 'horn', camera: 6 }, ctx)
    const view = hornRevealBehavior.view(revealed, ctx)
    expect(view.catState).toBe('revealed')
    expect(view.clickable).toBe(true)
    expect(view.props.bin).toBe('hidden')
  })

  it('horn on a different camera does nothing', () => {
    const state = hornRevealBehavior.init(mockCat, { type: 'hornReveal' })
    const after = hornRevealBehavior.on(state, { type: 'horn', camera: 3 }, ctx)
    expect(after.catState).toBe('hidden')
    expect(after).toBe(state)
  })

  it('horn on cat camera when already revealed does nothing', () => {
    const state = hornRevealBehavior.init(mockCat, { type: 'hornReveal' })
    const revealed = hornRevealBehavior.on(state, { type: 'horn', camera: 6 }, ctx)
    const again = hornRevealBehavior.on(revealed, { type: 'horn', camera: 6 }, ctx)
    expect(again).toBe(revealed)
  })

  it('revealed state persists after camera change', () => {
    const state = hornRevealBehavior.init(mockCat, { type: 'hornReveal' })
    const revealed = hornRevealBehavior.on(state, { type: 'horn', camera: 6 }, ctx)
    const after = hornRevealBehavior.on(revealed, { type: 'cameraChanged', from: 6, to: 3 }, ctx)
    expect(after.catState).toBe('revealed')
  })

  it('bar events do not affect state', () => {
    const state = hornRevealBehavior.init(mockCat, { type: 'hornReveal' })
    const after = hornRevealBehavior.on(state, { type: 'bar' }, ctx)
    expect(after).toBe(state)
  })
})
