import { describe, it, expect } from 'vitest'
import { staticBehavior } from './static'
import type { CatConfig } from '../../data/cats'

const mockCat: CatConfig = {
  id: 'drummer',
  name: 'Drummer',
  anim: { squash: 0.1, axis: 'y', frameMode: 'none', frames: ['body'] },
  display: { camera: 220, stage: 200 },
  tint: '#ffffff',
  camera: 1,
  behavior: { type: 'static' },
  unlocks: { cameras: [], tools: [] },
  stagePos: { x: 0.5, y: 0.78 },
  enabled: true,
}

const ctx = { screen: 'cameras' as const, camera: 1, uv: false }

describe('staticBehavior', () => {
  it('init stores cat camera', () => {
    const state = staticBehavior.init(mockCat, { type: 'static' })
    expect(state.camera).toBe(1)
  })

  it('on returns same state for any event', () => {
    const state = staticBehavior.init(mockCat, { type: 'static' })
    const after = staticBehavior.on(state, { type: 'horn', camera: 1 }, ctx)
    expect(after).toBe(state)
  })

  it('view returns visible catState and clickable', () => {
    const state = staticBehavior.init(mockCat, { type: 'static' })
    const view = staticBehavior.view(state, ctx)
    expect(view.catState).toBe('visible')
    expect(view.clickable).toBe(true)
    expect(view.camera).toBe(1)
    expect(view.props).toEqual({})
  })
})
