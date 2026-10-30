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

// In the test environment the glob maps are empty (no files in src/assets/),
// so every call should fall back to placeholder URLs and populate missingAssets().

describe('registry — fallbacks when no assets present', () => {
  it('catFrame returns placeholder SVG', () => {
    const url = catFrame('drummer', 'body')
    expect(url).toContain('placeholder')
    expect(url).toMatch(/\.svg$/)
  })

  it('catHasArt returns false when no art files exist', () => {
    expect(catHasArt('drummer')).toBe(false)
    expect(catHasArt('longcat')).toBe(false)
  })

  it('prop returns placeholder SVG', () => {
    expect(prop('bin')).toContain('placeholder')
  })

  it('portrait returns placeholder SVG', () => {
    expect(portrait('closed')).toContain('placeholder')
    expect(portrait('open')).toContain('placeholder')
  })

  it('background returns empty string when missing', () => {
    expect(background('stage')).toBe('')
  })

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

  it('missingAssets lists all accessed missing paths', () => {
    const list = missingAssets()
    expect(list).toContain('cats/drummer/body.png')
    expect(list).toContain('portraits/assistant/closed.png')
    expect(list).toContain('audio/camera/drummer')
    expect(list).toContain('audio/song/bongo')
    expect(list.every((s) => typeof s === 'string')).toBe(true)
    // List must be sorted
    expect(list).toEqual([...list].sort())
  })
})
