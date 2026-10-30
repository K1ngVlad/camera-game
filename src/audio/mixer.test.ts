import { describe, it, expect } from 'vitest'
import { computeMix } from './mixer'
import type { CatId } from '../data/cats'

describe('computeMix', () => {
  it('drummer on its camera → gain 1.0, open', () => {
    const mix = computeMix({ screen: 'cameras', camera: 1, found: [] })
    expect(mix['drums'].gain).toBe(1.0)
    expect(mix['drums'].cutoff).toBe(20000)
  })

  it('drummer on neighbor camera → gain 0.3, cutoff 800', () => {
    // cam 1 neighbors are 2 and 5
    const mix = computeMix({ screen: 'cameras', camera: 2, found: [] })
    expect(mix['drums'].gain).toBe(0.3)
    expect(mix['drums'].cutoff).toBe(800)
  })

  it('drummer far away → gain 0', () => {
    const mix = computeMix({ screen: 'cameras', camera: 16, found: [] })
    expect(mix['drums'].gain).toBe(0)
  })

  it('found cat in office → gain 0.25, cutoff 600', () => {
    const mix = computeMix({ screen: 'office', camera: 1, found: ['drummer'] })
    expect(mix['drums'].gain).toBe(0.25)
    expect(mix['drums'].cutoff).toBe(600)
  })

  it('found cat on stage → gain 1.0, open', () => {
    const mix = computeMix({ screen: 'stage', camera: 1, found: ['drummer'] })
    expect(mix['drums'].gain).toBe(1.0)
    expect(mix['drums'].cutoff).toBe(20000)
  })

  it('non-current enabled cat → gain 0 (not in game yet)', () => {
    // longcat is not current when drummer not found either — but drummer is current
    // after drummer found, longcat becomes current
    const mix = computeMix({ screen: 'cameras', camera: 6, found: [] })
    // bass (longcat) should be 0 — it's not current yet
    expect(mix['bass'].gain).toBe(0)
  })

  it('longcat on its camera after drummer found → gain 1.0', () => {
    const found: CatId[] = ['drummer']
    const mix = computeMix({ screen: 'cameras', camera: 6, found })
    expect(mix['bass'].gain).toBe(1.0)
  })

  it('disabled cat always has gain 0', () => {
    const found: CatId[] = ['drummer', 'longcat', 'keyboard', 'pumpkin', 'choir']
    const mix = computeMix({ screen: 'stage', camera: 1, found })
    expect(mix['trumpet'].gain).toBe(0)
    expect(mix['pop'].gain).toBe(0)
    expect(mix['bongo'].gain).toBe(0)
  })

  it('current cat in office → gain 0', () => {
    const mix = computeMix({ screen: 'office', camera: 1, found: [] })
    expect(mix['drums'].gain).toBe(0)
  })
})
