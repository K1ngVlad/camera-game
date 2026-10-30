import { describe, it, expect } from 'vitest'
import {
  catFrame,
  catHasArt,
  prop,
  portrait,
  background,
  cameraTrack,
  songStem,
  sfx,
  missingAssets,
} from './registry'

// Sprites added in step 9: drummer, longcat, pumpkin, bongo, assistant portraits.

describe('registry — cats with art', () => {
  it('catFrame returns real URL for drummer body', () => {
    const url = catFrame('drummer', 'body')
    expect(url).not.toContain('placeholder')
    expect(url).toMatch(/\.png$/)
  })

  it('catHasArt returns true for drummer', () => {
    expect(catHasArt('drummer')).toBe(true)
  })

  it('catHasArt returns true for longcat', () => {
    expect(catHasArt('longcat')).toBe(true)
  })

  it('catHasArt returns true for pumpkin', () => {
    expect(catHasArt('pumpkin')).toBe(true)
  })

  it('catHasArt returns true for bongo', () => {
    expect(catHasArt('bongo')).toBe(true)
  })
})

describe('registry — cats without art', () => {
  it('catHasArt returns false for keyboard (no sprite)', () => {
    expect(catHasArt('keyboard')).toBe(false)
  })

  it('catHasArt returns false for choir (no sprite)', () => {
    expect(catHasArt('choir')).toBe(false)
  })

  it('catFrame returns placeholder SVG for keyboard', () => {
    const url = catFrame('keyboard', 'body')
    expect(url).toContain('placeholder')
    expect(url).toMatch(/\.svg$/)
  })
})

describe('registry — portraits', () => {
  it('portrait closed returns real URL', () => {
    const url = portrait('closed')
    expect(url).not.toContain('placeholder')
    expect(url).toMatch(/\.png$/)
  })

  it('portrait open returns real URL', () => {
    const url = portrait('open')
    expect(url).not.toContain('placeholder')
    expect(url).toMatch(/\.png$/)
  })
})

describe('registry — props and backgrounds (still missing)', () => {
  it('prop returns placeholder SVG', () => {
    expect(prop('bin')).toContain('placeholder')
  })

  it('background returns empty string when missing', () => {
    expect(background('stage')).toBe('')
  })
})

describe('registry — audio (still placeholder)', () => {
  it('cameraTrack returns placeholder WAV path', () => {
    const url = cameraTrack('drummer')
    expect(url).toContain('placeholder')
    expect(url).toContain('drummer')
    expect(url).toMatch(/\.wav$/)
  })

  it('songStem returns placeholder WAV path', () => {
    const url = songStem('bongo')
    expect(url).toContain('placeholder')
    expect(url).toContain('bongo')
    expect(url).toMatch(/\.wav$/)
  })

  it('sfx returns placeholder WAV path', () => {
    expect(sfx('horn')).toContain('placeholder')
    expect(sfx('found')).toContain('placeholder')
  })
})

describe('registry — missingAssets', () => {
  it('does not list drummer body as missing (sprite exists)', () => {
    catFrame('drummer', 'body')
    const list = missingAssets()
    expect(list).not.toContain('cats/drummer/body.png')
  })

  it('lists keyboard body as missing (no sprite)', () => {
    catFrame('keyboard', 'body')
    const list = missingAssets()
    expect(list).toContain('cats/keyboard/body.png')
  })

  it('lists audio/camera/drummer as missing (no audio yet)', () => {
    cameraTrack('drummer')
    const list = missingAssets()
    expect(list).toContain('audio/camera/drummer')
  })

  it('list is always sorted', () => {
    const list = missingAssets()
    expect(list).toEqual([...list].sort())
    expect(list.every((s) => typeof s === 'string')).toBe(true)
  })
})
