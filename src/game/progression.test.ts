import { describe, it, expect } from 'vitest'
import { neighbors } from '../data/cameras'
import {
  openCameras,
  unlockedTools,
  currentCat,
  isStageOpen,
  isGameComplete,
  availableTools,
} from './progression'
import type { CatId } from '../data/cats'

describe('neighbors', () => {
  it('cam 1 (top-left) has 2 neighbors', () => {
    expect(neighbors(1).sort((a, b) => a - b)).toEqual([2, 5])
  })
  it('cam 6 (middle) has 4 neighbors', () => {
    expect(neighbors(6).sort((a, b) => a - b)).toEqual([2, 5, 7, 10])
  })
  it('cam 16 (bottom-right) has 2 neighbors', () => {
    expect(neighbors(16).sort((a, b) => a - b)).toEqual([12, 15])
  })
  it('cam 4 (top-right) has 2 neighbors', () => {
    expect(neighbors(4).sort((a, b) => a - b)).toEqual([3, 8])
  })
  it('cam 13 (bottom-left) has 2 neighbors', () => {
    expect(neighbors(13).sort((a, b) => a - b)).toEqual([9, 14])
  })
})

describe('openCameras', () => {
  it('starts with 1, 2, 5', () => {
    expect(openCameras([])).toEqual([1, 2, 5])
  })

  it('finding drummer unlocks 3 and 6', () => {
    const open = openCameras(['drummer'])
    expect(open).toContain(3)
    expect(open).toContain(6)
  })

  it('finding all 5 enabled cats opens expected set', () => {
    const found: CatId[] = ['drummer', 'longcat', 'keyboard', 'pumpkin', 'choir']
    const open = openCameras(found)
    // drummer: 3,6; longcat: 7,10; keyboard: 4,9; pumpkin: 11,13; choir: 8,12,14
    for (const c of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
      expect(open).toContain(c)
    }
  })
})

describe('unlockedTools', () => {
  it('no tools with empty found', () => {
    expect(unlockedTools([])).toEqual([])
  })

  it('horn unlocked after finding drummer', () => {
    expect(unlockedTools(['drummer'])).toContain('horn')
  })
})

describe('currentCat', () => {
  it('first cat is drummer when nothing found', () => {
    expect(currentCat([])).toBe('drummer')
  })

  it('advances to longcat after drummer found', () => {
    expect(currentCat(['drummer'])).toBe('longcat')
  })

  it('returns null when all enabled cats found', () => {
    const allEnabled: CatId[] = ['drummer', 'longcat', 'keyboard', 'pumpkin', 'choir']
    expect(currentCat(allEnabled)).toBeNull()
  })
})

describe('isStageOpen', () => {
  it('false with 0 found', () => expect(isStageOpen([])).toBe(false))
  it('false with 1 found', () => expect(isStageOpen(['drummer'])).toBe(false))
  it('false with 2 found', () => expect(isStageOpen(['drummer', 'longcat'])).toBe(false))
  it('true with 3 found', () => expect(isStageOpen(['drummer', 'longcat', 'keyboard'])).toBe(true))
  it('true with 5 found', () => {
    expect(isStageOpen(['drummer', 'longcat', 'keyboard', 'pumpkin', 'choir'])).toBe(true)
  })
})

describe('isGameComplete', () => {
  it('false with partial found', () => {
    expect(isGameComplete(['drummer'])).toBe(false)
  })
  it('true when all enabled found', () => {
    expect(isGameComplete(['drummer', 'longcat', 'keyboard', 'pumpkin', 'choir'])).toBe(true)
  })
})

describe('availableTools', () => {
  it('uv granted when pumpkin is current (after keyboard found)', () => {
    const found: CatId[] = ['drummer', 'longcat', 'keyboard']
    const tools = availableTools(found)
    expect(tools).toContain('uv')
  })
})
