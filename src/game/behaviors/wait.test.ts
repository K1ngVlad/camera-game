import { describe, it, expect } from 'vitest'
import { waitBehavior } from './wait'
import type { CatConfig } from '../../data/cats'

const mockCat: CatConfig = {
  id: 'keyboard',
  name: 'Keyboard Cat',
  anim: { squash: 0.1, axis: 'y', frameMode: 'none', frames: ['body'] },
  display: { camera: 220, stage: 200 },
  tint: '#9FB4FF',
  camera: 3,
  behavior: { type: 'wait', bars: 4 },
  unlocks: { cameras: [], tools: [] },
  stagePos: { x: 0.64, y: 0.78 },
  enabled: true,
}

const ctxOnCam = { screen: 'cameras' as const, camera: 3, uv: false }
const ctxOtherCam = { screen: 'cameras' as const, camera: 6, uv: false }
const ctxOffice = { screen: 'office' as const, camera: 3, uv: false }

describe('waitBehavior', () => {
  it('init starts out with counter 0', () => {
    const state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    expect(state.catState).toBe('out')
    expect(state.counter).toBe(0)
    expect(state.camera).toBe(3)
    expect(state.bars).toBe(4)
  })

  it('view out: not clickable', () => {
    const state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    const view = waitBehavior.view(state, ctxOnCam)
    expect(view.catState).toBe('out')
    expect(view.clickable).toBe(false)
  })

  it('bar events on wrong camera do not advance counter', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    state = waitBehavior.on(state, { type: 'bar' }, ctxOtherCam)
    state = waitBehavior.on(state, { type: 'bar' }, ctxOtherCam)
    expect(state.counter).toBe(0)
    expect(state.catState).toBe('out')
  })

  it('bar events on wrong screen do not advance counter', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    state = waitBehavior.on(state, { type: 'bar' }, ctxOffice)
    expect(state.counter).toBe(0)
  })

  it('2 bar events on camera 3 → peek', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    expect(state.catState).toBe('peek')
    expect(state.counter).toBe(2)
  })

  it('4 bar events on camera 3 → in', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    for (let i = 0; i < 4; i++) {
      state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    }
    expect(state.catState).toBe('in')
    expect(state.counter).toBe(4)
  })

  it('view in: clickable', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    for (let i = 0; i < 4; i++) {
      state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    }
    const view = waitBehavior.view(state, ctxOnCam)
    expect(view.clickable).toBe(true)
    expect(view.catState).toBe('in')
  })

  it('bar events do not advance past in', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    for (let i = 0; i < 6; i++) {
      state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    }
    expect(state.catState).toBe('in')
    expect(state.counter).toBe(4)
  })

  it('cameraChanged while out → reset', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    state = waitBehavior.on(state, { type: 'cameraChanged', from: 3, to: 6 }, ctxOnCam)
    expect(state.catState).toBe('out')
    expect(state.counter).toBe(0)
  })

  it('cameraChanged while peek → reset', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam) // now peek
    state = waitBehavior.on(state, { type: 'cameraChanged', from: 3, to: 6 }, ctxOnCam)
    expect(state.catState).toBe('out')
    expect(state.counter).toBe(0)
  })

  it('cameraChanged while in → stays in', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    for (let i = 0; i < 4; i++) {
      state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    }
    state = waitBehavior.on(state, { type: 'cameraChanged', from: 3, to: 6 }, ctxOnCam)
    expect(state.catState).toBe('in')
  })

  it('screenChanged while out → reset', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    state = waitBehavior.on(state, { type: 'screenChanged', screen: 'office' }, ctxOnCam)
    expect(state.catState).toBe('out')
    expect(state.counter).toBe(0)
  })

  it('screenChanged while in → stays in', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    for (let i = 0; i < 4; i++) {
      state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    }
    state = waitBehavior.on(state, { type: 'screenChanged', screen: 'office' }, ctxOnCam)
    expect(state.catState).toBe('in')
  })

  it('horn on cat camera resets from out', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    state = waitBehavior.on(state, { type: 'horn', camera: 3 }, ctxOnCam)
    expect(state.catState).toBe('out')
    expect(state.counter).toBe(0)
  })

  it('horn on cat camera resets from peek', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    state = waitBehavior.on(state, { type: 'horn', camera: 3 }, ctxOnCam)
    expect(state.catState).toBe('out')
    expect(state.counter).toBe(0)
  })

  it('horn on cat camera resets from in', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    for (let i = 0; i < 4; i++) {
      state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    }
    state = waitBehavior.on(state, { type: 'horn', camera: 3 }, ctxOnCam)
    expect(state.catState).toBe('out')
    expect(state.counter).toBe(0)
  })

  it('horn on different camera does nothing', () => {
    let state = waitBehavior.init(mockCat, { type: 'wait', bars: 4 })
    for (let i = 0; i < 4; i++) {
      state = waitBehavior.on(state, { type: 'bar' }, ctxOnCam)
    }
    const before = state
    state = waitBehavior.on(state, { type: 'horn', camera: 6 }, ctxOnCam)
    expect(state).toBe(before)
  })
})
