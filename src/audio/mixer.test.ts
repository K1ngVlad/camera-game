import { describe, it, expect } from 'vitest'
import { computeAudioState } from './mixer'
import { CATS } from '../data/cats'
import type { CatId } from '../data/cats'

function firstUnfound(found: CatId[]): CatId | null {
  return CATS.filter((c) => c.enabled).find((c) => !found.includes(c.id))?.id ?? null
}

const OPEN = 20000

describe('computeAudioState — cameras', () => {
  it('current cat on its own camera → camera gain 1.0, open, song off', () => {
    const state = computeAudioState({ screen: 'cameras', camera: 1, found: [], currentCat: 'drummer' })
    expect(state.camera?.catId).toBe('drummer')
    expect(state.camera?.gain).toBe(1.0)
    expect(state.camera?.cutoff).toBe(OPEN)
    expect(state.song.playing).toBe(false)
  })

  it('current cat on neighbor camera → gain 0.3, cutoff 800', () => {
    const state = computeAudioState({ screen: 'cameras', camera: 2, found: [], currentCat: 'drummer' })
    expect(state.camera?.catId).toBe('drummer')
    expect(state.camera?.gain).toBe(0.3)
    expect(state.camera?.cutoff).toBe(800)
  })

  it('current cat far away → camera null', () => {
    const state = computeAudioState({ screen: 'cameras', camera: 16, found: [], currentCat: 'drummer' })
    expect(state.camera).toBeNull()
  })

  it('longcat on its camera after drummer found', () => {
    const found: CatId[] = ['drummer']
    const state = computeAudioState({
      screen: 'cameras',
      camera: 6,
      found,
      currentCat: firstUnfound(found),
    })
    expect(state.camera?.catId).toBe('longcat')
    expect(state.camera?.gain).toBe(1.0)
  })

  it('currentCat null → no camera loop', () => {
    const state = computeAudioState({ screen: 'cameras', camera: 1, found: [], currentCat: null })
    expect(state.camera).toBeNull()
  })
})

describe('computeAudioState — office', () => {
  it('no found cats → song not playing', () => {
    const state = computeAudioState({ screen: 'office', camera: 1, found: [], currentCat: 'drummer' })
    expect(state.song.playing).toBe(false)
    expect(state.camera).toBeNull()
  })

  it('found drummer → song playing, drummer gain 1.0, busGain 0.22, cutoff 700', () => {
    const state = computeAudioState({
      screen: 'office',
      camera: 1,
      found: ['drummer'],
      currentCat: firstUnfound(['drummer']),
    })
    expect(state.song.playing).toBe(true)
    expect(state.song.gains['drummer']).toBe(1.0)
    expect(state.song.busGain).toBe(0.22)
    expect(state.song.cutoff).toBe(700)
  })

  it('unfound cats have gain 0 in office', () => {
    const state = computeAudioState({
      screen: 'office',
      camera: 1,
      found: ['drummer'],
      currentCat: firstUnfound(['drummer']),
    })
    expect(state.song.gains['longcat']).toBe(0)
  })
})

describe('computeAudioState — menu', () => {
  it('menu → song playing, all enabled cats gain 1.0, busGain 0.18, cutoff 900', () => {
    const state = computeAudioState({ screen: 'menu', camera: 0, found: [], currentCat: null })
    expect(state.song.playing).toBe(true)
    expect(state.song.busGain).toBe(0.18)
    expect(state.song.cutoff).toBe(900)
    expect(state.camera).toBeNull()
    for (const cat of CATS.filter((c) => c.enabled)) {
      expect(state.song.gains[cat.id]).toBe(1.0)
    }
  })
})

describe('computeAudioState — stage', () => {
  it('stage with found cats → song playing, busGain 1.0, open cutoff', () => {
    const found: CatId[] = ['drummer']
    const state = computeAudioState({ screen: 'stage', camera: 0, found, currentCat: null })
    expect(state.song.playing).toBe(true)
    expect(state.song.busGain).toBe(1.0)
    expect(state.song.cutoff).toBe(OPEN)
    expect(state.song.gains['drummer']).toBe(1.0)
    expect(state.camera).toBeNull()
  })

  it('disabled cats have no gain (absent or 0) on stage', () => {
    const found: CatId[] = ['drummer', 'longcat', 'keyboard', 'pumpkin', 'choir']
    const state = computeAudioState({ screen: 'stage', camera: 0, found, currentCat: null })
    for (const cat of CATS.filter((c) => !c.enabled)) {
      expect(state.song.gains[cat.id] ?? 0).toBe(0)
    }
  })

  it('unfound enabled cats have gain 0 on stage', () => {
    const state = computeAudioState({ screen: 'stage', camera: 0, found: [], currentCat: null })
    for (const cat of CATS.filter((c) => c.enabled)) {
      expect(state.song.gains[cat.id]).toBe(0)
    }
  })
})
