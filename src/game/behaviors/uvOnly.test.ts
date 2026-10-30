import { describe, it, expect } from 'vitest'
import { uvOnlyBehavior } from './uvOnly'
import { CAT_MAP } from '../../data/cats'
import type { WorldCtx } from '../types'

const cat = CAT_MAP.get('pumpkin')!
const cfg = { type: 'uvOnly' as const }

const baseCtx: WorldCtx = { screen: 'cameras', camera: 10, uv: false }

describe('uvOnlyBehavior.init', () => {
  it('stores cat camera in state', () => {
    const state = uvOnlyBehavior.init(cat, cfg)
    expect(state.camera).toBe(cat.camera)
  })
})

describe('uvOnlyBehavior.view', () => {
  it('catState is dark and not clickable without UV', () => {
    const state = uvOnlyBehavior.init(cat, cfg)
    const view = uvOnlyBehavior.view(state, { ...baseCtx, uv: false })
    expect(view.catState).toBe('dark')
    expect(view.clickable).toBe(false)
  })

  it('catState is lit and clickable with UV', () => {
    const state = uvOnlyBehavior.init(cat, cfg)
    const view = uvOnlyBehavior.view(state, { ...baseCtx, uv: true })
    expect(view.catState).toBe('lit')
    expect(view.clickable).toBe(true)
  })

  it('always sets world.blackout = true', () => {
    const state = uvOnlyBehavior.init(cat, cfg)
    expect(uvOnlyBehavior.view(state, { ...baseCtx, uv: false }).world?.blackout).toBe(true)
    expect(uvOnlyBehavior.view(state, { ...baseCtx, uv: true }).world?.blackout).toBe(true)
  })

  it('camera matches cat.camera', () => {
    const state = uvOnlyBehavior.init(cat, cfg)
    expect(uvOnlyBehavior.view(state, baseCtx).camera).toBe(cat.camera)
  })
})

describe('uvOnlyBehavior.on', () => {
  it('horn has no effect', () => {
    const state = uvOnlyBehavior.init(cat, cfg)
    const next = uvOnlyBehavior.on(state, { type: 'horn', camera: cat.camera }, baseCtx)
    expect(next).toEqual(state)
  })

  it('bar has no effect', () => {
    const state = uvOnlyBehavior.init(cat, cfg)
    const next = uvOnlyBehavior.on(state, { type: 'bar' }, baseCtx)
    expect(next).toEqual(state)
  })
})
